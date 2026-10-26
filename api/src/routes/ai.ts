/**
 * Công cụ AI cho bài tập / đề thi (quyền quizzes.write):
 *  GET  /api/admin/ai/status                 trạng thái cấu hình
 *  POST /api/admin/ai/generate-quiz          sinh bản nháp (JSON, hoặc SSE nếu Accept: text/event-stream)
 *  POST /api/admin/ai/generate-quiz/save     lưu bản nháp thành bài (source = "ai")
 *  POST /api/admin/ai/regenerate-question    tạo lại 1 câu
 *  POST /api/admin/ai/explain                viết giải thích cho 1 câu
 */
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { HttpError, notFound, parse } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";
import { zLevel, zStatus } from "../lib/crud.js";
import { aiConfig, aiError, aiSettings, explainQuestion, generateQuiz, hasAiKey, NO_KEY_MESSAGE, regenerateQuestion, type GenQuestion } from "../lib/ai.js";
import { createQuiz, questionBody } from "./quizzes-admin.js";

const write = requirePerm("quizzes.write");
const read = requirePerm("quizzes.read");
const aiLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

const genSchema = z
  .object({
    level: zLevel,
    skill: z.string().trim().min(1).default("grammar"),
    topic: z.string().trim().max(120).optional().nullable(),
    count: z.coerce.number().int().min(5, "Tối thiểu 5 câu").max(50, "Tối đa 50 câu").default(10),
    types: z
      .object({ mcq: z.coerce.number().int().min(0), short: z.coerce.number().int().min(0), essay: z.coerce.number().int().min(0) })
      .optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    notes: z.string().trim().max(1500).optional().nullable(),
    kind: z.enum(["exercise", "jlpt"]).default("exercise"),
    jlptSection: z.string().trim().max(80).optional().nullable(),
  })
  .transform((v) => {
    // chuẩn hoá phân bổ loại câu cho đúng tổng số câu
    let t = v.types ?? { mcq: v.count, short: 0, essay: 0 };
    const sum = t.mcq + t.short + t.essay;
    if (sum !== v.count) {
      const short = Math.min(t.short, v.count);
      const essay = Math.min(t.essay, v.count - short);
      t = { mcq: v.count - short - essay, short, essay };
    }
    return { ...v, types: t };
  });

const ensureKey = async () => {
  const c = await aiConfig();
  if (!c.key) throw new HttpError(503, NO_KEY_MESSAGE);
  if (!c.generateEnabled) throw new HttpError(403, "Tạo đề bằng AI đang tắt trong Cài đặt › AI");
};

const toQuestionInput = (q: GenQuestion) => ({
  type: q.type,
  prompt: q.prompt,
  translation: q.translation || null,
  options: q.type === "mcq" ? q.options : [],
  answer: q.answer,
  explanation: q.explanation || null,
  explanationLong: q.explanationLong || null,
  hint: q.hint,
  audioText: q.audioText || null,
  points: q.type === "essay" ? 5 : q.type === "short" ? 2 : 1,
});

