"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Bot, CheckCircle2, Loader2, Pencil, RefreshCw, Save, Send, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Level, Panel, Select, Skeleton, Textarea, cx, toast } from "@/components/admin/ui";
import { PageHeader } from "@/components/admin/page";
import { api, ApiError, timeAgo } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import QuestionModal from "./QuestionModal";
import AttemptDrawer from "./AttemptDrawer";
import {
  DIFF_OPTIONS,
  JLPT_SECTIONS,
  LEVEL_OPTIONS,
  QuestionPreview,
  SKILL_OPTIONS,
  ScoreBar,
  TOPIC_SUGGESTIONS,
  kindPath,
  type AttemptRow,
  type QuestionInput,
  type QuizKind,
} from "./shared";

type GenQuestion = {
  type: "mcq" | "short" | "essay";
  prompt: string;
  translation: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string;
  explanationLong: string;
  hint: { title: string; body: string; exampleJa: string; exampleVi: string };
  audioText: string;
};
type Draft = { title: string; description: string; questions: (QuestionInput & { uid: string })[]; requested: number };
type Progress = { stage: string; done: number; total: number; message: string };
type AiStatus = { configured: boolean; model: string; gradingEnabled: boolean; message: string | null };

let uidSeq = 0;
const toDraftQ = (q: GenQuestion): QuestionInput & { uid: string } => ({
  uid: `q${++uidSeq}`,
  type: q.type,
  prompt: q.prompt,
  translation: q.translation ?? "",
  options: q.type === "mcq" ? q.options : [],
  answer: q.answer,
  explanation: q.explanation ?? "",
  explanationLong: q.explanationLong ?? "",
  hint: { title: q.hint?.title ?? "", body: q.hint?.body ?? "", exampleJa: q.hint?.exampleJa ?? "", exampleVi: q.hint?.exampleVi ?? "" },
  audioText: q.audioText ?? "",
  scene: "",
  points: q.type === "essay" ? 5 : q.type === "short" ? 2 : 1,
});

const STEPS = ["Phân tích yêu cầu", "Soạn câu hỏi", "Viết giải thích & gợi ý", "Kiểm tra & loại trùng"];

