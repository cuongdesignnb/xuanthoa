"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Eraser,
  Flag,
  Flame,
  Headphones,
  Lightbulb,
  Loader2,
  LogIn,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  Trophy,
  TriangleAlert,
  Volume2,
  X,
} from "lucide-react";
import { Breadcrumb, Card, PageBanner, SakuraBranch } from "../site";
import { avatar } from "../ui";
import { CatMascot, SpeechBubble, ToriiArt } from "./Mascot";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import {
  BLANK_RE,
  LETTERS,
  parseScene,
  plainJa,
  speakJa,
  type AttemptResult,
  type Feedback,
  type PlayQuestion,
  type QuizDetail,
  type ReviewItem,
  type Scene,
} from "./types";

const ease = [0.22, 1, 0.36, 1] as const;
const XP_PER = 10;

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const RUBY = "[&_ruby]:[ruby-position:over] [&_rt]:text-[0.38em] [&_rt]:font-medium [&_rt]:tracking-wider [&_rt]:text-ink/70";

/** HTML câu hỏi (furigana) + chèn phần tử chỗ trống vào vị trí "＿＿＿". */
export function PromptHtml({ html, blank, className = "" }: { html: string; blank?: React.ReactNode; className?: string }) {
  const parts = html.split(BLANK_RE);
  return (
    <span className={`${RUBY} ${className}`}>
      {parts.map((p, i) => (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: p }} />
          {i < parts.length - 1 && (blank ?? <span className="mx-1 inline-block min-w-[3em] border-b-2 border-ink/60" />)}
        </span>
      ))}
    </span>
  );
}

/** HTML từ trình soạn thảo; bỏ <p> bao ngoài khi chỉ có một đoạn để hiển thị inline. */
const unwrap = (html: string) => {
  const m = html.trim().match(/^<p>([\s\S]*)<\/p>$/);
  return m && !m[1].includes("<p") ? m[1] : html;
};
const Html = ({ html, className = "" }: { html: string; className?: string }) => (
  <span className={`${RUBY} ${className}`} dangerouslySetInnerHTML={{ __html: unwrap(html) }} />
);

const optionText = (q: PlayQuestion, key: string) => q.options.find((o) => o.key === key)?.text ?? key;

export default function QuizPlayer({ slug }: { slug: string }) {
  const { user, loading: authLoading, refresh } = useAuth();
  const { data, error, loading } = useApi<QuizDetail>(`/public/quizzes/${slug}`);

  if (loading || authLoading)
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
        <div className="h-24 animate-pulse rounded-3xl bg-ink/[.04]" />
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_385px]">
          <div className="h-[520px] animate-pulse rounded-3xl bg-ink/[.04]" />
          <div className="h-[420px] animate-pulse rounded-3xl bg-ink/[.04]" />
        </div>
      </div>
    );
  if (error || !data)
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-4 pt-24 text-center">
        <TriangleAlert className="size-10 text-brand-400" />
        <h1 className="text-xl font-extrabold">{error?.status === 404 ? "Không tìm thấy bài tập" : "Không tải được bài tập"}</h1>
        <p className="text-sm text-muted">{error?.message ?? "Vui lòng thử lại sau."}</p>
        <Link href="/bai-tap" className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white">
          Về trang Bài tập
        </Link>
      </div>
    );
  if (!data.questions.length)
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-4 pt-24 text-center">
        <h1 className="text-xl font-extrabold">{data.quiz.title}</h1>
        <p className="text-sm text-muted">Bài này chưa có câu hỏi.</p>
      </div>
    );
  return <Player key={`${data.quiz.id}-${user?.id ?? "guest"}`} data={data} loggedIn={!!user} userXp={user?.xp ?? 0} onFinished={refresh} />;
}

/* ------------------------------------------------------------------ */

