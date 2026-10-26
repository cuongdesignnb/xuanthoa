/**
 * Bài tập & đề JLPT — phía học viên.
 *  /api/public/quizzes…  danh sách, bộ lọc, đề xuất, chi tiết (không có đáp án), kiểm tra nhanh MCQ
 *  /api/me/…             bắt đầu/tiếp tục lượt làm, lưu đáp án (phản hồi tức thì), nộp bài, lịch sử, đánh dấu
 */
import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import type { AttemptAnswer } from "../db/schema.js";
import { HttpError, badRequest, notFound, parse, searchWhere } from "../lib/http.js";
import { optionalUser, requireUser } from "../lib/auth.js";
import { gradeAnswers, loadAttemptFull, loadQuestions, mcqFeedback, publicQuestion, summarize, type Question } from "../lib/quiz.js";

const Q = schema.quizzes;
/** Cột id của bảng ngoài, luôn ghi đủ tên bảng trong subquery (drizzle bỏ tên bảng ở select 1 bảng). */
const QID = sql.raw(`"quizzes"."id"`);
const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
type Level = (typeof LEVELS)[number];

export const SKILL_LABELS: Record<string, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  kanji: "Kanji",
  listening: "Luyện nghe",
  reading: "Đọc hiểu",
  communication: "Giao tiếp",
  jlpt: "JLPT",
};
export const DIFFICULTY_LABELS = { easy: "Dễ", medium: "Trung bình", hard: "Khó" } as const;

const csv = (v?: string) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

/** Các cột thống kê + trạng thái cá nhân của học viên (nếu đăng nhập). */
function cardColumns(uid: string | null) {
  return {
    id: Q.id,
    slug: Q.slug,
    kind: Q.kind,
    title: Q.title,
    description: Q.description,
    level: Q.level,
    skill: Q.skill,
    topic: Q.topic,
    difficulty: Q.difficulty,
    durationMin: Q.durationMin,
    icon: Q.icon,
    emoji: Q.emoji,
    tone: Q.tone,
    featured: Q.featured,
    passScore: Q.passScore,
    createdAt: Q.createdAt,
    questionCount: sql<number>`(select count(*)::int from ${schema.questions} q where q.quiz_id = ${QID})`,
    attemptCount: sql<number>`(select count(*)::int from ${schema.attempts} a where a.quiz_id = ${QID})`,
    mine: uid
      ? sql<{ status: string; answered: number; score: number | null; maxScore: number | null; done: boolean } | null>`(
          select json_build_object(
            'status', a.status,
            'answered', (select count(*) from jsonb_array_elements(a.answers) e where coalesce(e->>'answer','') <> ''),
            'score', a.score, 'maxScore', a.max_score,
            'done', exists(select 1 from ${schema.attempts} d where d.quiz_id = ${QID} and d.user_id = ${uid} and d.status <> 'in_progress'))
          from ${schema.attempts} a where a.quiz_id = ${QID} and a.user_id = ${uid}
          order by a.created_at desc limit 1)`
      : sql<null>`null`,
    bookmarked: uid
      ? sql<boolean>`exists(select 1 from ${schema.bookmarks} b where b.user_id = ${uid} and b.target_type = 'quiz' and b.target_id = ${QID})`
      : sql<boolean>`false`,
  };
}

type CardRow = {
  questionCount: number;
  mine: { status: string; answered: number; score: number | null; maxScore: number | null; done: boolean } | null;
  [k: string]: unknown;
};

/** Trạng thái thẻ: done / progress(%) / todo — theo lượt làm gần nhất. */
function withStatus<T extends CardRow>(r: T) {
  const { mine, ...rest } = r;
  let status: { kind: "todo" } | { kind: "done"; score: number | null } | { kind: "progress"; value: number } = { kind: "todo" };
  if (mine) {
    if (mine.status === "in_progress" && mine.answered > 0)
      status = { kind: "progress", value: Math.max(1, Math.min(99, Math.round((mine.answered / Math.max(1, r.questionCount)) * 100))) };
    else if (mine.status !== "in_progress")
      status = { kind: "done", score: mine.maxScore ? Math.round(((mine.score ?? 0) / mine.maxScore) * 100) : null };
    else if (mine.done) status = { kind: "done", score: null };
  }
  return { ...rest, status };
}