export default function AiGenerator() {
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useAuth();
  const canWrite = can("quizzes.write");
  const status = useApi<AiStatus>("/admin/ai/status");

  const initialKind = (params.get("kind") as QuizKind) === "exercise" ? "exercise" : "jlpt";
  const [form, setForm] = useState({
    kind: initialKind as QuizKind,
    level: "N4",
    skill: initialKind === "jlpt" ? "jlpt" : "grammar",
    topic: "",
    count: 10,
    mcq: 10,
    short: 0,
    essay: 0,
    difficulty: "medium",
    jlptSection: JLPT_SECTIONS[4],
    notes: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((s) => ({ ...s, [k]: v }));
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [regen, setRegen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [meta, setMeta] = useState({ durationMin: 15, passScore: 60 });
  const abortRef = useRef<AbortController | null>(null);

  const mixSum = form.mcq + form.short + form.essay;
  const setCount = (n: number) =>
    setForm((s) => {
      const count = Math.min(50, Math.max(5, n || 5));
      const short = Math.min(s.short, count);
      const essay = Math.min(s.essay, count - short);
      return { ...s, count, short, essay, mcq: count - short - essay };
    });
  const setMix = (k: "short" | "essay", n: number) =>
    setForm((s) => {
      const v = Math.max(0, Math.min(s.count, n || 0));
      const other = k === "short" ? s.essay : s.short;
      const fixedOther = Math.min(other, s.count - v);
      return { ...s, [k]: v, [k === "short" ? "essay" : "short"]: fixedOther, mcq: s.count - v - fixedOther };
    });

  const generating = !!progress && !error && !draft;

  const generate = async () => {
    setError(null);
    setDraft(null);
    setProgress({ stage: "start", done: 0, total: form.count, message: "Đang gửi yêu cầu tới AI…" });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const body = {
      kind: form.kind,
      level: form.level,
      skill: form.skill,
      topic: form.topic || null,
      count: form.count,
      types: { mcq: form.mcq, short: form.short, essay: form.essay },
      difficulty: form.difficulty,
      notes: form.notes || null,
      jlptSection: form.kind === "jlpt" ? form.jlptSection : null,
    };
    try {
      const res = await fetch("/api/admin/ai/generate-quiz", {
        method: "POST",
        credentials: "include",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new ApiError(res.status, j.error ?? `Lỗi ${res.status}`, j.details);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const ev = chunk.match(/^event: (.*)$/m)?.[1];
          const data = chunk.match(/^data: (.*)$/m)?.[1];
          if (!ev || !data) continue;
          const payload = JSON.parse(data);
          if (ev === "progress") setProgress(payload);
          else if (ev === "error") throw new ApiError(payload.status, payload.error);
          else if (ev === "done") {
            const qs = (payload.questions as GenQuestion[]).map(toDraftQ);
            setDraft({ title: payload.title, description: payload.description, questions: qs, requested: payload.requested });
            setMeta({ durationMin: form.kind === "jlpt" ? Math.max(20, qs.length * 2) : Math.max(5, Math.round(qs.length * 1.2)), passScore: 60 });
            toast.success(`AI đã tạo ${qs.length} câu hỏi`);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setProgress(null);
        return;
      }
      setError((e as Error).message);
    } finally {
      abortRef.current = null;
    }
  };

  const regenerate = async (uid: string) => {
    if (!draft) return;
    const q = draft.questions.find((x) => x.uid === uid)!;
    setRegen(uid);
    try {
      const r = await api<{ question: GenQuestion }>("/admin/ai/regenerate-question", {
        body: {
          level: form.level,
          skill: form.skill,
          topic: form.topic || null,
          difficulty: form.difficulty,
          kind: form.kind,
          type: q.type,
          notes: form.notes || null,
          avoid: draft.questions.map((x) => x.prompt.replace(/<[^>]+>/g, "").slice(0, 200)),
        },
      });
      const nq = toDraftQ(r.question);
      setDraft((d) => d && { ...d, questions: d.questions.map((x) => (x.uid === uid ? nq : x)) });
      toast.success("Đã tạo lại câu hỏi");
    } catch (e) {
      toast.error(e);
    } finally {
      setRegen(null);
    }
  };

  const save = async (st: "draft" | "published") => {
    if (!draft?.questions.length) return;
    setSaving(st);
    try {
      const quiz = await api<{ id: string }>("/admin/ai/generate-quiz/save", {
        body: {
          kind: form.kind,
          title: draft.title,
          description: draft.description,
          level: form.level,
          skill: form.kind === "jlpt" ? "jlpt" : form.skill,
          topic: form.kind === "jlpt" ? null : form.topic || null,
          difficulty: form.difficulty,
          durationMin: meta.durationMin,
          passScore: meta.passScore,
          status: st,
          questions: draft.questions.map(({ uid: _uid, ...q }) => (void _uid, { ...q, scene: q.scene || null })),
        },
      });
      invalidate("/admin/quizzes");
      toast.success(st === "published" ? "Đã lưu & xuất bản" : "Đã lưu bản nháp");
      router.push(`${kindPath(form.kind)}/${quiz.id}`);
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(null);
    }
  };

  const editingQ = draft?.questions.find((q) => q.uid === editing) ?? null;
  const st = status.data;

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="size-6 text-violet-500" /> Tạo đề bằng AI
          </span>
        }
        subtitle="Claude soạn câu hỏi tiếng Nhật kèm furigana, gợi ý và giải thích tiếng Việt. Xem lại, chỉnh sửa rồi lưu thành bài tập hoặc đề thi."
        crumbs={[{ label: "JLPT & Đề thi", href: "/admin/de-thi" }, { label: "Tạo đề bằng AI" }]}
      />

      {st && !st.configured && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">{st.message ?? "Chưa cấu hình AI_API_KEY (ModelAPI)"}</p>
            <p className="text-xs">Vào <a href="/admin/cai-dat?tab=ai" className="font-semibold underline">Cài đặt › AI</a> để nhập khoá ModelAPI (lấy tại modelapi.vn), rồi bấm “Kiểm tra kết nối”. Trong lúc chờ, câu tự luận được chấm tự động bằng so khớp đáp án.</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* ---------------- Form ---------------- */}
        <div className="space-y-5">
          <Panel title="Yêu cầu" icon={<Wand2 className="size-4" />} subtitle={st ? `Model: ${st.model}` : undefined}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink/[.04] p-1">
                {(["jlpt", "exercise"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setForm((s) => ({ ...s, kind: k, skill: k === "jlpt" ? "jlpt" : s.skill === "jlpt" ? "grammar" : s.skill }))}
                    className={cx("rounded-lg py-1.5 text-sm font-semibold transition", form.kind === k ? "bg-white text-brand-600 shadow-sm" : "text-ink/55")}
                  >
                    {k === "jlpt" ? "Đề thi JLPT" : "Bài tập"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cấp độ">
                  <Select value={form.level} onChange={(e) => set("level", e.target.value)} options={LEVEL_OPTIONS} />
                </Field>
                <Field label="Độ khó">
                  <Select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)} options={DIFF_OPTIONS} />
                </Field>
              </div>
              {form.kind === "jlpt" ? (
                <Field label="Phần thi">
                  <Select value={form.jlptSection} onChange={(e) => set("jlptSection", e.target.value)} options={JLPT_SECTIONS.map((s) => ({ value: s, label: s }))} />
                </Field>
              ) : (
                <Field label="Kỹ năng">
                  <Select value={form.skill} onChange={(e) => set("skill", e.target.value)} options={SKILL_OPTIONS.filter((s) => s.value !== "jlpt")} />
                </Field>
              )}
              <Field label="Chủ đề" hint="Tuỳ chọn — VD: Du lịch, Công việc, mẫu 〜ている…">
                <Input value={form.topic} onChange={(e) => set("topic", e.target.value)} list="ai-topics" placeholder="Đời sống" />
                <datalist id="ai-topics">
                  {TOPIC_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field label={`Số câu: ${form.count}`}>
                <input type="range" min={5} max={50} value={form.count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-brand-500" />
              </Field>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink/80">Loại câu hỏi</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <label className="rounded-lg bg-sky-50 p-2 text-sky-700">
                    Trắc nghiệm
                    <Input value={form.mcq} readOnly className="mt-1 h-8 bg-white" />
                  </label>
                  <label className="rounded-lg bg-amber-50 p-2 text-amber-700">
                    Trả lời ngắn
                    <Input type="number" min={0} value={form.short} onChange={(e) => setMix("short", Number(e.target.value))} className="mt-1 h-8" />
                  </label>
                  <label className="rounded-lg bg-violet-50 p-2 text-violet-700">
                    Tự luận
                    <Input type="number" min={0} value={form.essay} onChange={(e) => setMix("essay", Number(e.target.value))} className="mt-1 h-8" />
                  </label>
                </div>
                {mixSum !== form.count && <p className="mt-1 text-xs text-red-500">Tổng phải bằng {form.count}</p>}
              </div>
              <Field label="Ghi chú cho AI">
                <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="VD: tập trung mẫu 〜ようにする, có furigana cho mọi kanji, tình huống công sở…" />
              </Field>
              {generating ? (
                <Button variant="outline" className="w-full" icon={<X className="size-4" />} onClick={() => abortRef.current?.abort()}>
                  Huỷ
                </Button>
              ) : (
                <Button className="w-full" size="lg" icon={<Sparkles className="size-5" />} onClick={generate} disabled={!canWrite || mixSum !== form.count}>
                  Tạo {form.count} câu bằng AI
                </Button>
              )}
            </div>
          </Panel>
          <AiGradingPanel status={st} />
        </div>

        {/* ---------------- Kết quả ---------------- */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div key="err" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="flex flex-col items-center gap-3 p-10 text-center">
                  <span className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
                    <AlertTriangle className="size-7" />
                  </span>
                  <p className="font-bold">Không tạo được đề</p>
                  <p className="max-w-md text-sm text-muted">{error}</p>
                  <Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={generate}>
                    Thử lại
                  </Button>
                </Card>
              </motion.div>
            ) : generating && progress ? (
              <motion.div key="gen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GeneratingView p={progress} />
              </motion.div>
            ) : draft ? (
              <motion.div key="draft" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <Card className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="violet">
                      <Bot className="size-3" /> Bản nháp AI
                    </Badge>
                    <Level level={form.level} />
                    <span className="text-xs text-muted">
                      {draft.questions.length}/{draft.requested} câu hợp lệ · chưa lưu
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_120px_120px]">
                    <Field label="Tiêu đề">
                      <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                    </Field>
                    <Field label="Thời gian (phút)">
                      <Input type="number" min={1} value={meta.durationMin} onChange={(e) => setMeta({ ...meta, durationMin: Number(e.target.value) || 1 })} />
                    </Field>
                    <Field label="Điểm đạt (%)">
                      <Input type="number" min={0} max={100} value={meta.passScore} onChange={(e) => setMeta({ ...meta, passScore: Number(e.target.value) || 0 })} />
                    </Field>
                  </div>
                  <Field label="Mô tả">
                    <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" icon={<RefreshCw className="size-4" />} onClick={generate}>
                      Tạo lại toàn bộ
                    </Button>
                    <Button variant="outline" loading={saving === "draft"} icon={<Save className="size-4" />} onClick={() => save("draft")} disabled={!draft.questions.length}>
                      Lưu bản nháp
                    </Button>
                    <Button loading={saving === "published"} icon={<Send className="size-4" />} onClick={() => save("published")} disabled={!draft.questions.length}>
                      Lưu & xuất bản
                    </Button>
                  </div>
                </Card>
                <div className="grid gap-3 2xl:grid-cols-2">
                  <AnimatePresence>
                    {draft.questions.map((q, i) => (
                      <motion.div key={q.uid} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.04 } }} exit={{ opacity: 0, scale: 0.95 }} className="relative">
                        <div className={cx(regen === q.uid && "pointer-events-none opacity-40")}>
                          <QuestionPreview q={q} level={form.level} index={i} />
                        </div>
                        {regen === q.uid && (
                          <span className="absolute inset-0 grid place-items-center">
                            <Loader2 className="size-7 animate-spin text-violet-500" />
                          </span>
                        )}
                        <div className="absolute right-2 top-2 flex gap-0.5 rounded-lg bg-white/90 p-0.5 shadow-sm">
                          <IconButton label="Sửa" onClick={() => setEditing(q.uid)}>
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton label="Tạo lại câu này" onClick={() => regenerate(q.uid)} disabled={!!regen}>
                            <RefreshCw className="size-4" />
                          </IconButton>
                          <IconButton label="Bỏ câu này" className="hover:text-red-600" onClick={() => setDraft({ ...draft, questions: draft.questions.filter((x) => x.uid !== q.uid) })}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card>
                  <EmptyState
                    icon={<Sparkles className="size-7" />}
                    title="Chưa có bản nháp"
                    description="Chọn cấp độ, kỹ năng, số câu rồi bấm “Tạo bằng AI”. Câu hỏi sinh ra chưa được lưu cho tới khi bạn bấm Lưu."
                  />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <QuestionModal
        open={!!editingQ}
        onClose={() => setEditing(null)}
        initial={editingQ}
        title="Sửa câu hỏi (bản nháp)"
        level={form.level}
        onSubmit={(nq) => setDraft((d) => d && { ...d, questions: d.questions.map((x) => (x.uid === editing ? { ...nq, uid: x.uid } : x)) })}
      />
    </div>
  );
}

function GeneratingView({ p }: { p: Progress }) {
  const pct = p.stage === "validating" ? 96 : p.stage === "start" ? 4 : Math.max(6, Math.round((p.done / Math.max(1, p.total)) * 90));
  const step = p.stage === "start" ? 0 : p.stage === "validating" ? 3 : p.done > p.total * 0.5 ? 2 : 1;
  return (
    <Card className="overflow-hidden">
      <div className="relative bg-gradient-to-br from-violet-50 via-white to-brand-50 p-6">
        <div className="flex items-center gap-4">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-brand-500 text-white shadow-lg shadow-violet-500/30"
          >
            <Sparkles className="size-7" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">AI đang soạn đề…</p>
            <p className="text-sm text-muted">{p.message}</p>
          </div>
          <span className="text-2xl font-extrabold text-violet-600 tabular-nums">{pct}%</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-brand-500" animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s} className={cx("flex items-center gap-1.5 text-xs", i <= step ? "font-semibold text-violet-700" : "text-muted")}>
              {i < step ? <CheckCircle2 className="size-4 text-emerald-500" /> : i === step ? <Loader2 className="size-4 animate-spin" /> : <span className="size-4 rounded-full border border-ink/15" />}
              {s}
            </li>
          ))}
        </ol>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {Array.from({ length: Math.min(6, p.total) }).map((_, i) => (
          <div key={i} className={cx("rounded-2xl border border-ink/[.06] p-4 transition", i < p.done ? "bg-emerald-50/40" : "")}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14" />
              {i < p.done && <CheckCircle2 className="size-4 text-emerald-500" />}
            </div>
            <Skeleton className="mt-3 h-5 w-4/5" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((k) => (
                <Skeleton key={k} className="h-7" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AiGradingPanel({ status }: { status?: AiStatus }) {
  const { data, loading } = useApi<{ items: AttemptRow[]; total: number }>("/admin/attempts?ai=1&pageSize=6&sort=submittedAt&order=desc", { dedupeMs: 0 });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Panel
      title="AI chấm bài"
      icon={<Bot className="size-4" />}
      subtitle={status ? (status.configured && status.gradingEnabled ? "Đang bật — câu tự luận được Claude chấm khi nộp" : status.configured ? "Đang tắt trong Cài đặt" : "Chưa cấu hình — dùng chấm so khớp") : undefined}
      action={
        <Link href="/admin/hoc-vien/luot-lam-bai" className="text-xs font-semibold text-brand-500 hover:underline">
          Xem tất cả
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <p className="py-6 text-center text-sm text-muted">Chưa có bài nào được AI chấm.</p>
      ) : (
        <ul className="space-y-1">
          {data.items.map((a) => (
            <li key={a.id}>
              <button onClick={() => setOpen(a.id)} className="w-full rounded-xl px-2 py-2 text-left transition hover:bg-brand-50/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{a.userName}</p>
                  <span className="shrink-0 text-[11px] text-muted">{timeAgo(a.submittedAt ?? a.startedAt)}</span>
                </div>
                <p className="truncate text-[11px] text-muted">{a.quizTitle}</p>
                <ScoreBar value={a.percent} pass={a.passScore} />
              </button>
            </li>
          ))}
          <li className="pt-1 text-center text-[11px] text-muted">Tổng {data.total} lượt có câu do AI chấm</li>
        </ul>
      )}
      <AttemptDrawer id={open} onClose={() => setOpen(null)} />
    </Panel>
  );
}
