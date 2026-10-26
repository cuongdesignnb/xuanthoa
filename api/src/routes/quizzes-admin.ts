/**
 * Quản trị bài tập & đề JLPT (quyền "quizzes"): CRUD bài, câu hỏi (sắp xếp, nhập hàng loạt),
 * thống kê lượt làm, danh sách lượt làm toàn hệ thống, chấm lại / sửa điểm.
 */
import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, inArray, sql, type SQL, type AnyColumn } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import type { AttemptAnswer } from "../db/schema.js";
import { badRequest, listQuery, notFound, pageOf, parse, searchWhere, slugify } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";
import { zLevel, zStatus } from "../lib/crud.js";
import { plainText } from "../lib/ai.js";
import { loadAttemptFull, loadQuestions, regradeAttempt, summarize } from "../lib/quiz.js";

const Q = schema.quizzes;
/** Cột id của bảng ngoài, luôn ghi đủ tên bảng trong subquery (drizzle bỏ tên bảng ở select 1 bảng). */
const QID = sql.raw(`"quizzes"."id"`);
const QS = schema.questions;
const A = schema.attempts;
const read = requirePerm("quizzes.read");
const write = requirePerm("quizzes.write");

const optStr = z.string().trim().optional().nullable();

const quizBody = z.object({
  kind: z.enum(["exercise", "jlpt"]),
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(200),
  slug: z.string().trim().max(80).optional().nullable(),
  description: optStr,
  level: zLevel,
  skill: z.string().trim().min(1).default("grammar"),
  topic: optStr,
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  durationMin: z.coerce.number().int().min(1, "Tối thiểu 1 phút").max(600).default(15),
  icon: optStr,
  emoji: optStr,
  tone: optStr,
  source: z.enum(["manual", "ai"]).default("manual"),
  passScore: z.coerce.number().int().min(0).max(100).default(60),
  featured: z.boolean().default(false),
  status: zStatus.default("draft"),
});

const hintSchema = z
  .object({ title: optStr, body: optStr, exampleJa: optStr, exampleVi: optStr })
  .partial()
  .optional()
  .nullable();

export const questionBody = z
  .object({
    type: z.enum(["mcq", "short", "essay"]).default("mcq"),
    prompt: z.string().trim().min(1, "Nhập nội dung câu hỏi"),
    translation: optStr,
    options: z.array(z.object({ key: z.string().trim().min(1), text: z.string().trim().min(1, "Nhập nội dung lựa chọn") })).default([]),
    answer: z.string().trim().min(1, "Chọn / nhập đáp án đúng"),
    explanation: optStr,
    explanationLong: optStr,
    hint: hintSchema,
    audioText: optStr,
    scene: optStr,
    points: z.coerce.number().int().min(1).max(100).default(1),
  })
  .superRefine((q, ctx) => {
    if (q.type === "mcq") {
      if (q.options.length < 2) ctx.addIssue({ code: "custom", path: ["options"], message: "Câu trắc nghiệm cần ít nhất 2 lựa chọn" });
      if (!q.options.some((o) => o.key === q.answer)) ctx.addIssue({ code: "custom", path: ["answer"], message: "Đáp án đúng phải là một trong các lựa chọn" });
    }
  });
type QuestionInput = z.infer<typeof questionBody>;

const cleanHint = (h: QuestionInput["hint"]) => {
  if (!h) return null;
  const out = Object.fromEntries(Object.entries(h).filter(([, v]) => v)) as Record<string, string>;
  return Object.keys(out).length ? out : null;
};
/** Bỏ thẻ <p> bao ngoài khi chỉ có một đoạn (trình soạn thảo luôn bọc <p>), để câu hỏi hiển thị inline. */
const unwrapP = (html: string) => {
  const m = html.trim().match(/^<p>([\s\S]*)<\/p>$/);
  return m && !m[1].includes("<p") ? m[1] : html.trim();
};
const questionValues = (quizId: string, q: QuestionInput, order: number) => ({
  quizId,
  order,
  type: q.type,
  prompt: unwrapP(q.prompt),
  translation: q.translation || null,
  options: q.type === "mcq" ? q.options : [],
  answer: q.answer,
  explanation: q.explanation || null,
  explanationLong: q.explanationLong || null,
  hint: cleanHint(q.hint),
  audioText: q.audioText || null,
  scene: q.scene || null,
  points: q.points,
});