export default async function aiRoutes(app: FastifyInstance) {
  app.get("/api/admin/ai/status", { preHandler: read }, async () => {
    const c = await aiConfig();
    return {
      configured: !!c.key,
      keySource: c.keySource,
      provider: c.base,
      model: c.model,
      gradingEnabled: c.gradingEnabled,
      generateEnabled: c.generateEnabled,
      message: c.key ? null : NO_KEY_MESSAGE,
    };
  });

  app.post("/api/admin/ai/generate-quiz", { preHandler: write, config: aiLimit }, async (req, reply) => {
    const p = parse(genSchema, req.body);
    const sse = String(req.headers.accept ?? "").includes("text/event-stream");
    if (!sse) {
      await ensureKey();
      const started = Date.now();
      const draft = await generateQuiz(p);
      await logActivity(req, "ai_generate", "quiz", null, `AI tạo ${draft.questions.length} câu ${p.level} (${p.skill})`, { ...p, ms: Date.now() - started });
      return { ...draft, params: p, requested: p.count };
    }

    // Server-Sent Events: progress → done | error
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    try {
      send("progress", { stage: "start", done: 0, total: p.count, message: "Đang gửi yêu cầu tới AI…" });
      await ensureKey();
      const started = Date.now();
      const draft = await generateQuiz(p, (done, total) => send("progress", { stage: "generating", done, total, message: `AI đang soạn câu ${Math.min(done + 1, total)}/${total}…` }));
      send("progress", { stage: "validating", done: p.count, total: p.count, message: "Đang kiểm tra & loại câu trùng…" });
      await logActivity(req, "ai_generate", "quiz", null, `AI tạo ${draft.questions.length} câu ${p.level} (${p.skill})`, { ...p, ms: Date.now() - started });
      send("done", { ...draft, params: p, requested: p.count });
    } catch (e) {
      const err = aiError(e);
      send("error", { status: err.status, error: err.message });
    } finally {
      clearInterval(ping);
      res.end();
    }
  });

  app.post("/api/admin/ai/generate-quiz/save", { preHandler: write }, async (req, reply) => {
    const b = parse(
      z.object({
        kind: z.enum(["exercise", "jlpt"]),
        title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(200),
        description: z.string().trim().optional().nullable(),
        level: zLevel,
        skill: z.string().trim().min(1),
        topic: z.string().trim().optional().nullable(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        durationMin: z.coerce.number().int().min(1).max(600).default(15),
        passScore: z.coerce.number().int().min(0).max(100).default(60),
        emoji: z.string().optional().nullable(),
        tone: z.string().optional().nullable(),
        status: zStatus.default("draft"),
        questions: z.array(questionBody).min(1, "Cần ít nhất 1 câu hỏi"),
      }),
      req.body,
    );
    const { questions, ...meta } = b;
    const quiz = await createQuiz(
      { ...meta, source: "ai", featured: false, icon: null, slug: null, emoji: meta.emoji ?? (meta.kind === "jlpt" ? "📝" : "✨"), tone: meta.tone ?? "from-violet-100 to-rose-50" },
      questions,
      req.authUser?.id,
    );
    await logActivity(req, "create", "quiz", quiz.id, `Lưu ${quiz.kind === "jlpt" ? "đề thi" : "bài tập"} AI "${quiz.title}" (${questions.length} câu, ${quiz.status})`);
    return reply.code(201).send(quiz);
  });

  app.post("/api/admin/ai/regenerate-question", { preHandler: write, config: aiLimit }, async (req) => {
    const b = parse(
      z.object({
        level: zLevel,
        skill: z.string().default("grammar"),
        topic: z.string().optional().nullable(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        kind: z.enum(["exercise", "jlpt"]).default("exercise"),
        type: z.enum(["mcq", "short", "essay"]).default("mcq"),
        notes: z.string().max(1500).optional().nullable(),
        instruction: z.string().max(500).optional().nullable(),
        avoid: z.array(z.string().max(500)).max(60).default([]),
      }),
      req.body,
    );
    await ensureKey();
    const q = await regenerateQuestion(b);
    await logActivity(req, "ai_regenerate", "question", null, `AI tạo lại 1 câu ${b.level}`);
    return { question: q, input: toQuestionInput(q) };
  });

  app.post("/api/admin/ai/explain", { preHandler: write, config: aiLimit }, async (req) => {
    const b = parse(
      z.object({
        questionId: z.string().optional(),
        save: z.boolean().default(false),
        level: zLevel.optional(),
        type: z.enum(["mcq", "short", "essay"]).optional(),
        prompt: z.string().optional(),
        options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
        answer: z.string().optional(),
      }),
      req.body,
    );
    await ensureKey();
    let q = { level: b.level ?? "N4", type: b.type ?? "mcq", prompt: b.prompt ?? "", options: b.options ?? [], answer: b.answer ?? "" };
    let qid: string | null = null;
    if (b.questionId) {
      const [row] = await db
        .select({ q: schema.questions, level: schema.quizzes.level })
        .from(schema.questions)
        .innerJoin(schema.quizzes, eq(schema.quizzes.id, schema.questions.quizId))
        .where(eq(schema.questions.id, b.questionId));
      if (!row) throw notFound("Không tìm thấy câu hỏi");
      qid = row.q.id;
      q = { level: row.level, type: row.q.type, prompt: b.prompt ?? row.q.prompt, options: b.options ?? row.q.options, answer: b.answer ?? row.q.answer };
    }
    if (!q.prompt.trim()) throw new HttpError(400, "Thiếu nội dung câu hỏi");
    const r = await explainQuestion(q);
    if (qid && b.save) {
      await db
        .update(schema.questions)
        .set({ explanation: r.explanation, explanationLong: r.explanationLong, hint: r.hint })
        .where(eq(schema.questions.id, qid));
    }
    await logActivity(req, "ai_explain", "question", qid, `AI viết giải thích câu hỏi${b.save ? " (đã lưu)" : ""}`);
    return r;
  });
}