const listSchema = z.object({
  kind: z.enum(["exercise", "jlpt"]).default("exercise"),
  level: z.string().optional(),
  skill: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.string().optional(),
  q: z.string().trim().optional(),
  sort: z.enum(["new", "popular", "short", "level"]).default("new"),
  bookmarked: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60),
});

async function userLevel(uid: string | null): Promise<Level | null> {
  if (!uid) return null;
  const [u] = await db.select({ level: schema.users.level }).from(schema.users).where(eq(schema.users.id, uid));
  return (u?.level as Level) ?? null;
}

/** Cập nhật XP + chuỗi ngày học của học viên. */
async function awardXp(uid: string, xp: number) {
  const [u] = await db.select({ streak: schema.users.streak, last: schema.users.lastActiveAt }).from(schema.users).where(eq(schema.users.id, uid));
  if (!u) return { xp: 0, streak: 0 };
  const now = new Date();
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  let streak = u.streak;
  if (!u.last) streak = 1;
  else {
    const diff = Math.round((day(now) - day(u.last)) / 86400000);
    if (diff === 1) streak += 1;
    else if (diff > 1) streak = 1;
    else streak = Math.max(1, streak);
  }
  await db
    .update(schema.users)
    .set({ xp: sql`${schema.users.xp} + ${xp}`, streak, lastActiveAt: now })
    .where(eq(schema.users.id, uid));
  return { xp, streak };
}