async function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base) || "bai-tap";
  let slug = root;
  for (let i = 2; ; i++) {
    const [hit] = await db.select({ id: Q.id }).from(Q).where(eq(Q.slug, slug));
    if (!hit || hit.id === exceptId) return slug;
    slug = `${root}-${i}`;
  }
}

/** Thêm câu hỏi vào cuối bài. */
export async function insertQuestions(quizId: string, items: QuestionInput[]) {
  if (!items.length) return [];
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${QS.order}), -1)::int` }).from(QS).where(eq(QS.quizId, quizId));
  return db
    .insert(QS)
    .values(items.map((q, i) => questionValues(quizId, q, max + 1 + i)))
    .returning();
}

/** Tạo bài kèm câu hỏi (dùng cho tạo tay và lưu đề AI). */
export async function createQuiz(data: z.infer<typeof quizBody>, questions: QuestionInput[], userId?: string) {
  const slug = await uniqueSlug(data.slug || data.title);
  const [quiz] = await db
    .insert(Q)
    .values({ ...data, slug, topic: data.topic || null, createdById: userId ?? null })
    .returning();
  await insertQuestions(quiz.id, questions);
  return quiz;
}

const pct = (score: SQL, max: SQL) => sql<number>`round(avg(case when ${max} > 0 then ${score} / ${max} * 100 end))::int`;

/* ---------------------- CSV / JSON import ---------------------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === "\t") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

/**
 * CSV header (không phân biệt hoa thường): type,prompt,translation,a,b,c,d,answer,explanation,explanation_long,hint_title,hint_body,example_ja,example_vi,audio_text,points
 * `answer`: A/B/C/D (mcq) hoặc đáp án mẫu (short/essay).
 */
function importRows(format: "json" | "csv", data: string): unknown[] {
  if (format === "json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw badRequest("JSON không hợp lệ");
    }
    const arr = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown[] })?.questions;
    if (!Array.isArray(arr)) throw badRequest("JSON phải là mảng câu hỏi hoặc { questions: [...] }");
    return arr.map((q) => {
      const o = q as Record<string, unknown>;
      // chấp nhận options dạng ["..", ".."] và answer dạng số
      if (Array.isArray(o.options) && o.options.every((x) => typeof x === "string"))
        o.options = (o.options as string[]).map((text, i) => ({ key: "ABCDEFGH"[i], text }));
      if (typeof o.answer === "number") o.answer = "ABCDEFGH"[o.answer];
      if (!o.type) o.type = Array.isArray(o.options) && o.options.length ? "mcq" : "short";
      return o;
    });
  }
  const rows = parseCsv(data);
  if (rows.length < 2) throw badRequest("CSV cần dòng tiêu đề và ít nhất 1 dòng dữ liệu");
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (r: string[], k: string) => (head.indexOf(k) >= 0 ? (r[head.indexOf(k)] ?? "").trim() : "");
  return rows.slice(1).map((r) => {
    const options = ["a", "b", "c", "d"].map((k, i) => ({ key: "ABCD"[i], text: col(r, k) })).filter((o) => o.text);
    const type = (col(r, "type") || (options.length ? "mcq" : "short")).toLowerCase();
    return {
      type,
      prompt: col(r, "prompt"),
      translation: col(r, "translation"),
      options,
      answer: type === "mcq" ? col(r, "answer").toUpperCase() : col(r, "answer"),
      explanation: col(r, "explanation"),
      explanationLong: col(r, "explanation_long"),
      hint: { title: col(r, "hint_title"), body: col(r, "hint_body"), exampleJa: col(r, "example_ja"), exampleVi: col(r, "example_vi") },
      audioText: col(r, "audio_text"),
      points: Number(col(r, "points")) || 1,
    };
  });
}

/* ------------------------------------------------------------------ */

const attemptCols = {
  id: A.id,
  status: A.status,
  score: A.score,
  maxScore: A.maxScore,
  durationSec: A.durationSec,
  startedAt: A.startedAt,
  submittedAt: A.submittedAt,
  feedback: A.feedback,
  aiGraded: sql<boolean>`${A.answers} @> '[{"gradedBy":"ai"}]'::jsonb`,
  manual: sql<boolean>`${A.answers} @> '[{"gradedBy":"manual"}]'::jsonb`,
  answered: sql<number>`jsonb_array_length(${A.answers})`,
  userId: schema.users.id,
  userName: schema.users.name,
  userEmail: schema.users.email,
  userAvatar: schema.users.avatarUrl,
  userLevel: schema.users.level,
  quizId: Q.id,
  quizTitle: Q.title,
  quizSlug: Q.slug,
  quizKind: Q.kind,
  quizLevel: Q.level,
  passScore: Q.passScore,
};
const withPercent = <T extends { score: number | null; maxScore: number | null }>(r: T) => ({
  ...r,
  percent: r.maxScore ? Math.round(((r.score ?? 0) / r.maxScore) * 100) : null,
});

const attemptsQuery = listQuery.extend({
  quizId: z.string().optional(),
  kind: z.enum(["exercise", "jlpt"]).optional(),
  status: z.enum(["in_progress", "submitted", "graded"]).optional(),
  level: zLevel.optional(),
  ai: z.enum(["1", "0"]).optional(),
  result: z.enum(["pass", "fail"]).optional(),
  userId: z.string().optional(),
});

function attemptWhere(q: z.infer<typeof attemptsQuery>) {
  return and(
    q.quizId ? eq(A.quizId, q.quizId) : undefined,
    q.userId ? eq(A.userId, q.userId) : undefined,
    q.kind ? eq(Q.kind, q.kind) : undefined,
    q.status ? eq(A.status, q.status) : undefined,
    q.level ? eq(Q.level, q.level) : undefined,
    q.ai === "1" ? sql`${A.answers} @> '[{"gradedBy":"ai"}]'::jsonb` : q.ai === "0" ? sql`not (${A.answers} @> '[{"gradedBy":"ai"}]'::jsonb)` : undefined,
    q.result === "pass" ? sql`${A.maxScore} > 0 and ${A.score} / ${A.maxScore} * 100 >= ${Q.passScore}` : undefined,
    q.result === "fail" ? sql`${A.maxScore} > 0 and ${A.score} / ${A.maxScore} * 100 < ${Q.passScore}` : undefined,
    searchWhere(q.q, [schema.users.name, schema.users.email, Q.title]),
  );
}

async function listAttempts(q: z.infer<typeof attemptsQuery>) {
  const where = attemptWhere(q);
  const { limit, offset } = pageOf(q);
  const sortCols: Record<string, SQL | AnyColumn> = {
    startedAt: A.startedAt,
    submittedAt: A.submittedAt,
    score: sql`case when ${A.maxScore} > 0 then ${A.score} / ${A.maxScore} end`,
    durationSec: A.durationSec,
    userName: schema.users.name,
  };
  const col = sortCols[q.sort ?? "startedAt"] ?? A.startedAt;
  const [items, [{ total }]] = await Promise.all([
    db
      .select(attemptCols)
      .from(A)
      .innerJoin(Q, eq(Q.id, A.quizId))
      .innerJoin(schema.users, eq(schema.users.id, A.userId))
      .where(where)
      .orderBy(q.order === "asc" ? sql`${col} asc nulls last` : sql`${col} desc nulls last`)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(A)
      .innerJoin(Q, eq(Q.id, A.quizId))
      .innerJoin(schema.users, eq(schema.users.id, A.userId))
      .where(where),
  ]);
  return { items: items.map(withPercent), total, page: q.page, pageSize: q.pageSize };
}

export default async function quizAdminRoutes(app: FastifyInstance) {
  /* ---------------------------- Quizzes ---------------------------- */

  const listSchema = listQuery.extend({
    kind: z.enum(["exercise", "jlpt"]).optional(),
    level: zLevel.optional(),
    skill: z.string().optional(),
    status: zStatus.optional(),
    source: z.enum(["manual", "ai"]).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  });

  app.get("/api/admin/quizzes", { preHandler: read }, async (req) => {
    const q = parse(listSchema, req.query);
    const where = and(
      q.kind ? eq(Q.kind, q.kind) : undefined,
      q.level ? eq(Q.level, q.level) : undefined,
      q.skill ? eq(Q.skill, q.skill) : undefined,
      q.status ? eq(Q.status, q.status) : undefined,
      q.source ? eq(Q.source, q.source) : undefined,
      q.difficulty ? eq(Q.difficulty, q.difficulty) : undefined,
      searchWhere(q.q, [Q.title, Q.slug, Q.topic]),
    );
    const questionCount = sql<number>`(select count(*)::int from ${QS} where ${QS.quizId} = ${QID})`;
    const attemptCount = sql<number>`(select count(*)::int from ${A} where ${A.quizId} = ${QID})`;
    const avgScore = sql<number | null>`(select round(avg(${A.score} / nullif(${A.maxScore}, 0) * 100))::int from ${A} where ${A.quizId} = ${QID} and ${A.status} <> 'in_progress')`;
    const sorts: Record<string, unknown> = {
      title: Q.title,
      level: Q.level,
      createdAt: Q.createdAt,
      updatedAt: Q.updatedAt,
      questionCount,
      attemptCount,
      avgScore,
      status: Q.status,
    };
    const col = (sorts[q.sort ?? "createdAt"] ?? Q.createdAt) as SQL;
    const { limit, offset } = pageOf(q);
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: Q.id,
          slug: Q.slug,
          kind: Q.kind,
          title: Q.title,
          level: Q.level,
          skill: Q.skill,
          topic: Q.topic,
          difficulty: Q.difficulty,
          durationMin: Q.durationMin,
          emoji: Q.emoji,
          icon: Q.icon,
          tone: Q.tone,
          source: Q.source,
          featured: Q.featured,
          status: Q.status,
          passScore: Q.passScore,
          createdAt: Q.createdAt,
          updatedAt: Q.updatedAt,
          questionCount,
          attemptCount,
          avgScore,
        })
        .from(Q)
        .where(where)
        .orderBy(q.order === "asc" ? sql`${col} asc nulls last` : sql`${col} desc nulls last`, Q.title)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(Q).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  /** Số liệu đầu trang danh sách. */
  app.get("/api/admin/quizzes/stats", { preHandler: read }, async (req) => {
    const { kind } = parse(z.object({ kind: z.enum(["exercise", "jlpt"]).optional() }), req.query);
    const kw = kind ? eq(Q.kind, kind) : undefined;
    const [[quizzes], [att], byLevel, trend] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          published: sql<number>`count(*) filter (where ${Q.status} = 'published')::int`,
          draft: sql<number>`count(*) filter (where ${Q.status} in ('draft','review'))::int`,
          ai: sql<number>`count(*) filter (where ${Q.source} = 'ai')::int`,
          questions: sql<number>`coalesce(sum((select count(*) from ${QS} where ${QS.quizId} = ${QID})), 0)::int`,
        })
        .from(Q)
        .where(kw),
      db
        .select({
          total: sql<number>`count(*)::int`,
          last30: sql<number>`count(*) filter (where ${A.startedAt} > now() - interval '30 days')::int`,
          avgScore: sql<number | null>`round(avg(${A.score} / nullif(${A.maxScore}, 0) * 100) filter (where ${A.status} <> 'in_progress'))::int`,
          completion: sql<number | null>`round(100.0 * count(*) filter (where ${A.status} <> 'in_progress') / nullif(count(*), 0))::int`,
        })
        .from(A)
        .innerJoin(Q, eq(Q.id, A.quizId))
        .where(kw),
      db.select({ level: Q.level, count: sql<number>`count(*)::int` }).from(Q).where(kw).groupBy(Q.level).orderBy(Q.level),
      db
        .select({ week: sql<string>`to_char(date_trunc('week', ${A.startedAt}), 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
        .from(A)
        .innerJoin(Q, eq(Q.id, A.quizId))
        .where(and(kw, sql`${A.startedAt} > now() - interval '12 weeks'`))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
    ]);
    return { quizzes, attempts: att, byLevel, trend: trend.map((t) => t.count) };
  });

  app.get<{ Params: { id: string } }>("/api/admin/quizzes/:id", { preHandler: read }, async (req) => {
    const [quiz] = await db.select().from(Q).where(eq(Q.id, req.params.id));
    if (!quiz) throw notFound("Không tìm thấy bài tập");
    const questions = await loadQuestions(quiz.id);
    return { ...quiz, questions };
  });

  app.post("/api/admin/quizzes", { preHandler: write }, async (req, reply) => {
    const body = parse(quizBody.extend({ questions: z.array(questionBody).default([]) }), req.body);
    const { questions, ...data } = body;
    const quiz = await createQuiz(data, questions, req.authUser?.id);
    await logActivity(req, "create", "quiz", quiz.id, `Tạo ${quiz.kind === "jlpt" ? "đề thi" : "bài tập"} "${quiz.title}"`);
    return reply.code(201).send(quiz);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/quizzes/:id", { preHandler: write }, async (req) => {
    const data = parse(quizBody.partial(), req.body);
    if (data.slug !== undefined) data.slug = await uniqueSlug(data.slug || data.title || "bai-tap", req.params.id);
    const patch = { ...data, slug: data.slug ?? undefined };
    const [row] = await db.update(Q).set(patch).where(eq(Q.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bài tập");
    await logActivity(req, "update", "quiz", row.id, `Cập nhật "${row.title}"`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/quizzes/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(Q).where(eq(Q.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bài tập");
    await logActivity(req, "delete", "quiz", row.id, `Xoá "${row.title}"`);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/admin/quizzes/:id/duplicate", { preHandler: write }, async (req, reply) => {
    const [src] = await db.select().from(Q).where(eq(Q.id, req.params.id));
    if (!src) throw notFound("Không tìm thấy bài tập");
    const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, ...rest } = src;
    void _id, _slug, _c, _u;
    const [copy] = await db
      .insert(Q)
      .values({ ...rest, title: `${src.title} (bản sao)`, slug: await uniqueSlug(`${src.slug}-ban-sao`), status: "draft", featured: false, createdById: req.authUser?.id })
      .returning();
    const qs = await loadQuestions(src.id);
    if (qs.length) await db.insert(QS).values(qs.map(({ id: _qid, ...q }) => (void _qid, { ...q, quizId: copy.id })));
    await logActivity(req, "create", "quiz", copy.id, `Nhân bản "${src.title}"`);
    return reply.code(201).send(copy);
  });

  app.post<{ Params: { id: string } }>("/api/admin/quizzes/:id/publish", { preHandler: write }, async (req) => {
    const { status } = parse(z.object({ status: zStatus.default("published") }).default({ status: "published" }), req.body ?? {});
    if (status === "published") {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(QS).where(eq(QS.quizId, req.params.id));
      if (!n) throw badRequest("Bài chưa có câu hỏi nào, không thể xuất bản");
    }
    const [row] = await db.update(Q).set({ status }).where(eq(Q.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bài tập");
    await logActivity(req, status === "published" ? "publish" : "update", "quiz", row.id, `${status === "published" ? "Xuất bản" : "Đổi trạng thái"} "${row.title}"`);
    return row;
  });

  app.post("/api/admin/quizzes/bulk", { preHandler: write }, async (req) => {
    const b = parse(z.object({ ids: z.array(z.string()).min(1), action: z.enum(["publish", "draft", "archive", "delete"]) }), req.body);
    if (b.action === "delete") await db.delete(Q).where(inArray(Q.id, b.ids));
    else await db.update(Q).set({ status: b.action === "publish" ? "published" : b.action === "draft" ? "draft" : "archived" }).where(inArray(Q.id, b.ids));
    await logActivity(req, b.action, "quiz", null, `Thao tác hàng loạt (${b.action}) ${b.ids.length} bài`);
    return { ok: true, count: b.ids.length };
  });

  /* ---------------------------- Questions ---------------------------- */

  app.post<{ Params: { id: string } }>("/api/admin/quizzes/:id/questions", { preHandler: write }, async (req, reply) => {
    const q = parse(questionBody, req.body);
    const [quiz] = await db.select({ id: Q.id, title: Q.title }).from(Q).where(eq(Q.id, req.params.id));
    if (!quiz) throw notFound("Không tìm thấy bài tập");
    const [row] = await insertQuestions(quiz.id, [q]);
    await db.update(Q).set({ updatedAt: new Date() }).where(eq(Q.id, quiz.id));
    await logActivity(req, "create", "question", row.id, `Thêm câu hỏi vào "${quiz.title}"`);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { qid: string } }>("/api/admin/questions/:qid", { preHandler: write }, async (req) => {
    const q = parse(questionBody, req.body);
    const [cur] = await db.select().from(QS).where(eq(QS.id, req.params.qid));
    if (!cur) throw notFound("Không tìm thấy câu hỏi");
    const { quizId: _q, order: _o, ...vals } = questionValues(cur.quizId, q, cur.order);
    void _q, _o;
    const [row] = await db.update(QS).set(vals).where(eq(QS.id, cur.id)).returning();
    await logActivity(req, "update", "question", row.id, `Sửa câu hỏi #${cur.order + 1}`);
    return row;
  });

  app.delete<{ Params: { qid: string } }>("/api/admin/questions/:qid", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(QS).where(eq(QS.id, req.params.qid)).returning();
    if (!row) throw notFound("Không tìm thấy câu hỏi");
    await logActivity(req, "delete", "question", row.id, `Xoá câu hỏi #${row.order + 1}`);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/admin/quizzes/:id/questions/reorder", { preHandler: write }, async (req) => {
    const { ids } = parse(z.object({ ids: z.array(z.string()).min(1) }), req.body);
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) await tx.update(QS).set({ order: i }).where(and(eq(QS.id, ids[i]), eq(QS.quizId, req.params.id)));
    });
    await logActivity(req, "update", "quiz", req.params.id, `Sắp xếp lại ${ids.length} câu hỏi`);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/api/admin/quizzes/:id/questions/import", { preHandler: write }, async (req) => {
    const b = parse(z.object({ format: z.enum(["json", "csv"]), data: z.string().min(2).max(2_000_000), replace: z.boolean().default(false) }), req.body);
    const [quiz] = await db.select({ id: Q.id, title: Q.title }).from(Q).where(eq(Q.id, req.params.id));
    if (!quiz) throw notFound("Không tìm thấy bài tập");
    const rows = importRows(b.format, b.data);
    const errors: { row: number; message: string }[] = [];
    const valid: QuestionInput[] = [];
    rows.forEach((r, i) => {
      const res = questionBody.safeParse(r);
      if (res.success) valid.push(res.data);
      else errors.push({ row: i + 1, message: res.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
    });
    if (!valid.length) throw badRequest("Không có câu hỏi hợp lệ để nhập", errors.map((e) => ({ path: `row${e.row}`, message: e.message })));
    if (b.replace) await db.delete(QS).where(eq(QS.quizId, quiz.id));
    await insertQuestions(quiz.id, valid);
    await logActivity(req, "import", "quiz", quiz.id, `Nhập ${valid.length} câu hỏi (${b.format.toUpperCase()}) vào "${quiz.title}"`);
    return { imported: valid.length, errors };
  });

  /* ---------------------------- Stats ---------------------------- */

  app.get<{ Params: { id: string } }>("/api/admin/quizzes/:id/stats", { preHandler: read }, async (req) => {
    const [quiz] = await db.select().from(Q).where(eq(Q.id, req.params.id));
    if (!quiz) throw notFound("Không tìm thấy bài tập");
    const questions = await loadQuestions(quiz.id);
    const done = and(eq(A.quizId, quiz.id), sql`${A.status} <> 'in_progress'`);
    const [[summary], perQ, byDay, dist] = await Promise.all([
      db
        .select({
          attempts: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${A.status} <> 'in_progress')::int`,
          inProgress: sql<number>`count(*) filter (where ${A.status} = 'in_progress')::int`,
          students: sql<number>`count(distinct ${A.userId})::int`,
          avgScore: pct(sql`${A.score}`, sql`${A.maxScore}`),
          passRate: sql<number | null>`round(100.0 * count(*) filter (where ${A.status} <> 'in_progress' and ${A.score} / nullif(${A.maxScore},0) * 100 >= ${quiz.passScore}) / nullif(count(*) filter (where ${A.status} <> 'in_progress'), 0))::int`,
          avgDuration: sql<number | null>`round(avg(${A.durationSec}) filter (where ${A.status} <> 'in_progress'))::int`,
          aiGraded: sql<number>`count(*) filter (where ${A.answers} @> '[{"gradedBy":"ai"}]'::jsonb)::int`,
        })
        .from(A)
        .where(eq(A.quizId, quiz.id)),
      db.execute<{ question_id: string; answered: number; correct: number; avg_score: number | null }>(sql`
        select e->>'questionId' as question_id, count(*)::int as answered,
               count(*) filter (where (e->>'correct')::boolean)::int as correct,
               avg((e->>'score')::float) as avg_score
        from ${A} a, jsonb_array_elements(a.answers) e
        where a.quiz_id = ${quiz.id} and a.status <> 'in_progress'
        group by 1`),
      db
        .select({ day: sql<string>`to_char(date_trunc('day', ${A.startedAt}), 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
        .from(A)
        .where(and(eq(A.quizId, quiz.id), sql`${A.startedAt} > now() - interval '30 days'`))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({ bucket: sql<number>`least(9, floor(${A.score} / nullif(${A.maxScore},0) * 10))::int`, count: sql<number>`count(*)::int` })
        .from(A)
        .where(done)
        .groupBy(sql`1`),
    ]);
    const map = new Map(perQ.map((r) => [r.question_id, r]));
    const per = questions.map((q) => {
      const r = map.get(q.id);
      const answered = r?.answered ?? 0;
      return {
        questionId: q.id,
        order: q.order,
        type: q.type,
        promptText: plainText(q.prompt).slice(0, 120),
        answered,
        accuracy: answered ? Math.round(((r?.correct ?? 0) / answered) * 100) : null,
        skipped: Math.max(0, summary.completed - answered),
      };
    });
    const days: { label: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: byDay.find((x) => x.day === key)?.count ?? 0 });
    }
    return {
      summary: { ...summary, completionRate: summary.attempts ? Math.round((summary.completed / summary.attempts) * 100) : 0, passScore: quiz.passScore },
      perQuestion: per,
      hardest: [...per].filter((p) => p.accuracy !== null).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 5),
      byDay: days,
      distribution: Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10}–${i === 9 ? 100 : i * 10 + 9}`, value: dist.find((d) => d.bucket === i)?.count ?? 0 })),
    };
  });

  /* ---------------------------- Attempts ---------------------------- */

  app.get<{ Params: { id: string } }>("/api/admin/quizzes/:id/attempts", { preHandler: read }, async (req) => {
    const q = parse(attemptsQuery, req.query);
    return listAttempts({ ...q, quizId: req.params.id });
  });

  app.get("/api/admin/attempts", { preHandler: read }, async (req) => listAttempts(parse(attemptsQuery, req.query)));

  app.get("/api/admin/attempts/stats", { preHandler: read }, async () => {
    const [[s], trend] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          today: sql<number>`count(*) filter (where ${A.startedAt} >= date_trunc('day', now()))::int`,
          last7: sql<number>`count(*) filter (where ${A.startedAt} > now() - interval '7 days')::int`,
          inProgress: sql<number>`count(*) filter (where ${A.status} = 'in_progress')::int`,
          avgScore: pct(sql`${A.score}`, sql`${A.maxScore}`),
          aiGraded: sql<number>`count(*) filter (where ${A.answers} @> '[{"gradedBy":"ai"}]'::jsonb)::int`,
          manual: sql<number>`count(*) filter (where ${A.answers} @> '[{"gradedBy":"manual"}]'::jsonb)::int`,
          students: sql<number>`count(distinct ${A.userId})::int`,
        })
        .from(A),
      db
        .select({ m: sql<string>`to_char(date_trunc('month', ${A.startedAt}), 'MM/YYYY')`, k: sql<string>`date_trunc('month', ${A.startedAt})`, count: sql<number>`count(*)::int` })
        .from(A)
        .where(sql`${A.startedAt} > now() - interval '6 months'`)
        .groupBy(sql`1, 2`)
        .orderBy(sql`2`),
    ]);
    return { ...s, byMonth: trend.map((t) => ({ label: t.m, value: t.count })) };
  });

  app.get<{ Params: { id: string } }>("/api/admin/attempts/:id", { preHandler: read }, async (req) => {
    const { attempt, quiz, questions } = await loadAttemptFull(req.params.id);
    const [user] = await db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, avatarUrl: schema.users.avatarUrl, level: schema.users.level })
      .from(schema.users)
      .where(eq(schema.users.id, attempt.userId));
    return { ...summarize(attempt, quiz, questions), user, quiz: { id: quiz.id, title: quiz.title, slug: quiz.slug, kind: quiz.kind, level: quiz.level, passScore: quiz.passScore } };
  });

  /** Sửa điểm thủ công từng câu + nhận xét chung. */
  app.patch<{ Params: { id: string } }>("/api/admin/attempts/:id/grade", { preHandler: write }, async (req) => {
    const b = parse(
      z.object({
        overrides: z.array(z.object({ questionId: z.string(), score: z.number().min(0), feedback: z.string().max(4000).optional().nullable() })).default([]),
        feedback: z.string().max(4000).optional().nullable(),
      }),
      req.body,
    );
    const { attempt, quiz, questions } = await loadAttemptFull(req.params.id);
    const byQ = new Map(questions.map((q) => [q.id, q]));
    const answers: AttemptAnswer[] = [...attempt.answers];
    for (const o of b.overrides) {
      const q = byQ.get(o.questionId);
      if (!q) continue;
      const score = Math.min(q.points, o.score);
      const i = answers.findIndex((a) => a.questionId === q.id);
      const prev = i >= 0 ? answers[i] : { questionId: q.id, answer: "" };
      const next: AttemptAnswer = { ...prev, score, correct: score >= q.points * 0.6, feedback: o.feedback ?? prev.feedback, gradedBy: "manual" };
      if (i >= 0) answers[i] = next;
      else answers.push(next);
    }
    const maxScore = questions.reduce((s, q) => s + q.points, 0);
    const score = answers.reduce((s, a) => s + (a.score ?? 0), 0);
    const [saved] = await db
      .update(A)
      .set({ answers, score, maxScore, status: "graded", feedback: b.feedback ?? attempt.feedback, submittedAt: attempt.submittedAt ?? new Date() })
      .where(eq(A.id, attempt.id))
      .returning();
    await logActivity(req, "grade", "attempt", attempt.id, `Chấm tay lượt làm "${quiz.title}" → ${maxScore ? Math.round((score / maxScore) * 100) : 0}%`, { overrides: b.overrides.length });
    return summarize(saved, quiz, questions);
  });

  /** Chấm lại (AI nếu có, không thì so khớp). */
  app.post<{ Params: { id: string } }>(
    "/api/admin/attempts/:id/regrade",
    { preHandler: write, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req) => {
      const { keepManual } = parse(z.object({ keepManual: z.boolean().default(false) }).default({ keepManual: false }), req.body ?? {});
      const r = await regradeAttempt(req.params.id, { keepManual });
      await logActivity(req, "regrade", "attempt", req.params.id, `Chấm lại lượt làm "${r.quiz.title}"${r.aiUsed ? " bằng AI" : ""}`);
      return summarize(r.attempt, r.quiz, r.questions);
    },
  );

  /** Gợi ý danh sách chủ đề đã dùng (cho ô chọn chủ đề). */
  app.get("/api/admin/quizzes-meta", { preHandler: read }, async () => {
    const topics = await db.selectDistinct({ topic: Q.topic }).from(Q).where(sql`${Q.topic} is not null`).orderBy(asc(Q.topic));
    return { topics: topics.map((t) => t.topic!), skills: ["vocab", "grammar", "kanji", "listening", "reading", "communication", "jlpt"] };
  });

  void desc;
}
