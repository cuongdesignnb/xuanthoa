/**
 * Seed bài tập, đề JLPT, câu hỏi và lượt làm.
 *  - "ngu-phap-n4": 20 câu ngữ pháp N4 (chuyển từ client, có furigana / gợi ý / cảnh minh hoạ)
 *  - 16 bài tập theo chủ đề + 25 bộ đề JLPT (quiz-bank.ts)
 *  - Trạng thái của minhanh@nihongo.vn giống ảnh tham chiếu (đã làm / đang làm %)
 *  - ~300 lượt làm ngẫu nhiên của học viên trong 6 tháng (thống kê admin)
 *  - settings "quiz_home_topics": thẻ "Bài tập theo chủ đề" ở trang chủ
 */
import { eq } from "drizzle-orm";
import type { SeedCtx } from "./ctx.js";
import type { AttemptAnswer, QuestionHint, QuestionOption } from "../schema.js";
import { EXERCISES, JLPT, type BankQ, type QuizSeed } from "./quiz-bank.js";
import { QUESTIONS as N4_QUESTIONS, type Seg } from "./quiz-n4-data.js";

const KEYS = ["A", "B", "C", "D"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const segsToHtml = (segs: Seg[]) =>
  segs.map((s) => (s === "_" ? "＿＿＿" : typeof s === "string" ? esc(s) : `<ruby>${esc(s[0])}<rt>${esc(s[1])}</rt></ruby>`)).join("");

type QRow = {
  order: number;
  type: "mcq" | "short" | "essay";
  prompt: string;
  translation: string | null;
  options: QuestionOption[];
  answer: string;
  explanation: string | null;
  explanationLong: string | null;
  hint: QuestionHint | null;
  audioText: string | null;
  scene: string | null;
  points: number;
};

function bankToRow(q: BankQ, order: number): QRow {
  const type = q.type ?? "mcq";
  return {
    order,
    type,
    prompt: q.prompt,
    translation: q.translation ?? null,
    options: type === "mcq" ? (q.options ?? []).map((text, i) => ({ key: KEYS[i], text })) : [],
    answer: type === "mcq" ? KEYS[Number(q.answer)] : String(q.answer),
    explanation: q.explanation ?? null,
    explanationLong: q.explanationLong ?? null,
    hint: q.hint ? { title: q.hint.title, body: q.hint.body, exampleJa: q.hint.exampleJa || undefined, exampleVi: q.hint.exampleVi || undefined } : null,
    audioText: q.audioText ?? null,
    scene: q.scene ?? null,
    points: q.points ?? (type === "essay" ? 5 : type === "short" ? 2 : 1),
  };
}

/** Bài "Luyện tập Ngữ pháp N4" — 20 câu thật từ giao diện mẫu. */
const N4_QUIZ: Omit<QuizSeed, "questions"> & { rows: QRow[] } = {
  slug: "ngu-phap-n4",
  kind: "exercise",
  title: "Luyện tập Ngữ pháp N4",
  description: "Củng cố kiến thức, làm bài tập và tiến bộ mỗi ngày — 20 câu trắc nghiệm có furigana, gợi ý ngữ pháp và giải thích chi tiết.",
  level: "N4",
  skill: "grammar",
  topic: "Đời sống",
  difficulty: "medium",
  durationMin: 20,
  emoji: "✏️",
  tone: "from-brand-100 to-brand-200",
  featured: true,
  passScore: 60,
  createdDaysAgo: 2,
  popularity: 95,
  rows: N4_QUESTIONS.map((q, i) => {
    // Dữ liệu gốc gần như luôn đặt đáp án ở A → xoay vòng phương án để đáp án phân bố đều (giữ nguyên câu 7 như ảnh mẫu).
    const shift = i === 6 ? 0 : i % 4;
    const opts = q.options.map((_, k) => q.options[(k + q.options.length - shift) % q.options.length]);
    const ans = (q.answer + shift) % q.options.length;
    return { q, opts, ans, i };
  }).map(({ q, opts, ans, i }) => ({
    order: i,
    type: "mcq" as const,
    prompt: segsToHtml(q.sentence),
    translation: q.vi,
    options: opts.map((text, k) => ({ key: KEYS[k], text })),
    answer: KEYS[ans],
    explanation: q.short,
    explanationLong: q.detail,
    hint: { title: q.hint.title, body: q.hint.desc, exampleJa: segsToHtml(q.hint.ex), exampleVi: q.hint.exVi },
    audioText: null,
    scene: JSON.stringify(q.scene),
    points: 1,
  })),
};

const HOME_TOPICS = {
  banner: { subtitle: "Cập nhật hằng tuần theo cấu trúc JLPT mới" },
  items: [
    { title: "Chào hỏi", desc: "Giao tiếp cơ bản", icon: "MessagesSquare", tone: "bg-amber-100 text-amber-500", skill: "communication", topic: "Giao tiếp" },
    { title: "Từ vựng", desc: "Mở rộng vốn từ", icon: "BookMarked", tone: "bg-rose-100 text-rose-500", skill: "vocab" },
    { title: "Ngữ pháp", desc: "Nắm vững cấu trúc", icon: "FileText", tone: "bg-violet-100 text-violet-500", skill: "grammar" },
    { title: "Kanji", desc: "Học và ghi nhớ", icon: "Languages", tone: "bg-emerald-100 text-emerald-600", skill: "kanji" },
    { title: "Giao tiếp", desc: "Tình huống thực tế", icon: "Users", tone: "bg-sky-100 text-sky-500", skill: "communication" },
    { title: "Luyện nghe", desc: "Nghe hiểu tự nhiên", icon: "Headphones", tone: "bg-fuchsia-100 text-fuchsia-500", skill: "listening" },
    { title: "JLPT", desc: "Ôn tập theo đề thi", icon: "ClipboardCheck", tone: "bg-red-100 text-red-500", skill: "jlpt" },
  ],
};

const AI_FEEDBACK_GOOD = [
  "Bài viết đúng yêu cầu, ngữ pháp chính xác. Có thể dùng thêm 「〜と申します」 để lịch sự hơn.",
  "Câu trả lời tự nhiên, dùng đúng mẫu câu. Chú ý viết đúng okurigana của động từ.",
  "Rất tốt! Ý rõ ràng, chia động từ đúng. Gợi ý: nối các câu bằng 「そして」 cho mạch lạc.",
];
const AI_FEEDBACK_MID = [
  "Ý đúng nhưng còn lỗi trợ từ (「に」/「で」). Hãy xem lại cách dùng trợ từ chỉ nơi chốn.",
  "Bài viết hơi ngắn so với yêu cầu; cần thêm 1–2 câu và dùng thể lịch sự 〜ます thống nhất.",
  "Dùng đúng mẫu ngữ pháp nhưng có lỗi chia thể (〜ている → 〜ています). Cần chú ý hơn.",
];

export default async function seedQuizzes(ctx: SeedCtx) {
  const { db, schema } = ctx;
  const adminId = await ctx.ids.user("admin@nihongo.vn");
  const editorId = await ctx.ids.user("editor@nihongo.vn");

  await db
    .insert(schema.settings)
    .values({ key: "quiz_home_topics", value: HOME_TOPICS })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: HOME_TOPICS } });

  /* ---------------- Quizzes + questions ---------------- */
  const all: { seed: Omit<QuizSeed, "questions">; rows: QRow[] }[] = [
    { seed: N4_QUIZ, rows: N4_QUIZ.rows },
    ...[...EXERCISES, ...JLPT].map((s) => ({ seed: s, rows: s.questions.map(bankToRow) })),
  ];

  const quizzes: { id: string; slug: string; level: string; difficulty: string; durationMin: number; popularity: number; passScore: number; questions: (QRow & { id: string })[] }[] = [];
  for (const { seed, rows } of all) {
    const created = ctx.daysAgo(seed.createdDaysAgo);
    const isAi = /^jlpt-n\d-de-5$/.test(seed.slug);
    const [quiz] = await db
      .insert(schema.quizzes)
      .values({
        slug: seed.slug,
        kind: seed.kind,
        title: seed.title,
        description: seed.description,
        level: seed.level,
        skill: seed.skill,
        topic: seed.topic,
        difficulty: seed.difficulty,
        durationMin: seed.durationMin,
        icon: seed.icon ?? null,
        emoji: seed.emoji,
        tone: seed.tone,
        source: isAi ? "ai" : "manual",
        passScore: seed.passScore ?? 60,
        featured: seed.featured ?? false,
        status: "published",
        createdById: seed.kind === "jlpt" ? adminId : (editorId ?? adminId),
        createdAt: created,
        updatedAt: created,
      })
      .returning();
    const inserted = await db
      .insert(schema.questions)
      .values(rows.map((r) => ({ ...r, quizId: quiz.id })))
      .returning({ id: schema.questions.id, order: schema.questions.order });
    const byOrder = new Map(inserted.map((x) => [x.order, x.id]));
    quizzes.push({
      id: quiz.id,
      slug: quiz.slug,
      level: quiz.level,
      difficulty: quiz.difficulty,
      durationMin: quiz.durationMin,
      popularity: seed.popularity,
      passScore: quiz.passScore,
      questions: rows.map((r) => ({ ...r, id: byOrder.get(r.order)! })),
    });
  }

  // Một bản nháp do AI tạo (chưa xuất bản) để màn admin có dữ liệu "Bản nháp / AI".
  {
    const src = EXERCISES.find((e) => e.slug === "tu-vung-do-an")!;
    const [draft] = await db
      .insert(schema.quizzes)
      .values({
        slug: "ai-tu-vung-sieu-thi-n5",
        kind: "exercise",
        title: "Từ vựng: Đi siêu thị (AI)",
        description: "Bản nháp do AI tạo — từ vựng mua sắm ở siêu thị, chờ biên tập viên duyệt.",
        level: "N5",
        skill: "vocab",
        topic: "Đời sống",
        difficulty: "easy",
        durationMin: 10,
        emoji: "🛒",
        tone: "from-violet-100 to-rose-50",
        source: "ai",
        status: "draft",
        createdById: editorId ?? adminId,
        createdAt: ctx.daysAgo(1),
      })
      .returning();
    await db.insert(schema.questions).values(src.questions.slice(0, 5).map((q, i) => ({ ...bankToRow(q, i), quizId: draft.id })));
  }

  /* ---------------- Lượt làm ---------------- */
  const students = await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users).where(eq(schema.users.role, "student"));
  const minhanh = students.find((s) => s.email === "minhanh@nihongo.vn");
  const others = students.filter((s) => s.email !== "minhanh@nihongo.vn");
  const bySlug = new Map(quizzes.map((q) => [q.slug, q]));

  type Q = (typeof quizzes)[number];
  const wrongText = ["わかりません", "たべました", "いきます", "がっこう", "べんきょう"];

  /** Tạo câu trả lời cho `n` câu đầu (hoặc toàn bộ), xác suất đúng `skill`. */
  function makeAnswers(quiz: Q, skill: number, n = quiz.questions.length, opts: { forceCorrect?: (i: number) => boolean | undefined } = {}) {
    const out: AttemptAnswer[] = [];
    quiz.questions.slice(0, n).forEach((q, i) => {
      const forced = opts.forceCorrect?.(i);
      const ok = forced ?? ctx.rand() < skill;
      if (q.type === "mcq") {
        const wrong = KEYS.filter((k) => k !== q.answer);
        const answer = ok ? q.answer : ctx.pick(wrong);
        out.push({ questionId: q.id, answer, correct: ok, score: ok ? q.points : 0, gradedBy: "auto" });
      } else if (q.type === "short") {
        const answer = ok ? q.answer.split(/\s*\|\s*/)[0] : ctx.pick(wrongText);
        out.push({
          questionId: q.id,
          answer,
          correct: ok,
          score: ok ? q.points : 0,
          gradedBy: "auto",
          feedback: ok ? "Chính xác! (Chấm tự động bằng so khớp đáp án)" : `Chưa khớp đáp án mẫu: ${q.answer}.`,
        });
      } else {
        const ratio = ok ? 0.8 + ctx.rand() * 0.2 : 0.3 + ctx.rand() * 0.3;
        const score = Math.round(ratio * q.points * 2) / 2;
        out.push({
          questionId: q.id,
          answer: q.answer.split(/\s*\|\s*/)[0].slice(0, Math.max(12, Math.round(q.answer.length * ratio))),
          correct: score >= q.points * 0.6,
          score,
          gradedBy: "ai",
          feedback: ctx.pick(ok ? AI_FEEDBACK_GOOD : AI_FEEDBACK_MID),
        });
      }
    });
    return out;
  }

  const rows: (typeof schema.attempts.$inferInsert)[] = [];
  function addAttempt(userId: string, quiz: Q, answers: AttemptAnswer[], status: "in_progress" | "graded", startedAt: Date) {
    const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0);
    const score = answers.reduce((s, a) => s + (a.score ?? 0), 0);
    const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
    const dur = Math.round(quiz.durationMin * 60 * (0.35 + ctx.rand() * 0.7) * (status === "graded" ? 1 : answers.length / quiz.questions.length));
    const aiUsed = answers.some((a) => a.gradedBy === "ai");
    rows.push({
      userId,
      quizId: quiz.id,
      answers,
      status,
      score: status === "graded" ? score : null,
      maxScore: status === "graded" ? maxScore : null,
      durationSec: Math.max(30, dur),
      startedAt,
      submittedAt: status === "graded" ? new Date(startedAt.getTime() + dur * 1000) : null,
      feedback:
        status === "graded"
          ? aiUsed
            ? pct >= quiz.passScore
              ? "Bài làm tốt, phần tự luận diễn đạt rõ ý. Hãy chú ý thêm trợ từ và kính ngữ."
              : "Phần trắc nghiệm ổn nhưng tự luận còn ngắn và sai trợ từ. Xem lại phần giải thích từng câu nhé."
            : pct >= quiz.passScore
              ? `Bạn đạt ${pct}% — vượt mức yêu cầu ${quiz.passScore}%. Tiếp tục phát huy!`
              : `Bạn đạt ${pct}%, chưa đạt mức ${quiz.passScore}%. Hãy xem lại phần giải thích và luyện thêm nhé.`
          : null,
    });
  }

  if (minhanh) {
    const done = (slug: string, skill: number, days: number) => {
      const q = bySlug.get(slug);
      if (q) addAttempt(minhanh.id, q, makeAnswers(q, skill), "graded", ctx.daysAgo(days));
    };
    const progress = (slug: string, percent: number, days: number) => {
      const q = bySlug.get(slug);
      if (!q) return;
      const n = Math.max(1, Math.round((q.questions.length * percent) / 100));
      addAttempt(minhanh.id, q, makeAnswers(q, 0.8, n), "in_progress", ctx.daysAgo(days));
    };
    done("tu-vung-gia-dinh", 0.95, 20);
    done("ngu-phap-teimasu", 0.85, 12);
    done("giao-tiep-chao-hoi", 0.8, 6);
    done("jlpt-n5-de-2", 0.88, 30);
    done("jlpt-n4-de-1", 0.7, 9);
    progress("tu-vung-cong-viec", 80, 2);
    progress("kanji-n3-phan-1", 60, 1);
    progress("jlpt-n5-de-4", 60, 3);
    // Ngữ pháp N4: câu 1–5 đúng, câu 6 sai, đang làm câu 7 (giống ảnh tham chiếu)
    const n4 = bySlug.get("ngu-phap-n4")!;
    addAttempt(minhanh.id, n4, makeAnswers(n4, 1, 6, { forceCorrect: (i) => i < 5 }), "in_progress", new Date(Date.now() - 8 * 60 * 1000));
    // bản làm trước đó đã nộp
    addAttempt(minhanh.id, n4, makeAnswers(n4, 0.65), "graded", ctx.daysAgo(15));

    await db.insert(schema.bookmarks).values(
      ["tu-vung-cong-viec", "jlpt-n4-de-2"].filter((s) => bySlug.has(s)).map((s) => ({ userId: minhanh.id, targetType: "quiz", targetId: bySlug.get(s)!.id })),
    );
  }

  // ~300 lượt làm ngẫu nhiên trong 6 tháng, bài phổ biến được làm nhiều hơn.
  const published = quizzes;
  const weightTotal = published.reduce((s, q) => s + q.popularity, 0);
  const pickQuiz = () => {
    let r = ctx.rand() * weightTotal;
    for (const q of published) {
      r -= q.popularity;
      if (r <= 0) return q;
    }
    return published[0];
  };
  const diffPenalty: Record<string, number> = { easy: 0.1, medium: 0, hard: -0.12 };
  if (others.length) {
    for (let i = 0; i < 310; i++) {
      const user = ctx.pick(others);
      const quiz = pickQuiz();
      // gần đây nhiều hơn (tăng trưởng)
      const days = Math.floor(Math.pow(ctx.rand(), 1.4) * 180);
      const skill = Math.min(0.97, Math.max(0.25, 0.55 + ctx.rand() * 0.4 + diffPenalty[quiz.difficulty]));
      if (ctx.rand() < 0.13) {
        const n = Math.max(1, Math.floor(quiz.questions.length * (0.2 + ctx.rand() * 0.6)));
        addAttempt(user.id, quiz, makeAnswers(quiz, skill, n), "in_progress", ctx.daysAgo(days));
      } else {
        // đôi khi bỏ trống vài câu
        const n = ctx.rand() < 0.2 ? Math.max(1, quiz.questions.length - ctx.int(1, 3)) : quiz.questions.length;
        addAttempt(user.id, quiz, makeAnswers(quiz, skill, n), "graded", ctx.daysAgo(days));
      }
    }
  }

  for (let i = 0; i < rows.length; i += 100) await db.insert(schema.attempts).values(rows.slice(i, i + 100));
}
