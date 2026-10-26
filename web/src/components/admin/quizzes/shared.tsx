"use client";

import { useState } from "react";
import { Bot, Check, Lightbulb, PenLine, Volume2, X } from "lucide-react";
import { Badge, cx, type Tone } from "@/components/admin/ui";
import { BLANK_RE, LETTERS, plainJa, speakJa } from "@/components/exercises/types";

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu                                                        */
/* ------------------------------------------------------------------ */

export type QuizKind = "exercise" | "jlpt";
export type QType = "mcq" | "short" | "essay";
export type Opt = { key: string; text: string };
export type Hint = { title?: string | null; body?: string | null; exampleJa?: string | null; exampleVi?: string | null };

export type AdminQuizRow = {
  id: string;
  slug: string;
  kind: QuizKind;
  title: string;
  level: string;
  skill: string;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard";
  durationMin: number;
  emoji: string | null;
  icon: string | null;
  tone: string | null;
  source: "manual" | "ai";
  featured: boolean;
  status: "draft" | "review" | "published" | "archived";
  passScore: number;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  attemptCount: number;
  avgScore: number | null;
};

/** Dữ liệu câu hỏi gửi lên API (tạo/sửa). */
export type QuestionInput = {
  type: QType;
  prompt: string;
  translation: string;
  options: Opt[];
  answer: string;
  explanation: string;
  explanationLong: string;
  hint: { title: string; body: string; exampleJa: string; exampleVi: string };
  audioText: string;
  scene: string;
  points: number;
};

export type AdminQuestion = {
  id: string;
  quizId: string;
  order: number;
  type: QType;
  prompt: string;
  translation: string | null;
  options: Opt[];
  answer: string;
  explanation: string | null;
  explanationLong: string | null;
  hint: Hint | null;
  audioText: string | null;
  scene: string | null;
  points: number;
};

export type QuizFull = AdminQuizRow & { description: string | null; questions: AdminQuestion[] };

export type AttemptRow = {
  id: string;
  status: "in_progress" | "submitted" | "graded";
  score: number | null;
  maxScore: number | null;
  percent: number | null;
  durationSec: number | null;
  startedAt: string;
  submittedAt: string | null;
  feedback: string | null;
  aiGraded: boolean;
  manual: boolean;
  answered: number;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  userLevel: string | null;
  quizId: string;
  quizTitle: string;
  quizSlug: string;
  quizKind: QuizKind;
  quizLevel: string;
  passScore: number;
};

export type ReviewRow = {
  questionId: string;
  order: number;
  type: QType;
  prompt: string;
  promptText: string;
  translation: string | null;
  options: Opt[];
  answer: string | null;
  correctAnswer: string;
  correct: boolean;
  score: number;
  points: number;
  feedback: string | null;
  gradedBy: "auto" | "ai" | "manual" | null;
  explanation: string | null;
  explanationLong: string | null;
};

export type AttemptDetail = {
  attemptId: string;
  status: string;
  score: number;
  rawScore: number;
  maxScore: number;
  accuracy: number;
  right: number;
  wrong: number;
  skipped: number;
  total: number;
  durationSec: number;
  xp: number;
  passed: boolean;
  passScore: number;
  feedback: string | null;
  aiGraded: boolean;
  startedAt: string;
  submittedAt: string | null;
  review: ReviewRow[];
  user: { id: string; name: string; email: string; avatarUrl: string | null; level: string | null };
  quiz: { id: string; title: string; slug: string; kind: QuizKind; level: string; passScore: number };
};

/* ------------------------------------------------------------------ */
/* Nhãn & tuỳ chọn                                                     */
/* ------------------------------------------------------------------ */