function Player({ data, loggedIn, userXp, onFinished }: { data: QuizDetail; loggedIn: boolean; userXp: number; onFinished: () => void }) {
  const { quiz, questions } = data;
  const TOTAL = questions.length;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [starting, setStarting] = useState(loggedIn);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [savedOpen, setSavedOpen] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  const [marks, setMarks] = useState<Set<number>>(new Set());
  const [seconds, setSeconds] = useState(0);
  const [detail, setDetail] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(quiz.bookmarked);
  const startedRef = useRef(false);
  const secondsRef = useRef(0);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  /** Bắt đầu / tiếp tục lượt làm khi đã đăng nhập. */
  const start = useCallback(
    (fresh = false) => {
      setStarting(true);
      return api<{ id: string; durationSec: number; resumed: boolean; answers: (Partial<Feedback> & { questionId: string; answer: string })[] }>(
        `/me/quizzes/${quiz.id}/attempts`,
        { body: { fresh } },
      )
        .then((r) => {
          setAttemptId(r.id);
          const a: Record<string, string> = {};
          const f: Record<string, Feedback> = {};
          const so: Record<string, boolean> = {};
          for (const x of r.answers) {
            a[x.questionId] = x.answer;
            if (x.correctAnswer !== undefined) f[x.questionId] = x as Feedback;
            else so[x.questionId] = true;
          }
          setAnswers(a);
          setFeedback(f);
          setSavedOpen(so);
          setSeconds(r.durationSec);
          secondsRef.current = r.durationSec;
          const firstOpen = questions.findIndex((q) => !a[q.id]);
          setCurrent(firstOpen < 0 ? TOTAL - 1 : firstOpen);
          if (r.resumed && r.answers.length) flash(`Tiếp tục bài đang làm — đã trả lời ${r.answers.length}/${TOTAL} câu.`);
        })
        .catch((e: ApiError) => flash(e.message))
        .finally(() => setStarting(false));
    },
    [quiz.id, questions, TOTAL, flash],
  );

  useEffect(() => {
    if (!loggedIn || startedRef.current) return;
    startedRef.current = true;
    void start(false);
  }, [loggedIn, start]);

  useEffect(() => {
    if (result || starting) return;
    const id = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [result, starting]);

  const q = questions[current];
  const isAnswered = (x: PlayQuestion) => (x.type === "mcq" ? !!feedback[x.id] : !!answers[x.id]?.trim());
  const answered = questions.filter(isAnswered).length;
  const correctCount = questions.filter((x) => feedback[x.id]?.correct).length;
  const xp = result ? result.xp : correctCount * XP_PER;
  const reviewOf = (id: string) => result?.review.find((r) => r.questionId === id) ?? null;

  let streak = 0;
  let run = 0;
  questions.forEach((x) => {
    run = feedback[x.id]?.correct ? run + 1 : 0;
    streak = Math.max(streak, run);
  });

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= TOTAL || i === current) return;
      setDir(i > current ? 1 : -1);
      setCurrent(i);
      setDetail(false);
    },
    [current, TOTAL],
  );

  const choose = useCallback(
    async (key: string) => {
      if (!q || q.type !== "mcq" || answers[q.id] || result) return;
      setAnswers((p) => ({ ...p, [q.id]: key }));
      try {
        const fb = attemptId
          ? await api<Feedback>(`/me/attempts/${attemptId}`, { method: "PATCH", body: { questionId: q.id, answer: key, durationSec: secondsRef.current } })
          : await api<Feedback>(`/public/quizzes/${quiz.id}/check`, { body: { questionId: q.id, answer: key } });
        setFeedback((p) => ({ ...p, [q.id]: fb }));
      } catch (e) {
        setAnswers((p) => {
          const n = { ...p };
          delete n[q.id];
          return n;
        });
        flash((e as Error).message);
      }
    },
    [q, answers, result, attemptId, quiz.id, flash],
  );

  const saveOpen = useCallback(
    async (qid: string, value: string) => {
      setAnswers((p) => ({ ...p, [qid]: value }));
      if (!attemptId || !value.trim()) return;
      try {
        await api(`/me/attempts/${attemptId}`, { method: "PATCH", body: { questionId: qid, answer: value, durationSec: secondsRef.current } });
        setSavedOpen((p) => ({ ...p, [qid]: true }));
      } catch (e) {
        flash((e as Error).message);
      }
    },
    [attemptId, flash],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showResult) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const k = e.key.toLowerCase();
      const idx = ["a", "b", "c", "d"].indexOf(k);
      const num = ["1", "2", "3", "4"].indexOf(k);
      if ((idx >= 0 || num >= 0) && q?.type === "mcq") {
        const opt = q.options[idx >= 0 ? idx : num];
        if (opt) void choose(opt.key);
      } else if (e.key === "ArrowRight") go(current + 1);
      else if (e.key === "ArrowLeft") go(current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, go, current, showResult, q]);

  const toggleMark = () =>
    setMarks((prev) => {
      const next = new Set(prev);
      if (next.has(current)) next.delete(current);
      else next.add(current);
      return next;
    });

  const toggleBookmark = async () => {
    if (!loggedIn) return flash("Đăng nhập để lưu bài tập này nhé.");
    try {
      const r = await api<{ bookmarked: boolean }>(`/me/quizzes/${quiz.id}/bookmark`, { method: "POST" });
      setBookmarked(r.bookmarked);
      flash(r.bookmarked ? "Đã lưu bài tập." : "Đã bỏ lưu bài tập.");
    } catch (e) {
      flash((e as Error).message);
    }
  };

  /** Nộp bài: đã đăng nhập → API chấm (AI cho câu tự luận); khách → tự tính phần trắc nghiệm. */
  const submit = async () => {
    if (result) return setShowResult(true);
    if (submitting) return;
    setSubmitting(true);
    try {
      if (attemptId) {
        // lưu các câu tự luận chưa lưu
        for (const x of questions)
          if (x.type !== "mcq" && answers[x.id]?.trim() && !savedOpen[x.id])
            await api(`/me/attempts/${attemptId}`, { method: "PATCH", body: { questionId: x.id, answer: answers[x.id] } });
        const r = await api<AttemptResult>(`/me/attempts/${attemptId}/submit`, { body: { durationSec: secondsRef.current } });
        setResult(r);
        onFinished();
      } else {
        setResult(localResult());
      }
      setShowResult(true);
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  function localResult(): AttemptResult {
    const review: ReviewItem[] = questions.map((x) => {
      const fb = feedback[x.id];
      return {
        questionId: x.id,
        order: x.order,
        type: x.type,
        prompt: x.prompt,
        promptText: plainJa(x.prompt),
        translation: x.translation,
        options: x.options,
        answer: answers[x.id] ?? null,
        correctAnswer: fb?.correctAnswer ?? "",
        correct: !!fb?.correct,
        score: fb?.correct ? x.points : 0,
        points: x.points,
        feedback: x.type === "mcq" ? null : "Đăng nhập để được AI chấm và nhận xét câu tự luận.",
        gradedBy: null,
        explanation: fb?.explanation ?? null,
        explanationLong: fb?.explanationLong ?? null,
      };
    });
    const maxScore = questions.reduce((s, x) => s + x.points, 0);
    const rawScore = review.reduce((s, r) => s + r.score, 0);
    const score = maxScore ? Math.round((rawScore / maxScore) * 100) : 0;
    return {
      attemptId: "",
      quizId: quiz.id,
      quizSlug: quiz.slug,
      quizTitle: quiz.title,
      status: "local",
      score,
      rawScore,
      maxScore,
      accuracy: answered ? Math.round((correctCount / answered) * 100) : 0,
      right: correctCount,
      wrong: answered - correctCount,
      skipped: TOTAL - answered,
      total: TOTAL,
      durationSec: secondsRef.current,
      xp: correctCount * XP_PER,
      passed: score >= quiz.passScore,
      passScore: quiz.passScore,
      feedback: "Kết quả chưa được lưu. Đăng nhập để lưu tiến độ, nhận XP và được AI chấm câu tự luận.",
      aiGraded: false,
      review,
    };
  }

  const restart = async () => {
    setShowResult(false);
    setResult(null);
    setMarks(new Set());
    setDir(-1);
    setDetail(false);
    secondsRef.current = 0;
    setSeconds(0);
    if (loggedIn) {
      await start(true);
      setCurrent(0);
    } else {
      setAnswers({});
      setFeedback({});
      setCurrent(0);
    }
  };

  const crumbSkill = quiz.kind === "jlpt" ? "Bộ đề JLPT" : `Luyện tập ${quiz.skillLabel}`;

  return (
    <>
      <PageBanner
        compact
        aside={
          <div className="relative flex items-end gap-1 pl-4">
            <div className="mb-16">
              <SpeechBubble />
            </div>
            <CatMascot className="w-36 drop-shadow-lg" />
          </div>
        }
      >
        <Breadcrumb
          items={[
            { label: "Bài tập", href: "/bai-tap" },
            { label: crumbSkill, href: quiz.kind === "jlpt" ? "/bai-tap#jlpt" : `/bai-tap?skill=${quiz.skill}#chu-de` },
            { label: quiz.level },
          ]}
        />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="flex items-center gap-4">
          <motion.span
            whileHover={{ rotate: -10, scale: 1.05 }}
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-3xl text-brand-500 shadow-md shadow-brand-500/15 sm:size-16"
          >
            {quiz.emoji && !quiz.icon?.startsWith("http") ? quiz.emoji : <Eraser className="size-8" />}
          </motion.span>
          <div className="min-w-0">
            <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-4xl">{quiz.title}</h1>
            <p className="mt-1 line-clamp-2 text-sm text-muted sm:text-lg">{quiz.description ?? "Củng cố kiến thức, làm bài tập và tiến bộ mỗi ngày"}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-end lg:hidden">
            <CatMascot className="w-14" />
          </div>
        </motion.div>
      </PageBanner>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {!loggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100"
          >
            <LogIn className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">Bạn đang luyện tập ở chế độ khách — kết quả sẽ không được lưu và câu tự luận không được chấm.</span>
            <Link
              href={`/dang-nhap?next=${encodeURIComponent(`/bai-tap/${quiz.slug}`)}`}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              Đăng nhập để lưu kết quả
            </Link>
          </motion.div>
        )}

        <StatsBar
          current={current}
          total={TOTAL}
          answered={answered}
          seconds={seconds}
          streak={streak}
          xp={xp}
          userXp={userXp}
          level={quiz.level}
          icon={quiz.skill === "listening" ? <Headphones className="size-6" /> : <PenLine className="size-6" />}
        />

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_385px] [&>*]:min-w-0">
          {/* ---------------- Câu hỏi ---------------- */}
          <Card className="relative overflow-hidden p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-500">
                  <Flame className="size-3.5 fill-brand-500" /> {quiz.kind === "jlpt" ? "JLPT" : quiz.skillLabel} {quiz.level}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-ink/[0.04] px-2.5 py-1 text-[11px] text-muted">
                  <PenLine className="size-3" /> Câu {current + 1}
                  {q.type !== "mcq" && <> · {q.type === "essay" ? "Tự luận" : "Trả lời ngắn"} ({q.points} điểm)</>}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-ink/70">
                <button onClick={toggleMark} className="flex items-center gap-1.5 transition hover:text-brand-500">
                  <Bookmark className={`size-4 ${marks.has(current) ? "fill-amber-400 text-amber-500" : ""}`} />
                  {marks.has(current) ? "Đã đánh dấu" : "Đánh dấu"}
                </button>
                <ReportButton questionId={q.id} loggedIn={loggedIn} onDone={flash} />
              </div>
            </div>

            {starting ? (
              <div className="grid min-h-[360px] place-items-center text-sm text-muted">
                <span className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-brand-500" /> Đang tải bài làm của bạn…
                </span>
              </div>
            ) : (
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={current}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -40 }}
                  transition={{ duration: 0.35, ease }}
                >
                  <QuestionBody
                    q={q}
                    level={quiz.level}
                    skill={quiz.skill}
                    picked={answers[q.id] ?? null}
                    fb={feedback[q.id] ?? null}
                    review={reviewOf(q.id)}
                    locked={!!result}
                    onPick={choose}
                    onSaveOpen={saveOpen}
                    savedOpen={!!savedOpen[q.id]}
                    loggedIn={loggedIn}
                    detail={detail}
                    setDetail={setDetail}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => go(current - 1)}
                disabled={current === 0}
                className="flex h-11 items-center gap-2 rounded-xl border border-ink/10 px-5 text-sm font-semibold transition hover:border-brand-300 hover:text-brand-500 disabled:opacity-40 sm:w-[150px]"
              >
                <ArrowLeft className="size-4" /> Câu trước
              </motion.button>
              {current < TOTAL - 1 ? (
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => go(current + 1)}
                  className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 sm:w-[200px]"
                >
                  Câu tiếp theo <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={submit}
                  disabled={submitting || starting}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 disabled:opacity-60 sm:w-[200px]"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />} {result ? "Xem kết quả" : "Nộp bài"}
                </motion.button>
              )}
            </div>

            <AnimatePresence>
              {toast && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-x-4 top-4 z-20 rounded-xl bg-ink px-4 py-2.5 text-center text-xs font-medium text-white shadow-xl"
                >
                  {toast}
                </motion.p>
              )}
            </AnimatePresence>
          </Card>

          {/* ---------------- Cột phải ---------------- */}
          <div className="space-y-5">
            <QuestionGrid
              questions={questions}
              feedback={feedback}
              answers={answers}
              result={result}
              current={current}
              marks={marks}
              onJump={go}
              onSubmit={submit}
              submitting={submitting}
              remaining={TOTAL - answered}
              bookmarked={bookmarked}
              onBookmark={toggleBookmark}
            />
            {data.related && <ListeningCard related={data.related} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showResult && result && (
          <ResultModal
            result={result}
            quizTitle={quiz.title}
            loggedIn={loggedIn}
            slug={quiz.slug}
            onClose={() => setShowResult(false)}
            onRestart={restart}
            onReview={(i) => {
              setShowResult(false);
              go(i);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ReportButton({ questionId, loggedIn, onDone }: { questionId: string; loggedIn: boolean; onDone: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const r = await api<{ message: string }>("/me/reports", { body: { targetType: "question", targetId: questionId, content: text } });
      onDone(r.message);
      setOpen(false);
      setText("");
    } catch (e) {
      onDone((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="relative">
      <button
        onClick={() => (loggedIn ? setOpen((o) => !o) : onDone("Đăng nhập để gửi báo lỗi câu hỏi nhé."))}
        className="flex items-center gap-1.5 transition hover:text-brand-500"
      >
        <TriangleAlert className="size-4" /> Báo lỗi
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-7 z-30 w-72 rounded-xl border border-ink/10 bg-white p-3 shadow-xl"
          >
            <p className="text-xs font-semibold text-ink">Câu hỏi này có lỗi gì?</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="VD: đáp án sai, thiếu furigana, lỗi chính tả…"
              className="mt-2 w-full rounded-lg border border-ink/10 p-2 text-xs outline-none focus:border-brand-300"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-ink/5">
                Huỷ
              </button>
              <button
                onClick={send}
                disabled={busy || text.trim().length < 5}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Gửi báo lỗi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */

function StatsBar({
  current,
  total,
  answered,
  seconds,
  streak,
  xp,
  userXp,
  level,
  icon,
}: {
  current: number;
  total: number;
  answered: number;
  seconds: number;
  streak: number;
  xp: number;
  userXp: number;
  level: string;
  icon: React.ReactNode;
}) {
  const pct = Math.round((answered / total) * 100);
  const sum = userXp + xp;
  const goal = Math.max(500, Math.ceil((sum + 1) / 500) * 500);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease }}>
      <Card className="grid grid-cols-3 items-center gap-x-2 gap-y-4 p-4 shadow-lg shadow-ink/5 lg:flex lg:gap-0 lg:p-3 lg:pl-5">
        <div className="col-span-3 flex items-center gap-4 lg:flex-[1.6] lg:pr-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-500">{icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              Câu {current + 1}/{total}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
                <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
              </div>
              <span className="w-9 text-right text-xs text-muted">{pct}%</span>
            </div>
          </div>
        </div>
        <Stat icon={<AlarmClock className="size-7 text-brand-500" />} label="Thời gian" value={<span className="tabular-nums">{fmt(seconds)}</span>} />
        <Stat
          icon={
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <Flame className="size-7 fill-orange-400 text-orange-500" />
            </motion.span>
          }
          label="Chuỗi đúng"
          value={
            <>
              <span className="text-orange-500">{streak}</span> câu
            </>
          }
        />
        <Stat
          icon={<Crown className="size-7 fill-amber-300 text-amber-500" />}
          label="Điểm hiện tại"
          value={
            <motion.span key={xp} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="inline-block text-brand-500">
              +{xp} <span className="text-sm">XP</span>
            </motion.span>
          }
        />
        <div className="col-span-3 flex items-center gap-3 rounded-xl bg-gradient-to-r from-brand-50 to-[#fff6f0] p-2.5 lg:ml-4 lg:w-[300px] lg:flex-none">
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-md ring-4 ring-amber-100"
          >
            <Star className="size-6 fill-white text-white" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">{level} Explorer</p>
            <p className="text-xs">
              <span className="font-bold text-brand-500">{sum.toLocaleString("vi-VN")}</span> <span className="text-muted">/ {goal.toLocaleString("vi-VN")} XP</span>
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
              <motion.div animate={{ width: `${Math.min(100, ((sum % 500) / 500) * 100 || (sum ? 100 : 0))}%` }} transition={{ duration: 0.8, ease }} className="h-full rounded-full bg-brand-500" />
            </div>
          </div>
          <Link href="/dashboard" aria-label="Xem tiến độ" className="grid size-7 shrink-0 place-items-center rounded-full bg-white shadow-sm">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left lg:border-l lg:border-ink/5 lg:px-5">
      {icon}
      <div>
        <p className="text-[11px] text-muted">{label}</p>
        <p className="text-lg font-extrabold leading-tight sm:text-xl">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const HINT_LABEL: Record<string, string> = {
  grammar: "Gợi ý ngữ pháp",
  vocab: "Gợi ý từ vựng",
  kanji: "Gợi ý Kanji",
  listening: "Gợi ý nghe",
  communication: "Gợi ý giao tiếp",
  reading: "Gợi ý đọc hiểu",
  jlpt: "Gợi ý",
};

function QuestionBody({
  q,
  level,
  skill,
  picked,
  fb,
  review,
  locked,
  onPick,
  onSaveOpen,
  savedOpen,
  loggedIn,
  detail,
  setDetail,
}: {
  q: PlayQuestion;
  level: string;
  skill: string;
  picked: string | null;
  fb: Feedback | null;
  review: ReviewItem | null;
  locked: boolean;
  onPick: (key: string) => void;
  onSaveOpen: (qid: string, v: string) => void;
  savedOpen: boolean;
  loggedIn: boolean;
  detail: boolean;
  setDetail: (v: boolean) => void;
}) {
  const done = !!fb;
  const right = !!fb?.correct;
  const [talking, setTalking] = useState(false);
  const scene = parseScene(q.scene);
  const hasHint = !!(q.hint && (q.hint.title || q.hint.body));

  const say = () => {
    const text = q.audioText || plainJa(q.prompt, done && fb ? optionText(q, fb.correctAnswer) : "、");
    const u = speakJa(text);
    if (!u) return;
    setTalking(true);
    u.onend = () => setTalking(false);
    u.onerror = () => setTalking(false);
  };

  const blank = (
    <span className="relative mx-1 inline-block min-w-[3.2em] border-b-[3px] border-ink/70 px-1 text-center align-baseline sm:min-w-[3.6em]">
      <AnimatePresence>
        {done && fb && (
          <motion.span initial={{ opacity: 0, y: -14, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={right ? "text-emerald-600" : "text-brand-500"}>
            <Html html={optionText(q, fb.correctAnswer)} />
          </motion.span>
        )}
      </AnimatePresence>
      {!done && <span className="invisible">ああ</span>}
    </span>
  );
  const long = q.prompt.length > 160 || q.prompt.includes("<p");

  return (
    <div className="pt-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={say}
          aria-label="Nghe câu hỏi"
          className="relative mt-4 grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-500 sm:size-11"
        >
          {talking && <span className="absolute inset-0 animate-ping rounded-full bg-brand-200" />}
          <Volume2 className="relative size-5" />
        </motion.button>
        <div className="min-w-0">
          <p className={`font-jp font-bold tracking-wide ${long ? "text-lg leading-[2.1] sm:text-xl [&_p]:mb-2" : "text-2xl leading-[2.2] sm:text-[2rem]"}`}>
            <PromptHtml html={q.prompt} blank={q.type === "mcq" ? blank : undefined} />
          </p>
          {q.translation && (!q.audioText || done || locked) && <p className="mt-1 text-base text-ink/70 sm:text-xl">{q.translation}</p>}
        </div>
      </div>

      {q.audioText && <AudioBar text={q.audioText} reveal={done || locked} />}

      {(scene || hasHint) && (
        <div className={`mt-4 grid gap-4 md:pl-14 ${scene && hasHint ? "md:grid-cols-[1.15fr_1fr]" : ""}`}>
          {scene && ("emoji" in scene ? <EmojiScene emoji={scene.emoji} /> : <SceneArt s={scene} />)}
          {hasHint && q.hint && (
            <div className="rounded-2xl bg-brand-50/80 p-4 ring-1 ring-brand-100">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-brand-500 shadow-sm">
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
                    <Lightbulb className="size-4 fill-amber-300 text-brand-500" />
                  </motion.span>
                  {HINT_LABEL[skill] ?? "Gợi ý"}
                </span>
                <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-500">{level}</span>
              </div>
              {q.hint.title && <p className="mt-3 text-sm font-semibold">{q.hint.title}</p>}
              {q.hint.body && <Html html={q.hint.body} className="mt-1.5 block text-[13px] leading-relaxed text-ink/75" />}
              {q.hint.exampleJa && (
                <div className="mt-3 rounded-xl bg-white/80 p-3">
                  <p className="text-[11px] font-semibold text-brand-500">Ví dụ:</p>
                  <p className="mt-1 font-jp text-sm leading-[2.2]">
                    <Html html={q.hint.exampleJa} />
                  </p>
                  {q.hint.exampleVi && <p className="text-xs text-muted">{q.hint.exampleVi}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {q.type === "mcq" ? (
        <>
          <div className="mt-4 space-y-2.5">
            {q.options.map((o, i) => {
              const isAns = done && o.key === fb?.correctAnswer;
              const isPick = o.key === picked;
              const pending = isPick && !done;
              const tone = pending
                ? "border-brand-300 bg-brand-50/60"
                : !done
                  ? "border-ink/10 bg-white hover:border-brand-300 hover:bg-brand-50/40"
                  : isAns
                    ? "border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-100"
                    : isPick
                      ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                      : "border-ink/10 bg-white opacity-70";
              return (
                <motion.button
                  key={o.key}
                  onClick={() => onPick(o.key)}
                  disabled={done || !!picked || locked}
                  whileHover={done ? undefined : { x: 4 }}
                  whileTap={done ? undefined : { scale: 0.99 }}
                  animate={done && isPick && !isAns ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`flex w-full items-center gap-4 rounded-xl border px-3 py-2.5 text-left transition-colors sm:px-4 ${tone}`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
                      done && isAns ? "bg-emerald-500 text-white" : done && isPick ? "bg-brand-500 text-white" : "bg-ink/[0.05] text-ink"
                    }`}
                  >
                    {pending ? <Loader2 className="size-4 animate-spin" /> : LETTERS[i] ?? o.key}
                  </span>
                  <span className="flex-1 font-jp text-lg font-medium leading-[2]">
                    <Html html={o.text} />
                  </span>
                  {done && isAns && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid size-7 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-4" strokeWidth={3} />
                    </motion.span>
                  )}
                  {done && isPick && !isAns && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid size-7 place-items-center rounded-full bg-brand-500 text-white">
                      <X className="size-4" strokeWidth={3} />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {done && fb && (
              <motion.div
                initial={{ opacity: 0, y: 14, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease }}
                className="overflow-hidden"
              >
                <div className={`mt-3 rounded-xl p-3 sm:p-4 ${right ? "bg-emerald-50" : "bg-brand-50"}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <motion.span
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 14 }}
                      className={`grid size-10 shrink-0 place-items-center rounded-full text-white ${right ? "bg-emerald-500" : "bg-brand-500"}`}
                    >
                      {right ? <Check className="size-6" strokeWidth={3} /> : <X className="size-6" strokeWidth={3} />}
                    </motion.span>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className={`font-bold ${right ? "text-emerald-600" : "text-brand-500"}`}>{right ? "Chính xác! 🎉" : "Chưa đúng rồi! 😢"}</p>
                      <p className="text-xs text-ink/70">
                        {!right && (
                          <>
                            Đáp án đúng là{" "}
                            <b>
                              {fb.correctAnswer}. <Html html={optionText(q, fb.correctAnswer)} />
                            </b>
                            .{" "}
                          </>
                        )}
                        {fb.explanation && <Html html={fb.explanation} />}
                      </p>
                    </div>
                    {right && (
                      <motion.span
                        initial={{ scale: 0, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-500 shadow-sm"
                      >
                        <Star className="size-3.5 fill-amber-400" /> +{XP_PER * q.points} XP
                      </motion.span>
                    )}
                    {(fb.explanationLong || q.prompt.match(BLANK_RE)) && (
                      <button
                        onClick={() => setDetail(!detail)}
                        aria-expanded={detail}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-semibold transition hover:border-brand-300"
                      >
                        Giải thích chi tiết
                        <ChevronDown className={`size-4 transition-transform ${detail ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  <AnimatePresence initial={false}>
                    {detail && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 rounded-lg bg-white p-3 text-[13px] leading-relaxed text-ink/80">
                          {BLANK_RE.test(q.prompt) && (
                            <p className="font-jp text-base">
                              <PromptHtml html={q.prompt} blank={<b className="text-emerald-600"><Html html={optionText(q, fb.correctAnswer)} /></b>} />
                            </p>
                          )}
                          {fb.explanationLong && <Html html={fb.explanationLong} className="mt-2 block" />}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <OpenAnswer q={q} value={picked ?? ""} review={review} locked={locked} saved={savedOpen} loggedIn={loggedIn} onSave={onSaveOpen} />
      )}
    </div>
  );
}

/** Câu trả lời ngắn / tự luận: ô nhập + (sau khi nộp) điểm và nhận xét AI. */
function OpenAnswer({
  q,
  value,
  review,
  locked,
  saved,
  loggedIn,
  onSave,
}: {
  q: PlayQuestion;
  value: string;
  review: ReviewItem | null;
  locked: boolean;
  saved: boolean;
  loggedIn: boolean;
  onSave: (qid: string, v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft !== value || (!saved && !!draft.trim());
  const essay = q.type === "essay";
  return (
    <div className="mt-4 md:pl-14">
      <label className="text-xs font-semibold text-ink/70">{essay ? "Bài viết của bạn (tiếng Nhật)" : "Câu trả lời của bạn"}</label>
      {essay ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== value && onSave(q.id, draft)}
          disabled={locked}
          rows={6}
          placeholder="Nhập câu trả lời bằng tiếng Nhật…"
          className="mt-1.5 w-full rounded-xl border border-ink/10 bg-white p-3 font-jp text-base leading-relaxed outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100 disabled:bg-ink/[.03]"
        />
      ) : (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== value && onSave(q.id, draft)}
          onKeyDown={(e) => e.key === "Enter" && onSave(q.id, draft)}
          disabled={locked}
          placeholder="Gõ kana, kanji hoặc romaji…"
          className="mt-1.5 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-jp text-lg outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100 disabled:bg-ink/[.03]"
        />
      )}
      {!locked && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <span>{loggedIn ? "Câu này được chấm (AI) sau khi nộp bài." : "Đăng nhập để được AI chấm câu này."}</span>
          <button
            onClick={() => onSave(q.id, draft)}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-500 transition hover:bg-brand-50 disabled:opacity-40"
          >
            {saved && !dirty ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
            {saved && !dirty ? "Đã lưu" : "Lưu câu trả lời"}
          </button>
        </div>
      )}
      {review && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 rounded-xl p-3 sm:p-4 ${review.correct ? "bg-emerald-50" : "bg-amber-50"}`}>
          <div className="flex flex-wrap items-center gap-2">
            {review.gradedBy === "ai" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-violet-600 shadow-sm">
                <Sparkles className="size-3.5" /> AI nhận xét
              </span>
            ) : review.gradedBy === "manual" ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-sky-600 shadow-sm">Giáo viên chấm</span>
            ) : (
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink/60 shadow-sm">Chấm tự động</span>
            )}
            <span className={`text-sm font-extrabold ${review.correct ? "text-emerald-600" : "text-amber-600"}`}>
              {review.score}/{review.points} điểm
            </span>
          </div>
          {review.feedback && <p className="mt-2 text-sm leading-relaxed text-ink/80">{review.feedback}</p>}
          {review.correctAnswer && (
            <p className="mt-2 text-xs text-ink/70">
              <b>{essay ? "Bài mẫu:" : "Đáp án:"}</b> <span className="font-jp">{review.correctAnswer.split(/\s*\|\s*/).join(" / ")}</span>
            </p>
          )}
          {review.explanation && <Html html={review.explanation} className="mt-1 block text-xs text-muted" />}
        </motion.div>
      )}
    </div>
  );
}

const WAVE = [6, 10, 16, 9, 20, 13, 24, 11, 18, 8, 22, 14, 26, 12, 17, 9, 21, 15, 10, 19, 7, 14, 11, 6];
const SPEEDS = [1, 1.25, 0.75];

/** Thanh phát audio (giọng đọc ja-JP) cho câu nghe hiểu. */
function AudioBar({ text, reveal }: { text: string; reveal: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [script, setScript] = useState(false);
  const play = () => {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    const u = speakJa(text, 0.9 * SPEEDS[speed]);
    if (!u) return;
    setPlaying(true);
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
  };
  return (
    <div className="mt-4 md:pl-14">
      <div className="flex items-center gap-2 rounded-xl border border-ink/5 bg-ink/[0.02] p-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={play}
          aria-label={playing ? "Tạm dừng" : "Phát"}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-500/30"
        >
          {playing ? <Pause className="size-4 fill-white" /> : <Play className="ml-0.5 size-4 fill-white" />}
        </motion.button>
        <div className="flex h-8 min-w-0 flex-1 items-center gap-[2px] overflow-hidden">
          {WAVE.map((h, i) => (
            <motion.span
              key={i}
              className={`w-[3px] shrink-0 rounded-full ${playing ? "bg-brand-500" : "bg-ink/25"}`}
              animate={playing ? { height: [h * 0.4, h, h * 0.6] } : { height: h * 0.8 }}
              transition={playing ? { duration: 0.5, repeat: Infinity, repeatType: "mirror", delay: (i % 5) * 0.08 } : {}}
            />
          ))}
        </div>
        <button onClick={() => setSpeed((s) => (s + 1) % SPEEDS.length)} className="shrink-0 rounded-md px-1.5 py-1 text-[11px] font-bold transition hover:bg-white">
          {SPEEDS[speed].toFixed(SPEEDS[speed] % 1 ? 2 : 1)}x
        </button>
        {reveal && (
          <button onClick={() => setScript((v) => !v)} className="shrink-0 rounded-md border border-ink/10 bg-white px-2 py-1 text-[11px] font-medium">
            {script ? "Ẩn" : "Hiện"} transcript
          </button>
        )}
      </div>
      {reveal && script && <p className="mt-2 rounded-lg bg-brand-50/70 p-2.5 font-jp text-sm leading-relaxed">{text}</p>}
    </div>
  );
}

function EmojiScene({ emoji }: { emoji: string }) {
  return (
    <div className="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 md:aspect-auto md:min-h-[200px]">
      {[14, 40, 66, 86].map((l, i) => (
        <motion.span
          key={l}
          className="absolute size-10 rounded-full bg-white/70 blur-md"
          style={{ left: `${l}%`, top: `${12 + (i % 2) * 50}%` }}
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity }}
        />
      ))}
      <motion.span animate={{ y: [0, -8, 0], rotate: [0, -4, 4, 0] }} transition={{ duration: 3, repeat: Infinity }} className="relative text-7xl drop-shadow-lg sm:text-8xl">
        {emoji}
      </motion.span>
    </div>
  );
}

/** Minh họa tình huống: nền gradient + biển hiệu + 2 nhân vật + đạo cụ emoji. */
function SceneArt({ s }: { s: Scene }) {
  const lights = [12, 26, 41, 58, 72, 86];
  return (
    <div className={`relative aspect-[16/9] overflow-hidden rounded-2xl bg-gradient-to-br ${s.bg} md:aspect-auto md:min-h-[215px]`}>
      {lights.map((l, i) => (
        <motion.span
          key={l}
          className="absolute size-10 rounded-full bg-white/40 blur-md"
          style={{ left: `${l}%`, top: `${10 + (i % 3) * 14}%` }}
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute right-4 top-4 rounded-lg border border-white/50 bg-white/15 px-3 py-1 text-xs font-extrabold tracking-[0.2em] text-white shadow-[0_0_18px_rgba(255,255,255,.55)] backdrop-blur-sm"
      >
        {s.sign}
      </motion.span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatar(s.seeds[0], "transparent")} alt="" className="absolute bottom-0 left-[8%] h-[88%] drop-shadow-xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatar(s.seeds[1], "transparent")} alt="" className="absolute bottom-0 right-[10%] h-[92%] -scale-x-100 drop-shadow-xl" />
      {s.props.map((p, i) => (
        <motion.span
          key={p}
          className="absolute text-4xl drop-shadow-lg"
          style={{ left: i === 0 ? "36%" : "56%", bottom: i === 0 ? "8%" : "12%" }}
          animate={{ y: [0, -6, 0], rotate: [0, i ? 6 : -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4 }}
        >
          {p}
        </motion.span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuestionGrid({
  questions,
  feedback,
  answers,
  result,
  current,
  marks,
  onJump,
  onSubmit,
  submitting,
  remaining,
  bookmarked,
  onBookmark,
}: {
  questions: PlayQuestion[];
  feedback: Record<string, Feedback>;
  answers: Record<string, string>;
  result: AttemptResult | null;
  current: number;
  marks: Set<number>;
  onJump: (i: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  remaining: number;
  bookmarked: boolean;
  onBookmark: () => void;
}) {
  const hasOpen = questions.some((q) => q.type !== "mcq");
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">Danh sách câu hỏi</h2>
        <button onClick={onBookmark} className="flex items-center gap-1 text-[11px] font-semibold text-ink/60 hover:text-brand-500" aria-pressed={bookmarked}>
          <Bookmark className={`size-4 ${bookmarked ? "fill-brand-500 text-brand-500" : ""}`} /> {bookmarked ? "Đã lưu bài" : "Lưu bài"}
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink/70">
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full bg-emerald-500" /> Đã trả lời đúng
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full bg-brand-500" /> Đã trả lời sai
        </li>
        {hasOpen && (
          <li className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-full bg-sky-400" /> Đã làm (chờ chấm)
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-ink/20 bg-white" /> Chưa làm
        </li>
        <li className="flex items-center gap-1.5">
          <Bookmark className="size-3.5 fill-amber-400 text-amber-500" /> Đã đánh dấu
        </li>
      </ul>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {questions.map((q, i) => {
          const isCur = i === current;
          const rv = result?.review.find((r) => r.questionId === q.id);
          const graded = q.type === "mcq" ? feedback[q.id] : rv?.answer ? rv : null;
          const ok = !!graded?.correct;
          const bad = !!graded && !ok;
          const pending = !graded && !!answers[q.id]?.trim();
          const tone = isCur
            ? "border-2 border-brand-500 bg-white text-ink"
            : ok
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : bad
                ? "border-brand-100 bg-brand-50 text-brand-600"
                : pending
                  ? "border-sky-100 bg-sky-50 text-sky-700"
                  : "border-ink/5 bg-ink/[0.03] text-ink/80 hover:border-brand-200";
          return (
            <motion.button
              key={q.id}
              layout
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onJump(i)}
              aria-label={`Câu ${i + 1}`}
              aria-current={isCur}
              className={`relative h-10 rounded-lg border text-sm font-semibold transition-colors ${tone}`}
            >
              {i + 1}
              {ok && !isCur && <span className="absolute right-1 top-1 size-2 rounded-sm bg-emerald-500" />}
              {pending && !isCur && <span className="absolute right-1 top-1 size-2 rounded-sm bg-sky-400" />}
              {bad && !isCur && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -bottom-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-brand-500 text-white ring-2 ring-white">
                  <X className="size-2.5" strokeWidth={4} />
                </motion.span>
              )}
              {isCur && (
                <span
                  className={`absolute -bottom-1.5 -right-1.5 grid size-4 place-items-center rounded-full text-white ring-2 ring-white ${bad ? "bg-brand-500" : ok ? "bg-emerald-500" : "bg-brand-500"}`}
                >
                  {ok ? <Check className="size-2.5" strokeWidth={4} /> : bad ? <X className="size-2.5" strokeWidth={4} /> : <PenLine className="size-2.5" />}
                </span>
              )}
              {marks.has(i) && <Bookmark className="absolute -top-1 right-2 size-3 fill-amber-400 text-amber-500" />}
            </motion.button>
          );
        })}
      </div>
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSubmit}
        disabled={submitting}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-5 animate-spin" /> : <Flag className="size-5 fill-white" />}
        {submitting ? (hasOpen ? "Đang chấm bài (AI)…" : "Đang chấm bài…") : result ? "Xem kết quả" : "Nộp bài và xem kết quả"}
      </motion.button>

      <div className="relative mt-4 flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-brand-50 via-[#fff3f3] to-brand-50 p-3 ring-1 ring-brand-100">
        <SakuraBranch className="pointer-events-none absolute -right-6 -top-4 w-24 -scale-x-100 opacity-70" />
        <ToriiArt className="relative w-20 shrink-0" />
        <div className="relative">
          <p className="flex items-center gap-1 font-bold text-brand-500">
            {result ? "Đã nộp bài!" : remaining === 0 ? "Hoàn thành rồi!" : "Bạn đang làm rất tốt!"}
            <Sparkles className="size-4 fill-amber-300 text-amber-400" />
          </p>
          <p className="text-xs text-ink/70">
            {result ? (
              "Xem lại từng câu để hiểu rõ phần giải thích nhé."
            ) : remaining === 0 ? (
              "Bấm “Nộp bài” để xem kết quả của bạn nhé."
            ) : (
              <>
                Duy trì phong độ, chỉ còn <b>{remaining}</b> câu nữa thôi là hoàn thành!
              </>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

const CLIP = 6;

function ListeningCard({ related }: { related: NonNullable<QuizDetail["related"]> }) {
  const q = related.question;
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [script, setScript] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const posRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const step = 0.1 * SPEEDS[speed];
    const id = setInterval(() => {
      const next = Math.min(CLIP, posRef.current + step);
      posRef.current = next;
      setPos(next);
      if (next >= CLIP) {
        clearInterval(id);
        setPlaying(false);
      }
    }, 100);
    return () => clearInterval(id);
  }, [playing, speed]);

  const toggle = () => {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    if (posRef.current >= CLIP) {
      posRef.current = 0;
      setPos(0);
    }
    speakJa(q.audioText ?? plainJa(q.prompt), 0.9 * SPEEDS[speed]);
    setPlaying(true);
  };

  const choose = async (key: string) => {
    if (pick) return;
    setPick(key);
    try {
      setFb(await api<Feedback>(`/public/quizzes/${related.quizId}/check`, { body: { questionId: q.id, answer: key } }));
    } catch {
      setPick(null);
    }
  };

  const progress = pos / CLIP;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Headphones className="size-5" /> Luyện nghe liên quan
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-500">{related.level}</span>
        </h2>
        <Link
          href={`/bai-tap/${related.quizSlug}`}
          className="shrink-0 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-500 transition hover:bg-brand-500 hover:text-white"
        >
          Thử sức ngay
        </Link>
      </div>
      <p className="mt-2 text-xs text-muted">{plainJa(q.prompt) || "Nghe và chọn đáp án đúng."}</p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-ink/5 bg-ink/[0.02] p-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggle}
          aria-label={playing ? "Tạm dừng" : "Phát"}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-500/30"
        >
          {playing ? <Pause className="size-4 fill-white" /> : <Play className="ml-0.5 size-4 fill-white" />}
        </motion.button>
        <div className="flex h-8 min-w-0 flex-1 items-center gap-[2px] overflow-hidden">
          {WAVE.map((h, i) => (
            <motion.span
              key={i}
              className={`w-[3px] shrink-0 rounded-full ${i / WAVE.length < progress ? "bg-brand-500" : "bg-ink/25"}`}
              animate={playing ? { height: [h * 0.4, h, h * 0.6] } : { height: h * 0.8 }}
              transition={playing ? { duration: 0.5, repeat: Infinity, repeatType: "mirror", delay: (i % 5) * 0.08 } : {}}
            />
          ))}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted">
          0:{String(Math.floor(pos)).padStart(2, "0")} / 0:0{CLIP}
        </span>
        <button onClick={() => setSpeed((s) => (s + 1) % SPEEDS.length)} className="shrink-0 rounded-md px-1.5 py-1 text-[11px] font-bold transition hover:bg-white">
          {SPEEDS[speed].toFixed(SPEEDS[speed] % 1 ? 2 : 1)}x
        </button>
        <button onClick={() => setScript((v) => !v)} className="hidden shrink-0 rounded-md border border-ink/10 bg-white px-2 py-1 text-[11px] font-medium sm:block">
          {script ? "Ẩn" : "Hiện"} transcript
        </button>
      </div>
      <button onClick={() => setScript((v) => !v)} className="mt-2 text-[11px] font-medium text-brand-500 sm:hidden">
        {script ? "Ẩn" : "Hiện"} transcript
      </button>
      <AnimatePresence>
        {script && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <span className="mt-2 block rounded-lg bg-brand-50/70 p-2.5 font-jp text-xs leading-relaxed">{q.audioText}</span>
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-3 space-y-2">
        {q.options.map((o, i) => {
          const done = !!fb;
          const isAns = done && o.key === fb?.correctAnswer;
          const isPick = o.key === pick;
          return (
            <motion.button
              key={o.key}
              whileHover={done ? undefined : { x: 3 }}
              onClick={() => choose(o.key)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                isAns ? "border-emerald-400 bg-emerald-50/60" : done && isPick ? "border-brand-300 bg-brand-50" : "border-ink/10 hover:border-brand-200"
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  isAns ? "bg-emerald-500 text-white" : done && isPick ? "bg-brand-500 text-white" : "bg-ink/[0.05]"
                }`}
              >
                {LETTERS[i] ?? o.key}
              </span>
              <span className="flex-1 font-jp leading-[2]">
                <Html html={o.text} />
              </span>
              {isAns && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid size-6 place-items-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </motion.span>
              )}
              {done && isPick && !isAns && <X className="size-5 text-brand-500" />}
            </motion.button>
          );
        })}
      </div>
      {pick !== null && (
        <button
          onClick={() => {
            setPick(null);
            setFb(null);
          }}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-muted hover:text-brand-500"
        >
          <RotateCcw className="size-3" /> Làm lại câu nghe
        </button>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function ResultModal({
  result,
  quizTitle,
  loggedIn,
  slug,
  onClose,
  onRestart,
  onReview,
}: {
  result: AttemptResult;
  quizTitle: string;
  loggedIn: boolean;
  slug: string;
  onClose: () => void;
  onRestart: () => void;
  onReview: (index: number) => void;
}) {
  const score = result.score;
  const R = 52;
  const C = 2 * Math.PI * R;
  const verdict = score >= 80 ? "Xuất sắc! 🎉" : score >= 50 ? "Làm tốt lắm! 👏" : "Cố gắng thêm nhé! 💪";
  const open = result.review.filter((r) => r.type !== "mcq" && r.answer);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stats = [
    { l: "Câu đúng", v: result.right, c: "text-emerald-600 bg-emerald-50" },
    { l: "Câu sai", v: result.wrong, c: "text-brand-500 bg-brand-50" },
    { l: "Chưa làm", v: result.skipped, c: "text-ink/70 bg-ink/[0.04]" },
    { l: "Thời gian", v: fmt(result.durationSec), c: "text-sky-600 bg-sky-50" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Kết quả bài làm"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-center shadow-2xl"
      >
        <button onClick={onClose} aria-label="Đóng" className="absolute right-4 top-4 rounded-full p-1 text-ink/50 hover:bg-ink/5">
          <X className="size-5" />
        </button>
        {[...Array(10)].map((_, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute top-24 text-lg"
            style={{ left: "50%" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
            animate={{ x: Math.cos((i / 10) * Math.PI * 2) * 150, y: Math.sin((i / 10) * Math.PI * 2) * 110 - 40, opacity: 0, scale: 1.2 }}
            transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
          >
            {i % 2 ? "🌸" : "✨"}
          </motion.span>
        ))}
        <motion.div
          initial={{ rotate: -20, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", delay: 0.15 }}
          className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-500"
        >
          <Trophy className="size-8 fill-amber-300" />
        </motion.div>
        <h2 className="mt-3 text-xl font-extrabold">{verdict}</h2>
        <p className="text-sm text-muted">Kết quả bài {quizTitle}</p>

        <div className="relative mx-auto mt-5 size-36">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={R} stroke="#f1f1f4" strokeWidth="10" fill="none" />
            <motion.circle
              cx="60"
              cy="60"
              r={R}
              stroke="url(#score-grad)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - score / 100) }}
              transition={{ duration: 1.2, delay: 0.3, ease }}
            />
            <defs>
              <linearGradient id="score-grad" x1="0" x2="1">
                <stop offset="0" stopColor="#f86b6e" />
                <stop offset="1" stopColor="#e5383b" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <p className="text-4xl font-extrabold text-brand-500">{score}</p>
              <p className="text-[11px] text-muted">/ 100 điểm</p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm">
          Độ chính xác: <b className="text-emerald-600">{result.accuracy}%</b> · Nhận <b className="text-amber-500">+{result.xp} XP</b>
          {result.streak ? (
            <>
              {" "}
              · <Flame className="inline size-4 fill-orange-400 text-orange-500" /> <b>{result.streak} ngày</b>
            </>
          ) : null}
        </p>
        <p className={`mt-1 text-xs font-semibold ${result.passed ? "text-emerald-600" : "text-brand-500"}`}>
          {result.passed ? `Đạt yêu cầu (≥ ${result.passScore}%)` : `Chưa đạt mức ${result.passScore}%`}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {stats.map((s, i) => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }} className={`rounded-xl p-2 ${s.c}`}>
              <p className="text-lg font-extrabold tabular-nums">{s.v}</p>
              <p className="text-[10px] font-medium opacity-80">{s.l}</p>
            </motion.div>
          ))}
        </div>

        {result.feedback && (
          <div className="mt-4 flex gap-2 rounded-xl bg-violet-50 p-3 text-left text-xs leading-relaxed text-violet-900">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-500" />
            <span>
              {result.aiGraded && <b>AI nhận xét: </b>}
              {result.feedback}
            </span>
          </div>
        )}

        {open.length > 0 && (
          <div className="mt-3 space-y-2 text-left">
            {open.map((r) => (
              <button
                key={r.questionId}
                onClick={() => onReview(r.order)}
                className="flex w-full items-center gap-2 rounded-xl border border-ink/5 px-3 py-2 text-xs transition hover:border-brand-200"
              >
                <span className="font-bold">Câu {r.order + 1}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{r.feedback}</span>
                <span className={`shrink-0 font-bold ${r.correct ? "text-emerald-600" : "text-amber-600"}`}>
                  {r.score}/{r.points}
                </span>
              </button>
            ))}
          </div>
        )}

        {!loggedIn && (
          <Link
            href={`/dang-nhap?next=${encodeURIComponent(`/bai-tap/${slug}`)}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100"
          >
            <LogIn className="size-4" /> Đăng nhập để lưu kết quả và nhận XP
          </Link>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-ink/10 text-sm font-semibold transition hover:border-brand-300">
            Xem lại bài làm
          </button>
          <button
            onClick={onRestart}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
          >
            <RotateCcw className="size-4" /> Làm lại từ đầu
          </button>
        </div>
        <Link href="/bai-tap" className="mt-3 inline-block text-xs font-semibold text-brand-500 hover:underline">
          Về trang Bài tập
        </Link>
      </motion.div>
    </motion.div>
  );
}
