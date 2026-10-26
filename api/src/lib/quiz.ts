/** Nghiệp vụ chấm bài & tổng hợp kết quả lượt làm (dùng chung cho /me và /admin). */
import { asc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { AttemptAnswer } from "../db/schema.js";
import { notFound } from "./http.js";
import { aiSettings, fallbackGrade, gradeWithAi, hasAiKey, plainText, type GradeItem } from "./ai.js";

export type Question = typeof schema.questions.$inferSelect;
export type Quiz = typeof schema.quizzes.$inferSelect;
export type Attempt = typeof schema.attempts.$inferSelect;

export const XP_PER_POINT = 10;
export const XP_PASS_BONUS = 20;

export const loadQuestions = (quizId: string) =>
  db.select().from(schema.questions).where(eq(schema.questions.quizId, quizId)).orderBy(asc(schema.questions.order));

/** Câu hỏi cho học viên: bỏ đáp án & giải thích. */
export function publicQuestion(q: Question) {
  return {
    id: q.id,
    order: q.order,
    type: q.type,
    prompt: q.prompt,
    translation: q.translation,
    options: q.options,
    hint: q.hint,
    audioText: q.audioText,
    scene: q.scene,
    points: q.points,
  };
}

export const isCorrectMcq = (q: Question, answer: string) => q.type === "mcq" && answer.trim().toUpperCase() === q.answer.trim().toUpperCase();

/** Phản hồi tức thì cho câu trắc nghiệm. */
export function mcqFeedback(q: Question, answer: string) {
  return {
    questionId: q.id,
    correct: isCorrectMcq(q, answer),
    correctAnswer: q.answer,
    explanation: q.explanation,
    explanationLong: q.explanationLong,
    hint: q.hint,
  };
}

/**
 * Chấm toàn bộ lượt làm: MCQ chấm tất định; short/essay chấm bằng AI (nếu có khoá & bật trong cài đặt),
 * lỗi AI hoặc không có khoá → chấm dự phòng bằng so khớp. `keepManual` giữ điểm giáo viên đã sửa.
 */
export async function gradeAnswers(quiz: Quiz, questions: Question[], raw: AttemptAnswer[], opts: { keepManual?: boolean } = {}) {
  const byQ = new Map(raw.map((a) => [a.questionId, a]));
  const answers: AttemptAnswer[] = [];
  const open: GradeItem[] = [];

  for (const q of questions) {
    const a = byQ.get(q.id);
    if (!a || !a.answer?.trim()) continue;
    if (opts.keepManual && a.gradedBy === "manual") {
      answers.push(a);
      continue;
    }
    if (q.type === "mcq") {
      const correct = isCorrectMcq(q, a.answer);
      answers.push({ questionId: q.id, answer: a.answer, correct, score: correct ? q.points : 0, gradedBy: "auto" });
    } else {
      open.push({ id: q.id, type: q.type, prompt: q.prompt, modelAnswer: q.answer, rubric: q.explanation, points: q.points, answer: a.answer });
    }
  }

  let overall: string | null = null;
  let aiUsed = false;
  let aiNote: string | null = null;
  if (open.length) {
    const settings = await aiSettings();
    let results: { id: string; score: number; feedback: string; correct: boolean }[] | null = null;
    if (hasAiKey() && settings.gradingEnabled) {
      try {
        const r = await gradeWithAi(quiz.level, open);
        results = r.items;
        overall = r.overall;
        aiUsed = true;
      } catch (e) {
        aiNote = `AI chấm bài gặp lỗi (${(e as Error).message}); đã chấm tự động bằng so khớp đáp án.`;
      }
    } else {
      aiNote = hasAiKey()
        ? "Chấm AI đang tắt trong cài đặt; câu tự luận được chấm tự động bằng so khớp đáp án."
        : "Chưa cấu hình AI (ANTHROPIC_API_KEY); câu tự luận được chấm tự động bằng so khớp đáp án.";
    }
    results ??= open.map(fallbackGrade);
    for (const r of results) {
      const item = open.find((o) => o.id === r.id)!;
      answers.push({ questionId: r.id, answer: item.answer, correct: r.correct, score: r.score, feedback: r.feedback, gradedBy: aiUsed ? "ai" : "auto" });
    }
  }

  // giữ thứ tự theo câu hỏi
  const order = new Map(questions.map((q, i) => [q.id, i]));
  answers.sort((a, b) => (order.get(a.questionId) ?? 0) - (order.get(b.questionId) ?? 0));

  const maxScore = questions.reduce((s, q) => s + q.points, 0);
  const score = answers.reduce((s, a) => s + (a.score ?? 0), 0);
  const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const feedback =
    [overall, aiNote].filter(Boolean).join(" ") ||
    (pct >= quiz.passScore ? `Bạn đạt ${pct}% — vượt mức yêu cầu ${quiz.passScore}%. Tiếp tục phát huy!` : `Bạn đạt ${pct}%, chưa đạt mức ${quiz.passScore}%. Hãy xem lại phần giải thích và luyện thêm nhé.`);
  return { answers, score, maxScore, feedback, aiUsed };
}

/** Tổng hợp kết quả để hiển thị (modal kết quả, admin chi tiết). */
export function summarize(attempt: Attempt, quiz: Quiz, questions: Question[]) {
  const byQ = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const maxScore = attempt.maxScore ?? questions.reduce((s, q) => s + q.points, 0);
  const rawScore = attempt.score ?? 0;
  const answered = questions.filter((q) => byQ.get(q.id)?.answer?.trim()).length;
  const right = questions.filter((q) => byQ.get(q.id)?.correct).length;
  const percent = maxScore ? Math.round((rawScore / maxScore) * 100) : 0;
  const passed = percent >= quiz.passScore;
  const xp = Math.round(rawScore * XP_PER_POINT) + (passed ? XP_PASS_BONUS : 0);
  return {
    attemptId: attempt.id,
    quizId: quiz.id,
    quizSlug: quiz.slug,
    quizTitle: quiz.title,
    status: attempt.status,
    score: percent,
    rawScore,
    maxScore,
    accuracy: answered ? Math.round((right / answered) * 100) : 0,
    right,
    wrong: answered - right,
    skipped: questions.length - answered,
    total: questions.length,
    durationSec: attempt.durationSec ?? 0,
    xp,
    passed,
    passScore: quiz.passScore,
    feedback: attempt.feedback,
    aiGraded: attempt.answers.some((a) => a.gradedBy === "ai"),
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    review: questions.map((q) => {
      const a = byQ.get(q.id);
      return {
        questionId: q.id,
        order: q.order,
        type: q.type,
        prompt: q.prompt,
        promptText: plainText(q.prompt),
        translation: q.translation,
        options: q.options,
        answer: a?.answer ?? null,
        correctAnswer: q.answer,
        correct: a?.correct ?? false,
        score: a?.score ?? 0,
        points: q.points,
        feedback: a?.feedback ?? null,
        gradedBy: a?.gradedBy ?? null,
        explanation: q.explanation,
        explanationLong: q.explanationLong,
      };
    }),
  };
}

export async function loadAttemptFull(id: string) {
  const [attempt] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, id));
  if (!attempt) throw notFound("Không tìm thấy lượt làm bài");
  const [quiz] = await db.select().from(schema.quizzes).where(eq(schema.quizzes.id, attempt.quizId));
  if (!quiz) throw notFound("Không tìm thấy bài tập");
  const questions = await loadQuestions(quiz.id);
  return { attempt, quiz, questions };
}

/** Chấm lại & lưu. */
export async function regradeAttempt(id: string, opts: { keepManual?: boolean } = {}) {
  const { attempt, quiz, questions } = await loadAttemptFull(id);
  const g = await gradeAnswers(quiz, questions, attempt.answers, opts);
  const [saved] = await db
    .update(schema.attempts)
    .set({
      answers: g.answers,
      score: g.score,
      maxScore: g.maxScore,
      feedback: g.feedback,
      status: "graded",
      submittedAt: attempt.submittedAt ?? new Date(),
    })
    .where(eq(schema.attempts.id, id))
    .returning();
  return { attempt: saved, quiz, questions, aiUsed: g.aiUsed };
}