export const LEVEL_OPTIONS = ["N5", "N4", "N3", "N2", "N1"].map((v) => ({ value: v, label: v }));
export const SKILL_OPTIONS = [
  { value: "vocab", label: "Từ vựng" },
  { value: "grammar", label: "Ngữ pháp" },
  { value: "kanji", label: "Kanji" },
  { value: "listening", label: "Luyện nghe" },
  { value: "reading", label: "Đọc hiểu" },
  { value: "communication", label: "Giao tiếp" },
  { value: "jlpt", label: "JLPT tổng hợp" },
];
export const skillLabel = (v: string) => SKILL_OPTIONS.find((s) => s.value === v)?.label ?? v;
export const DIFF_OPTIONS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Trung bình" },
  { value: "hard", label: "Khó" },
];
export const DIFF_TONE: Record<string, Tone> = { easy: "green", medium: "amber", hard: "red" };
export const diffLabel = (v: string) => DIFF_OPTIONS.find((d) => d.value === v)?.label ?? v;
export const STATUS_OPTIONS = [
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
  { value: "review", label: "Chờ duyệt" },
  { value: "archived", label: "Lưu trữ" },
];
export const SOURCE_OPTIONS = [
  { value: "manual", label: "Thủ công" },
  { value: "ai", label: "AI tạo" },
];
export const QTYPE_OPTIONS = [
  { value: "mcq", label: "Trắc nghiệm" },
  { value: "short", label: "Trả lời ngắn" },
  { value: "essay", label: "Tự luận" },
];
export const qtypeLabel = (v: string) => QTYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const TOPIC_SUGGESTIONS = ["Gia đình", "Ẩm thực", "Du lịch", "Công việc", "Giao tiếp", "Đời sống", "Tin tức", "Trường học", "Mua sắm", "Sức khỏe"];
export const JLPT_SECTIONS = ["文字・語彙 (Từ vựng)", "文法 (Ngữ pháp)", "読解 (Đọc hiểu)", "聴解 (Nghe hiểu)", "Tổng hợp tất cả phần"];
export const TONE_OPTIONS = [
  { value: "from-rose-100 to-amber-50", label: "Hồng – vàng" },
  { value: "from-sky-100 to-blue-50", label: "Xanh trời" },
  { value: "from-amber-100 to-orange-50", label: "Cam" },
  { value: "from-emerald-50 to-teal-100", label: "Xanh lá" },
  { value: "from-indigo-100 to-violet-50", label: "Tím" },
  { value: "from-violet-100 to-rose-50", label: "Tím – hồng" },
  { value: "from-slate-100 to-sky-50", label: "Xám" },
  { value: "from-brand-50 to-rose-50", label: "Đỏ thương hiệu" },
];

export const kindPath = (k: QuizKind) => (k === "jlpt" ? "/admin/de-thi" : "/admin/bai-tap");
export const kindLabel = (k: QuizKind) => (k === "jlpt" ? "Đề thi JLPT" : "Bài tập");

export function SourceBadge({ source }: { source: string }) {
  return source === "ai" ? (
    <Badge tone="violet">
      <Bot className="size-3" /> AI
    </Badge>
  ) : (
    <Badge tone="gray">
      <PenLine className="size-3" /> Thủ công
    </Badge>
  );
}