export default async function quizRoutes(app: FastifyInstance) {
  /* ---------------------------- PUBLIC ---------------------------- */

  app.get("/api/public/quizzes", async (req) => {
    const q = parse(listSchema, req.query);
    const u = await optionalUser(req);
    const uid = u?.id ?? null;
    const levels = csv(q.level).filter((l): l is Level => (LEVELS as readonly string[]).includes(l));
    const skills = csv(q.skill);
    const diffs = csv(q.difficulty).filter((d): d is "easy" | "medium" | "hard" => d in DIFFICULTY_LABELS);
    const conds: (SQL | undefined)[] = [
      eq(Q.kind, q.kind),
      eq(Q.status, "published"),
      levels.length ? inArray(Q.level, levels) : undefined,
      skills.length ? inArray(Q.skill, skills) : undefined,
      q.topic ? eq(Q.topic, q.topic) : undefined,
      diffs.length ? inArray(Q.difficulty, diffs) : undefined,
      searchWhere(q.q, [Q.title, Q.description]),
      q.bookmarked && uid
        ? sql`exists(select 1 from ${schema.bookmarks} b where b.user_id = ${uid} and b.target_type = 'quiz' and b.target_id = ${QID})`
        : undefined,
    ];
    const cols = cardColumns(uid);
    const order = {
      new: [desc(Q.createdAt)],
      popular: [desc(cols.attemptCount), desc(Q.createdAt)],
      short: [Q.durationMin, desc(Q.createdAt)],
      level: [Q.level, desc(Q.createdAt)],
    }[q.sort];
    const rows = await db
      .select(cols)
      .from(Q)
      .where(and(...conds))
      .orderBy(...order, Q.title)
      .limit(q.limit);
    return { items: rows.map((r) => withStatus(r as CardRow)), total: rows.length };
  });

  /** Bộ lọc kèm số lượng (kỹ năng, chủ đề, độ khó, cấp độ). */
  app.get("/api/public/quizzes/filters", async (req) => {
    const { kind } = parse(z.object({ kind: z.enum(["exercise", "jlpt"]).default("exercise") }), req.query);
    const where = and(eq(Q.kind, kind), eq(Q.status, "published"));
    const [skills, topics, diffs, levels] = await Promise.all([
      db.select({ v: Q.skill, count: sql<number>`count(*)::int` }).from(Q).where(where).groupBy(Q.skill),
      db.select({ v: Q.topic, count: sql<number>`count(*)::int` }).from(Q).where(where).groupBy(Q.topic),
      db.select({ v: Q.difficulty, count: sql<number>`count(*)::int` }).from(Q).where(where).groupBy(Q.difficulty),
      db.select({ v: Q.level, count: sql<number>`count(*)::int` }).from(Q).where(where).groupBy(Q.level),
    ]);
    const skillOrder = Object.keys(SKILL_LABELS);
    return {
      skills: skills
        .map((s) => ({ id: s.v, label: SKILL_LABELS[s.v] ?? s.v, count: s.count }))
        .sort((a, b) => skillOrder.indexOf(a.id) - skillOrder.indexOf(b.id)),
      topics: topics
        .filter((t) => t.v)
        .map((t) => ({ id: t.v!, label: t.v!, count: t.count }))
        .sort((a, b) => b.count - a.count),
      difficulties: (["easy", "medium", "hard"] as const).map((d) => ({ id: d, label: DIFFICULTY_LABELS[d], count: diffs.find((x) => x.v === d)?.count ?? 0 })),
      levels: LEVELS.map((l) => ({ id: l, label: l, count: levels.find((x) => x.v === l)?.count ?? 0 })),
    };
  });

  /** Đề xuất: ưu tiên đúng cấp độ học viên, chưa làm, bài nổi bật; `exclude` để "Đổi đề xuất khác". */
  app.get("/api/public/quizzes/suggested", async (req) => {
    const q = parse(
      z.object({ level: z.string().optional(), skill: z.string().optional(), topic: z.string().optional(), difficulty: z.string().optional(), exclude: z.string().optional(), limit: z.coerce.number().int().min(1).max(12).default(4) }),
      req.query,
    );
    const u = await optionalUser(req);
    const uid = u?.id ?? null;
    const levels = csv(q.level).filter((l): l is Level => (LEVELS as readonly string[]).includes(l));
    const skills = csv(q.skill);
    const diffs = csv(q.difficulty).filter((d): d is "easy" | "medium" | "hard" => d in DIFFICULTY_LABELS);
    const exclude = csv(q.exclude);
    const lv = levels.length === 1 ? levels[0] : await userLevel(uid);
    const base = and(
      eq(Q.kind, "exercise"),
      eq(Q.status, "published"),
      levels.length ? inArray(Q.level, levels) : undefined,
      skills.length ? inArray(Q.skill, skills) : undefined,
      q.topic ? eq(Q.topic, q.topic) : undefined,
      diffs.length ? inArray(Q.difficulty, diffs) : undefined,
      uid ? sql`not exists(select 1 from ${schema.attempts} d where d.quiz_id = ${QID} and d.user_id = ${uid} and d.status <> 'in_progress')` : undefined,
    );
    const rank = lv ? sql`case when ${Q.level} = ${lv} then 0 else 1 end` : sql`0`;
    const pick = (extra?: SQL, n = q.limit) =>
      db
        .select(cardColumns(uid))
        .from(Q)
        .where(and(base, extra))
        .orderBy(rank, desc(Q.featured), sql`random()`)
        .limit(n);
    let rows = await pick(exclude.length ? sql`${Q.id} not in (${sql.join(exclude.map((e) => sql`${e}`), sql`, `)})` : undefined);
    if (rows.length < q.limit && exclude.length) {
      const more = await pick(sql`${Q.id} in (${sql.join(exclude.map((e) => sql`${e}`), sql`, `)})`, q.limit - rows.length);
      rows = [...rows, ...more];
    }
    return { items: rows.map((r) => withStatus(r as CardRow)), level: lv };
  });

  /** Dữ liệu trang chủ: thẻ "Bài tập theo chủ đề" + câu hỏi mẫu trên điện thoại. */
  app.get("/api/public/quizzes/home", async () => {
    const [setting] = await db.select().from(schema.settings).where(eq(schema.settings.key, "quiz_home_topics"));
    const topics = ((setting?.value as { items?: { title: string; desc: string; icon: string; tone: string; skill?: string; topic?: string }[] })?.items ?? []);
    const counts = await db
      .select({ skill: Q.skill, kind: Q.kind, topic: Q.topic, count: sql<number>`count(*)::int` })
      .from(Q)
      .where(eq(Q.status, "published"))
      .groupBy(Q.skill, Q.kind, Q.topic);
    const total = counts.reduce((s, c) => s + c.count, 0);
    const countFor = (t: { skill?: string; topic?: string }) =>
      counts
        .filter((c) => (t.skill === "jlpt" ? c.kind === "jlpt" : (!t.skill || c.skill === t.skill) && (!t.topic || c.topic === t.topic) && c.kind === "exercise"))
        .reduce((s, c) => s + c.count, 0);
    const [sampleQuiz] = await db.select({ id: Q.id, slug: Q.slug }).from(Q).where(eq(Q.slug, "tu-vung-dong-vat"));
    let sample = null;
    if (sampleQuiz) {
      const [first] = await loadQuestions(sampleQuiz.id);
      if (first) sample = { quizSlug: sampleQuiz.slug, prompt: first.prompt, scene: first.scene, options: first.options, answer: first.answer, translation: first.translation, total: (await loadQuestions(sampleQuiz.id)).length };
    }
    return {
      total,
      topics: topics.map((t) => ({
        ...t,
        count: countFor(t),
        href: t.skill === "jlpt" ? "/bai-tap#jlpt" : `/bai-tap?${t.skill ? `skill=${t.skill}` : ""}${t.topic ? `${t.skill ? "&" : ""}topic=${encodeURIComponent(t.topic)}` : ""}#chu-de`,
      })),
      sample,
    };
  });

  /** Chi tiết bài để làm — KHÔNG có đáp án/giải thích. */
  app.get<{ Params: { slug: string } }>("/api/public/quizzes/:slug", async (req) => {
    const u = await optionalUser(req);
    const [quiz] = await db.select().from(Q).where(eq(Q.slug, req.params.slug));
    if (!quiz || (quiz.status !== "published" && (!u || u.role === "student"))) throw notFound("Không tìm thấy bài tập");
    const questions = await loadQuestions(quiz.id);

    // Bài nghe liên quan (cột phải): 1 câu nghe cùng cấp độ, khác bài hiện tại.
    const [lq] = await db
      .select({ quizId: Q.id, quizSlug: Q.slug, quizTitle: Q.title, level: Q.level })
      .from(Q)
      .where(and(eq(Q.skill, "listening"), eq(Q.status, "published"), eq(Q.kind, "exercise"), sql`${Q.id} <> ${quiz.id}`))
      .orderBy(sql`case when ${Q.level} = ${quiz.level} then 0 else 1 end`, desc(Q.featured), Q.createdAt)
      .limit(1);
    let related = null;
    if (lq) {
      const [first] = await db
        .select()
        .from(schema.questions)
        .where(and(eq(schema.questions.quizId, lq.quizId), sql`${schema.questions.audioText} is not null`, eq(schema.questions.type, "mcq")))
        .orderBy(schema.questions.order)
        .limit(1);
      if (first) related = { ...lq, question: publicQuestion(first) };
    }
    const bookmarked = u
      ? (await db.select().from(schema.bookmarks).where(and(eq(schema.bookmarks.userId, u.id), eq(schema.bookmarks.targetType, "quiz"), eq(schema.bookmarks.targetId, quiz.id)))).length > 0
      : false;

    return {
      quiz: {
        id: quiz.id,
        slug: quiz.slug,
        kind: quiz.kind,
        title: quiz.title,
        description: quiz.description,
        level: quiz.level,
        skill: quiz.skill,
        skillLabel: SKILL_LABELS[quiz.skill] ?? quiz.skill,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        durationMin: quiz.durationMin,
        passScore: quiz.passScore,
        icon: quiz.icon,
        emoji: quiz.emoji,
        tone: quiz.tone,
        status: quiz.status,
        bookmarked,
      },
      questions: questions.map(publicQuestion),
      related,
    };
  });

  /** Kiểm tra nhanh 1 câu trắc nghiệm (luyện tập khi chưa đăng nhập). */
  app.post<{ Params: { id: string } }>(
    "/api/public/quizzes/:id/check",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req) => {
      const b = parse(z.object({ questionId: z.string(), answer: z.string().max(10) }), req.body);
      const [q] = await db
        .select()
        .from(schema.questions)
        .where(and(eq(schema.questions.id, b.questionId), eq(schema.questions.quizId, req.params.id)));
      if (!q) throw notFound("Không tìm thấy câu hỏi");
      if (q.type !== "mcq") throw badRequest("Chỉ kiểm tra nhanh được câu trắc nghiệm. Đăng nhập để được chấm câu tự luận.");
      return mcqFeedback(q, b.answer);
    },
  );

  /* ------------------------------ ME ------------------------------ */

  /** Bắt đầu hoặc tiếp tục lượt làm đang dở (`fresh: true` để làm lại từ đầu). */
  app.post<{ Params: { id: string } }>("/api/me/quizzes/:id/attempts", async (req) => {
    const u = await requireUser(req);
    const { fresh } = parse(z.object({ fresh: z.boolean().optional() }).default({}), req.body ?? {});
    const [quiz] = await db.select().from(Q).where(eq(Q.id, req.params.id));
    if (!quiz) throw notFound("Không tìm thấy bài tập");
    const open = await db
      .select()
      .from(schema.attempts)
      .where(and(eq(schema.attempts.userId, u.id), eq(schema.attempts.quizId, quiz.id), eq(schema.attempts.status, "in_progress")))
      .orderBy(desc(schema.attempts.startedAt));
    let attempt = open[0];
    if (fresh && open.length) {
      await db.delete(schema.attempts).where(inArray(schema.attempts.id, open.map((a) => a.id)));
      attempt = undefined as never;
    }
    if (!attempt) [attempt] = await db.insert(schema.attempts).values({ userId: u.id, quizId: quiz.id }).returning();
    const questions = await loadQuestions(quiz.id);
    const byId = new Map(questions.map((q) => [q.id, q]));
    return {
      id: attempt.id,
      startedAt: attempt.startedAt,
      durationSec: attempt.durationSec ?? 0,
      resumed: !fresh && open.length > 0,
      answers: attempt.answers.map((a) => {
        const q = byId.get(a.questionId);
        return q?.type === "mcq" ? { ...mcqFeedback(q, a.answer), answer: a.answer } : { questionId: a.questionId, answer: a.answer };
      }),
    };
  });

  async function ownAttempt(uid: string, id: string) {
    const [a] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, id));
    if (!a || a.userId !== uid) throw notFound("Không tìm thấy lượt làm bài");
    return a;
  }

  /** Lưu đáp án 1 câu; trắc nghiệm trả kết quả + giải thích ngay. */
  app.patch<{ Params: { id: string } }>("/api/me/attempts/:id", async (req) => {
    const u = await requireUser(req);
    const b = parse(
      z.object({ questionId: z.string(), answer: z.string().max(5000), durationSec: z.number().int().min(0).max(86400).optional() }),
      req.body,
    );
    const a = await ownAttempt(u.id, req.params.id);
    if (a.status !== "in_progress") throw new HttpError(409, "Bài đã nộp, không thể sửa đáp án");
    const [q] = await db.select().from(schema.questions).where(and(eq(schema.questions.id, b.questionId), eq(schema.questions.quizId, a.quizId)));
    if (!q) throw notFound("Không tìm thấy câu hỏi");
    const entry: AttemptAnswer = { questionId: q.id, answer: b.answer };
    if (q.type === "mcq") {
      entry.correct = q.answer.trim().toUpperCase() === b.answer.trim().toUpperCase();
      entry.score = entry.correct ? q.points : 0;
      entry.gradedBy = "auto";
    }
    const answers = [...a.answers.filter((x) => x.questionId !== q.id), entry];
    await db
      .update(schema.attempts)
      .set({ answers, ...(b.durationSec !== undefined ? { durationSec: b.durationSec } : {}) })
      .where(eq(schema.attempts.id, a.id));
    if (q.type === "mcq") return { ...mcqFeedback(q, b.answer), answer: b.answer, saved: true };
    return { questionId: q.id, answer: b.answer, saved: true };
  });

  /** Nộp bài: chấm (AI cho câu tự luận), cộng XP, cập nhật chuỗi ngày học. */
  app.post<{ Params: { id: string } }>(
    "/api/me/attempts/:id/submit",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req) => {
      const u = await requireUser(req);
      const b = parse(z.object({ durationSec: z.number().int().min(0).max(86400).optional() }).default({}), req.body ?? {});
      const own = await ownAttempt(u.id, req.params.id);
      const { quiz, questions } = await loadAttemptFull(own.id);
      if (own.status !== "in_progress") return summarize(own, quiz, questions as Question[]);
      const g = await gradeAnswers(quiz, questions, own.answers);
      const durationSec = b.durationSec ?? own.durationSec ?? Math.round((Date.now() - new Date(own.startedAt).getTime()) / 1000);
      const [saved] = await db
        .update(schema.attempts)
        .set({ answers: g.answers, score: g.score, maxScore: g.maxScore, feedback: g.feedback, status: "graded", durationSec, submittedAt: new Date() })
        .where(eq(schema.attempts.id, own.id))
        .returning();
      const result = summarize(saved, quiz, questions);
      const award = await awardXp(u.id, result.xp);
      return { ...result, streak: award.streak };
    },
  );

  app.get<{ Params: { id: string } }>("/api/me/attempts/:id", async (req) => {
    const u = await requireUser(req);
    await ownAttempt(u.id, req.params.id);
    const { attempt, quiz, questions } = await loadAttemptFull(req.params.id);
    return summarize(attempt, quiz, questions);
  });

  app.get("/api/me/attempts", async (req) => {
    const u = await requireUser(req);
    const q = parse(z.object({ quizId: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }), req.query);
    const rows = await db
      .select({
        id: schema.attempts.id,
        quizId: Q.id,
        quizSlug: Q.slug,
        quizTitle: Q.title,
        kind: Q.kind,
        level: Q.level,
        status: schema.attempts.status,
        score: schema.attempts.score,
        maxScore: schema.attempts.maxScore,
        durationSec: schema.attempts.durationSec,
        startedAt: schema.attempts.startedAt,
        submittedAt: schema.attempts.submittedAt,
      })
      .from(schema.attempts)
      .innerJoin(Q, eq(Q.id, schema.attempts.quizId))
      .where(and(eq(schema.attempts.userId, u.id), q.quizId ? eq(schema.attempts.quizId, q.quizId) : undefined))
      .orderBy(desc(schema.attempts.startedAt))
      .limit(q.limit);
    return {
      items: rows.map((r) => ({ ...r, percent: r.maxScore ? Math.round(((r.score ?? 0) / r.maxScore) * 100) : null })),
    };
  });

  /** Lưu / bỏ lưu bài tập. */
  app.post<{ Params: { id: string } }>("/api/me/quizzes/:id/bookmark", async (req) => {
    const u = await requireUser(req);
    const [quiz] = await db.select({ id: Q.id }).from(Q).where(eq(Q.id, req.params.id));
    if (!quiz) throw notFound("Không tìm thấy bài tập");
    const where = and(eq(schema.bookmarks.userId, u.id), eq(schema.bookmarks.targetType, "quiz"), eq(schema.bookmarks.targetId, quiz.id));
    const existing = await db.select().from(schema.bookmarks).where(where);
    if (existing.length) {
      await db.delete(schema.bookmarks).where(where);
      return { bookmarked: false };
    }
    await db.insert(schema.bookmarks).values({ userId: u.id, targetType: "quiz", targetId: quiz.id });
    return { bookmarked: true };
  });
}