export function ScoreBar({ value, pass }: { value: number | null; pass?: number }) {
  if (value === null || value === undefined) return <span className="text-muted">—</span>;
  const tone = pass !== undefined ? (value >= pass ? "bg-emerald-500" : "bg-amber-400") : value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex min-w-[90px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[.06]">
        <div className={cx("h-full rounded-full", tone)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-bold tabular-nums">{value}%</span>
    </div>
  );
}

export const fmtDuration = (s: number | null | undefined) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}g ${m % 60}p` : `${m}:${String(s % 60).padStart(2, "0")}`;
};

export function emptyQuestion(type: QType = "mcq"): QuestionInput {
  return {
    type,
    prompt: "",
    translation: "",
    options: type === "mcq" ? ["A", "B", "C", "D"].map((key) => ({ key, text: "" })) : [],
    answer: type === "mcq" ? "A" : "",
    explanation: "",
    explanationLong: "",
    hint: { title: "", body: "", exampleJa: "", exampleVi: "" },
    audioText: "",
    scene: "",
    points: type === "essay" ? 5 : type === "short" ? 2 : 1,
  };
}

export function toInput(q: Partial<AdminQuestion> & { type: QType }): QuestionInput {
  return {
    type: q.type,
    prompt: q.prompt ?? "",
    translation: q.translation ?? "",
    options: q.options?.length ? q.options : q.type === "mcq" ? emptyQuestion().options : [],
    answer: q.answer ?? "",
    explanation: q.explanation ?? "",
    explanationLong: q.explanationLong ?? "",
    hint: { title: q.hint?.title ?? "", body: q.hint?.body ?? "", exampleJa: q.hint?.exampleJa ?? "", exampleVi: q.hint?.exampleVi ?? "" },
    audioText: q.audioText ?? "",
    scene: q.scene ?? "",
    points: q.points ?? 1,
  };
}

/** Đọc thử bằng giọng ja-JP. */
export function SpeakButton({ text, label = "Nghe thử" }: { text: string; label?: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      disabled={!text.trim()}
      onClick={() => {
        const u = speakJa(plainJa(text));
        if (!u) return;
        setOn(true);
        u.onend = () => setOn(false);
        u.onerror = () => setOn(false);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-500 transition hover:bg-brand-50 disabled:opacity-40"
    >
      <Volume2 className={cx("size-3.5", on && "animate-pulse")} /> {label}
    </button>
  );
}

const RUBY = "[&_ruby]:[ruby-position:over] [&_rt]:text-[0.45em] [&_rt]:text-ink/60";

function Html({ html, className }: { html: string; className?: string }) {
  return <span className={cx(RUBY, className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function PromptWithBlank({ html, fill }: { html: string; fill?: string }) {
  const parts = html.split(BLANK_RE);
  return (
    <span className={RUBY}>
      {parts.map((p, i) => (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: p }} />
          {i < parts.length - 1 && (
            <span className="mx-1 inline-block min-w-[2.6em] border-b-[3px] border-ink/60 px-1 text-center text-emerald-600">
              {fill ? <Html html={fill} /> : <span className="invisible">ああ</span>}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

/** Thẻ xem trước câu hỏi giống giao diện làm bài của học viên. */
export function QuestionPreview({ q, level, index, showAnswer = true }: { q: QuestionInput; level?: string; index?: number; showAnswer?: boolean }) {
  const ansText = q.type === "mcq" ? q.options.find((o) => o.key === q.answer)?.text : undefined;
  const scene = q.scene && !q.scene.trim().startsWith("{") ? q.scene : null;
  return (
    <div className="rounded-2xl border border-ink/[.06] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {index !== undefined && <span className="rounded-md bg-ink/[.05] px-2 py-0.5 text-[11px] font-bold">Câu {index + 1}</span>}
        <Badge tone={q.type === "mcq" ? "blue" : q.type === "short" ? "amber" : "violet"}>{qtypeLabel(q.type)}</Badge>
        {level && <Badge tone="pink">{level}</Badge>}
        {q.points > 1 && <Badge tone="gray">{q.points} điểm</Badge>}
        {q.audioText && (
          <span className="ml-auto">
            <SpeakButton text={q.audioText} label="Audio" />
          </span>
        )}
      </div>
      <div className="flex gap-3">
        {scene && <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-amber-50 text-3xl">{scene}</span>}
        <div className="min-w-0 flex-1">
          {q.prompt ? (
            <p className="font-jp text-lg font-bold leading-[2.1] [&_p]:mb-1">
              <PromptWithBlank html={q.prompt} fill={showAnswer ? ansText : undefined} />
            </p>
          ) : (
            <p className="text-sm italic text-muted">Chưa có nội dung câu hỏi…</p>
          )}
          {q.translation && <p className="text-sm text-ink/60">{q.translation}</p>}
        </div>
      </div>
      {q.type === "mcq" ? (
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const ok = showAnswer && o.key === q.answer;
            return (
              <div key={o.key} className={cx("flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm", ok ? "border-emerald-300 bg-emerald-50" : "border-ink/10")}>
                <span className={cx("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold", ok ? "bg-emerald-500 text-white" : "bg-ink/[.05]")}>
                  {LETTERS[i] ?? o.key}
                </span>
                <span className="min-w-0 flex-1 font-jp">{o.text ? <Html html={o.text} /> : <span className="text-muted">—</span>}</span>
                {ok && <Check className="size-4 text-emerald-600" />}
              </div>
            );
          })}
        </div>
      ) : (
        showAnswer &&
        q.answer && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
            <span className="text-xs font-semibold text-emerald-700">{q.type === "essay" ? "Bài mẫu: " : "Đáp án: "}</span>
            <span className="font-jp">{q.answer.split(/\s*\|\s*/).join(" / ")}</span>
          </div>
        )
      )}
      {(q.hint.title || q.hint.body) && (
        <div className="mt-3 rounded-xl bg-brand-50/70 p-3 text-xs">
          <p className="flex items-center gap-1 font-bold text-brand-600">
            <Lightbulb className="size-3.5" /> {q.hint.title || "Gợi ý"}
          </p>
          {q.hint.body && <Html html={q.hint.body} className="mt-1 block text-ink/75" />}
          {q.hint.exampleJa && (
            <p className="mt-1.5 font-jp text-sm leading-[2]">
              <Html html={q.hint.exampleJa} /> <span className="font-sans text-xs text-muted">{q.hint.exampleVi}</span>
            </p>
          )}
        </div>
      )}
      {showAnswer && (q.explanation || q.explanationLong) && (
        <div className="mt-3 rounded-xl bg-ink/[.03] p-3 text-xs leading-relaxed text-ink/75">
          {q.explanation && <Html html={q.explanation} className="block font-medium" />}
          {q.explanationLong && <Html html={q.explanationLong} className="mt-1 block text-ink/60" />}
        </div>
      )}
    </div>
  );
}

export function CorrectIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
      <Check className="size-3" strokeWidth={3} />
    </span>
  ) : (
    <span className="grid size-5 place-items-center rounded-full bg-red-500 text-white">
      <X className="size-3" strokeWidth={3} />
    </span>
  );
}
