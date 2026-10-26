"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileUp,
  Pencil,
  Plus,
  Save,
  Send,
  Target,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Level,
  Modal,
  Panel,
  Select,
  Skeleton,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
  toast,
  useConfirm,
} from "@/components/admin/ui";
import { DataTable, Pagination, TableToolbar, type Column } from "@/components/admin/table";
import { BarChart, ProgressBar } from "@/components/admin/charts";
import { PageHeader, StatCard, useForm } from "@/components/admin/page";
import RichTextEditor from "@/components/admin/editor/RichTextEditor";
import { api, fmtDate, num } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import QuestionModal from "./QuestionModal";
import AttemptDrawer from "./AttemptDrawer";
import {
  DIFF_OPTIONS,
  LEVEL_OPTIONS,
  QuestionPreview,
  SKILL_OPTIONS,
  STATUS_OPTIONS,
  ScoreBar,
  SourceBadge,
  TONE_OPTIONS,
  TOPIC_SUGGESTIONS,
  emptyQuestion,
  fmtDuration,
  kindLabel,
  kindPath,
  qtypeLabel,
  toInput,
  type AdminQuestion,
  type AttemptRow,
  type QuestionInput,
  type QuizFull,
  type QuizKind,
} from "./shared";

type Tab = "questions" | "settings" | "stats" | "attempts";

export default function QuizEditor({ id, kind }: { id: string; kind: QuizKind }) {
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useAuth();
  const canWrite = can("quizzes.write");
  const { data, error, loading, reload } = useApi<QuizFull>(`/admin/quizzes/${id}`, { dedupeMs: 0 });
  const [tab, setTab] = useState<Tab>(() => (["questions", "settings", "stats", "attempts"].includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : "questions"));

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-1/2" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  if (error || !data) return <ErrorState error={error ?? new Error("Không tìm thấy")} onRetry={reload} />;

  const base = kindPath(data.kind ?? kind);
  const refresh = () => {
    invalidate(`/admin/quizzes`);
    reload();
  };

  const setStatus = async (status: string) => {
    try {
      await api(`/admin/quizzes/${id}/publish`, { body: { status } });
      toast.success(status === "published" ? "Đã xuất bản" : "Đã chuyển về bản nháp");
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const duplicate = async () => {
    try {
      const c = await api<{ id: string }>(`/admin/quizzes/${id}/duplicate`, { method: "POST" });
      toast.success("Đã nhân bản");
      router.push(`${base}/${c.id}`);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: data.kind === "jlpt" ? "JLPT & Đề thi" : "Bài tập", href: base },
          { label: data.title },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-2xl">{data.icon?.startsWith("http") ? "🖼️" : (data.emoji ?? "📘")}</span>
            {data.title}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Level level={data.level} />
            <StatusBadge status={data.status} />
            <SourceBadge source={data.source} />
            <span>
              {kindLabel(data.kind)} · {data.questions.length} câu · {data.durationMin} phút · cập nhật {fmtDate(data.updatedAt, true)}
            </span>
          </span>
        }
        actions={
          <>
            <a href={`/bai-tap/${data.slug}`} target="_blank" rel="noreferrer">
              <Button variant="ghost" icon={<ExternalLink className="size-4" />}>
                Xem trên web
              </Button>
            </a>
            {canWrite && (
              <>
                <Button variant="ghost" icon={<Copy className="size-4" />} onClick={duplicate}>
                  Nhân bản
                </Button>
                {data.status === "published" ? (
                  <Button variant="outline" icon={<Undo2 className="size-4" />} onClick={() => setStatus("draft")}>
                    Về bản nháp
                  </Button>
                ) : (
                  <Button icon={<Send className="size-4" />} onClick={() => setStatus("published")}>
                    Xuất bản
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      <Tabs<Tab>
        className="mb-4 w-fit max-w-full"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "questions", label: "Câu hỏi", count: data.questions.length },
          { value: "settings", label: "Cài đặt" },
          { value: "stats", label: "Thống kê" },
          { value: "attempts", label: "Lượt làm", count: undefined },
        ]}
      />

      {tab === "questions" && <QuestionsTab quiz={data} canWrite={canWrite} onChanged={refresh} />}
      {tab === "settings" && <SettingsTab quiz={data} canWrite={canWrite} onSaved={refresh} />}
      {tab === "stats" && <StatsTab id={id} />}
      {tab === "attempts" && <AttemptsTab id={id} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Câu hỏi                                                             */
/* ------------------------------------------------------------------ */

function QuestionsTab({ quiz, canWrite, onChanged }: { quiz: QuizFull; canWrite: boolean; onChanged: () => void }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ q: AdminQuestion | null; type?: "mcq" } | null>(null);
  const [importing, setImporting] = useState(false);
  const [order, setOrder] = useState<AdminQuestion[]>(quiz.questions);
  const [selected, setSelected] = useState<string | null>(quiz.questions[0]?.id ?? null);
  const [dirtyOrder, setDirtyOrder] = useState(false);
  useEffect(() => {
    // đồng bộ khi dữ liệu tải lại (sau thêm/sửa/xoá)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(quiz.questions);
    setDirtyOrder(false);
  }, [quiz.questions]);

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    setDirtyOrder(true);
  };
  const saveOrder = async () => {
    try {
      await api(`/admin/quizzes/${quiz.id}/questions/reorder`, { body: { ids: order.map((q) => q.id) } });
      toast.success("Đã lưu thứ tự câu hỏi");
      onChanged();
    } catch (e) {
      toast.error(e);
    }
  };
  const remove = async (q: AdminQuestion, i: number) => {
    if (!(await confirm({ title: `Xoá câu ${i + 1}?`, message: "Câu trả lời của học viên cho câu này sẽ không còn được tính.", danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/questions/${q.id}`, { method: "DELETE" });
      toast.success("Đã xoá câu hỏi");
      onChanged();
    } catch (e) {
      toast.error(e);
    }
  };
  const submit = async (input: QuestionInput) => {
    const body = { ...input, hint: input.hint, scene: input.scene || null };
    if (editing?.q) await api(`/admin/questions/${editing.q.id}`, { method: "PATCH", body });
    else await api(`/admin/quizzes/${quiz.id}/questions`, { body });
    toast.success(editing?.q ? "Đã lưu câu hỏi" : "Đã thêm câu hỏi");
    onChanged();
  };

  const sel = order.find((q) => q.id === selected) ?? order[0];
  const selIndex = sel ? order.indexOf(sel) : -1;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel
        title={`Danh sách câu hỏi (${order.length})`}
        subtitle={`Tổng điểm: ${order.reduce((s, q) => s + q.points, 0)}`}
        action={
          canWrite && (
            <div className="flex flex-wrap gap-2">
              {dirtyOrder && (
                <Button size="sm" variant="soft" icon={<Save className="size-4" />} onClick={saveOrder}>
                  Lưu thứ tự
                </Button>
              )}
              <Button size="sm" variant="ghost" icon={<FileUp className="size-4" />} onClick={() => setImporting(true)}>
                Nhập JSON/CSV
              </Button>
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing({ q: null })}>
                Thêm câu
              </Button>
            </div>
          )
        }
      >
        {!order.length ? (
          <EmptyState
            icon="📝"
            title="Chưa có câu hỏi"
            description="Thêm câu hỏi thủ công, nhập từ file JSON/CSV hoặc dùng AI để tạo đề."
            action={
              canWrite && (
                <div className="flex gap-2">
                  <Button icon={<Plus className="size-4" />} onClick={() => setEditing({ q: null })}>
                    Thêm câu hỏi
                  </Button>
                  <Link href={`/admin/de-thi/ai?kind=${quiz.kind}`}>
                    <Button variant="outline" icon={<Bot className="size-4" />}>
                      Tạo bằng AI
                    </Button>
                  </Link>
                </div>
              )
            }
          />
        ) : (
          <ul className="space-y-2">
            {order.map((q, i) => (
              <li
                key={q.id}
                onClick={() => setSelected(q.id)}
                className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${sel?.id === q.id ? "border-brand-300 bg-brand-50/40" : "border-ink/[.06] hover:border-brand-200"}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink/[.05] text-sm font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone={q.type === "mcq" ? "blue" : q.type === "short" ? "amber" : "violet"}>{qtypeLabel(q.type)}</Badge>
                    {q.points > 1 && <Badge tone="gray">{q.points} điểm</Badge>}
                    {q.audioText && <Badge tone="pink">Audio</Badge>}
                    {!q.explanation && <Badge tone="orange">Thiếu giải thích</Badge>}
                  </div>
                  <p
                    className="line-clamp-2 font-jp text-sm leading-relaxed [&_rt]:text-[0.55em] [&_rt]:text-ink/50"
                    dangerouslySetInnerHTML={{ __html: q.prompt }}
                  />
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    Đáp án:{" "}
                    <b className="font-jp text-emerald-700">
                      {q.type === "mcq" ? `${q.answer}. ${(q.options.find((o) => o.key === q.answer)?.text ?? "").replace(/<[^>]+>/g, "")}` : q.answer}
                    </b>
                  </p>
                </div>
                {canWrite && (
                  <div className="flex shrink-0 flex-col items-center gap-0.5 sm:flex-row" onClick={(e) => e.stopPropagation()}>
                    <IconButton label="Lên" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label="Xuống" onClick={() => move(i, 1)} disabled={i === order.length - 1}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton label="Sửa" onClick={() => setEditing({ q })}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label="Xoá" onClick={() => remove(q, i)} className="hover:text-red-600">
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="space-y-3 xl:sticky xl:top-20 xl:self-start">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Xem trước như học viên</p>
        {sel ? <QuestionPreview q={toInput(sel)} level={quiz.level} index={selIndex} /> : <Card className="p-6 text-center text-sm text-muted">Chọn một câu để xem trước</Card>}
        {sel && canWrite && (
          <Button variant="outline" className="w-full" icon={<Pencil className="size-4" />} onClick={() => setEditing({ q: sel })}>
            Chỉnh sửa câu {selIndex + 1}
          </Button>
        )}
      </div>

      <QuestionModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing?.q ? toInput(editing.q) : emptyQuestion()}
        questionId={editing?.q?.id}
        title={editing?.q ? `Sửa câu ${order.findIndex((x) => x.id === editing.q!.id) + 1}` : "Thêm câu hỏi"}
        level={quiz.level}
        onSubmit={submit}
      />
      <ImportModal open={importing} onClose={() => setImporting(false)} quizId={quiz.id} onDone={onChanged} />
    </div>
  );
}

const CSV_SAMPLE = `type,prompt,translation,a,b,c,d,answer,explanation,hint_title,hint_body,audio_text,points
mcq,"友だち＿＿＿映画を見ました。",Tôi xem phim với bạn.,に,で,と,から,C,「と」: cùng với ai.,Cùng với,Nと: làm gì cùng N,,1
short,「学校」の読み方を書いてください。,,,,,,がっこう | ガッコウ,Đọc là がっこう.,,,,2`;

const JSON_SAMPLE = `[
  {
    "type": "mcq",
    "prompt": "<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>っている＿＿＿、傘を持って行きます。",
    "translation": "Vì trời mưa nên tôi mang ô.",
    "options": ["から", "けど", "のに", "ても"],
    "answer": 0,
    "explanation": "「から」 chỉ lý do.",
    "hint": { "title": "Vì… nên…", "body": "普通形 + から" }
  }
]`;

function ImportModal({ open, onClose, quizId, onDone }: { open: boolean; onClose: () => void; quizId: string; onDone: () => void }) {
  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const t = await f.text();
    setText(t);
    setFormat(f.name.toLowerCase().endsWith(".json") ? "json" : "csv");
  };
  const run = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const r = await api<{ imported: number; errors: { row: number; message: string }[] }>(`/admin/quizzes/${quizId}/questions/import`, { body: { format, data: text, replace } });
      setErrors(r.errors);
      toast.success(`Đã nhập ${r.imported} câu hỏi${r.errors.length ? `, bỏ qua ${r.errors.length} dòng lỗi` : ""}`);
      onDone();
      if (!r.errors.length) onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Nhập câu hỏi hàng loạt"
      description="Hỗ trợ CSV (Excel/Google Sheets) hoặc JSON."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button loading={busy} disabled={!text.trim()} icon={<FileUp className="size-4" />} onClick={run}>
            Nhập câu hỏi
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs<"json" | "csv">
            size="sm"
            value={format}
            onChange={setFormat}
            tabs={[
              { value: "csv", label: "CSV" },
              { value: "json", label: "JSON" },
            ]}
          />
          <label className="cursor-pointer text-xs font-semibold text-brand-600 hover:underline">
            Chọn file…
            <input type="file" accept=".csv,.json,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <button className="text-xs text-muted hover:text-brand-600" onClick={() => setText(format === "csv" ? CSV_SAMPLE : JSON_SAMPLE)}>
            Dùng dữ liệu mẫu
          </button>
          <span className="ml-auto">
            <Switch checked={replace} onChange={setReplace} label={<span className="text-xs">Thay thế toàn bộ câu hiện có</span>} />
          </span>
        </div>
        <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" placeholder={format === "csv" ? CSV_SAMPLE : JSON_SAMPLE} />
        <p className="text-xs text-muted">
          {format === "csv"
            ? "Cột: type (mcq/short/essay), prompt, translation, a–d, answer (A–D hoặc đáp án mẫu), explanation, explanation_long, hint_title, hint_body, example_ja, example_vi, audio_text, points."
            : "Mảng câu hỏi; options có thể là mảng chuỗi, answer có thể là chỉ số (0 = A)."}
        </p>
        {!!errors.length && (
          <div className="max-h-40 overflow-y-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {errors.map((e) => (
              <p key={e.row}>
                Dòng {e.row}: {e.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Cài đặt                                                             */
/* ------------------------------------------------------------------ */

function SettingsTab({ quiz, canWrite, onSaved }: { quiz: QuizFull; canWrite: boolean; onSaved: () => void }) {
  const f = useForm({
    title: quiz.title,
    slug: quiz.slug,
    description: quiz.description ?? "",
    level: quiz.level,
    skill: quiz.skill,
    topic: quiz.topic ?? "",
    difficulty: quiz.difficulty,
    durationMin: quiz.durationMin,
    passScore: quiz.passScore,
    emoji: quiz.emoji ?? "",
    icon: quiz.icon ?? "",
    tone: quiz.tone ?? "",
    featured: quiz.featured,
    status: quiz.status,
  });
  const save = () =>
    f
      .submit((v) => api(`/admin/quizzes/${quiz.id}`, { method: "PATCH", body: { ...v, topic: v.topic || null, icon: v.icon || null, tone: v.tone || null } }))
      .then(() => {
        toast.success("Đã lưu cài đặt");
        onSaved();
      })
      .catch((e) => toast.error(e));
  const v = f.values;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tiêu đề" required error={f.errors.title} className="sm:col-span-2">
            <Input value={v.title} onChange={f.input("title")} disabled={!canWrite} />
          </Field>
          <Field label="Đường dẫn (slug)" error={f.errors.slug} hint={`/bai-tap/${v.slug}`}>
            <Input value={v.slug} onChange={f.input("slug")} disabled={!canWrite} />
          </Field>
          <Field label="Trạng thái">
            <Select value={v.status} onChange={f.input("status")} options={STATUS_OPTIONS} disabled={!canWrite} />
          </Field>
          <Field label="Mô tả" className="sm:col-span-2">
            <RichTextEditor value={v.description} onChange={(h) => f.set("description", h)} toolbar="basic" minHeight={90} />
          </Field>
          <Field label="Cấp độ">
            <Select value={v.level} onChange={f.input("level")} options={LEVEL_OPTIONS} disabled={!canWrite} />
          </Field>
          <Field label="Kỹ năng">
            <Select value={v.skill} onChange={f.input("skill")} options={SKILL_OPTIONS} disabled={!canWrite} />
          </Field>
          <Field label="Chủ đề">
            <Input value={v.topic} onChange={f.input("topic")} list="topic-list" disabled={!canWrite} />
            <datalist id="topic-list">
              {TOPIC_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Độ khó">
            <Select value={v.difficulty} onChange={f.input("difficulty")} options={DIFF_OPTIONS} disabled={!canWrite} />
          </Field>
          <Field label="Thời gian làm bài (phút)" error={f.errors.durationMin}>
            <Input type="number" min={1} value={v.durationMin} onChange={f.input("durationMin")} disabled={!canWrite} />
          </Field>
          <Field label="Điểm đạt (%)" error={f.errors.passScore}>
            <Input type="number" min={0} max={100} value={v.passScore} onChange={f.input("passScore")} disabled={!canWrite} />
          </Field>
        </div>
        {canWrite && (
          <div className="flex justify-end">
            <Button loading={f.submitting} icon={<Save className="size-4" />} onClick={save}>
              Lưu cài đặt
            </Button>
          </div>
        )}
      </Card>
      <Card className="space-y-4 p-5">
        <p className="text-sm font-bold">Hiển thị trên thẻ</p>
        <div className={`grid h-28 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br text-5xl ${v.tone || "from-brand-50 to-rose-50"}`}>
          {v.icon.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.icon} alt="" className="size-full object-cover" />
          ) : (
            v.emoji || "📘"
          )}
        </div>
        <Field label="Emoji">
          <Input value={v.emoji} onChange={f.input("emoji")} disabled={!canWrite} />
        </Field>
        <Field label="Màu nền">
          <Select value={v.tone} onChange={f.input("tone")} options={TONE_OPTIONS} placeholder="Mặc định" disabled={!canWrite} />
        </Field>
        <Field label="Ảnh thay emoji (URL, tuỳ chọn)">
          <Input value={v.icon} onChange={f.input("icon")} placeholder="https://…" disabled={!canWrite} />
        </Field>
        <Switch checked={v.featured} onChange={(x) => f.set("featured", x)} label="Nổi bật (ưu tiên trong đề xuất)" disabled={!canWrite} />
        <Textarea readOnly rows={2} value={`Nguồn: ${quiz.source === "ai" ? "AI tạo" : "Thủ công"} · Tạo ${fmtDate(quiz.createdAt)}`} className="text-xs text-muted" />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thống kê                                                            */
/* ------------------------------------------------------------------ */

type QuizStats = {
  summary: {
    attempts: number;
    completed: number;
    inProgress: number;
    students: number;
    avgScore: number | null;
    passRate: number | null;
    avgDuration: number | null;
    aiGraded: number;
    completionRate: number;
    passScore: number;
  };
  perQuestion: { questionId: string; order: number; type: string; promptText: string; answered: number; accuracy: number | null; skipped: number }[];
  hardest: { questionId: string; order: number; promptText: string; accuracy: number | null; answered: number }[];
  byDay: { label: string; value: number }[];
  distribution: { label: string; value: number }[];
};

function StatsTab({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<QuizStats>(`/admin/quizzes/${id}/stats`, { dedupeMs: 0 });
  if (loading) return <Skeleton className="h-80 w-full" />;
  if (error || !data) return <ErrorState error={error ?? new Error("Lỗi")} onRetry={reload} />;
  const s = data.summary;
  if (!s.attempts) return <Card><EmptyState icon="📊" title="Chưa có lượt làm nào" description="Thống kê sẽ hiển thị khi học viên bắt đầu làm bài." /></Card>;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} icon={<Users className="size-5" />} label="Lượt làm" value={num(s.attempts)} sub={`${num(s.students)} học viên · ${s.inProgress} đang làm`} />
        <StatCard index={1} tone="green" icon={<CheckCircle2 className="size-5" />} label="Tỷ lệ hoàn thành" value={`${s.completionRate}%`} sub={`${num(s.completed)} lượt đã nộp`} />
        <StatCard index={2} tone="violet" icon={<Target className="size-5" />} label="Điểm TB · Tỷ lệ đạt" value={`${s.avgScore ?? 0}%`} sub={`${s.passRate ?? 0}% đạt mức ${s.passScore}%`} />
        <StatCard index={3} tone="amber" icon={<Clock className="size-5" />} label="Thời gian TB" value={fmtDuration(s.avgDuration)} sub={s.aiGraded ? `${s.aiGraded} lượt có AI chấm` : "Không có câu AI chấm"} />
      </div>
      <Panel title="Tỷ lệ trả lời đúng theo câu" icon={<BarChart3 className="size-4" />} subtitle="Rê chuột để xem nội dung câu hỏi">
        <BarChart
          data={data.perQuestion.map((p) => ({ label: `C${p.order + 1}`, value: p.accuracy ?? 0 }))}
          height={220}
          highlightLast={false}
          format={(v) => `${Math.round(v)}%`}
          tooltip={(d, i) => (
            <div className="max-w-[220px] text-left">
              <p className="font-semibold">Câu {data.perQuestion[i].order + 1}</p>
              <p className="line-clamp-2 font-jp text-muted">{data.perQuestion[i].promptText}</p>
              <p className="font-bold text-brand-600">
                {Math.round(d.value)}% đúng · {data.perQuestion[i].answered} lượt
              </p>
            </div>
          )}
        />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Câu khó nhất" icon={<Target className="size-4" />}>
          <ul className="space-y-3">
            {data.hardest.map((h) => (
              <li key={h.questionId}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <b>Câu {h.order + 1}.</b> <span className="font-jp text-ink/70">{h.promptText}</span>
                  </span>
                  <span className="shrink-0 font-bold text-red-500">{h.accuracy}%</span>
                </div>
                <ProgressBar value={h.accuracy ?? 0} tone={(h.accuracy ?? 0) < 50 ? "red" : "amber"} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Phân bố điểm" icon={<BarChart3 className="size-4" />}>
          <BarChart data={data.distribution} height={180} highlightLast={false} format={(v) => String(Math.round(v))} />
        </Panel>
      </div>
      <Panel title="Lượt làm 30 ngày gần đây" icon={<Users className="size-4" />}>
        <BarChart data={data.byDay} height={180} format={(v) => String(Math.round(v))} />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lượt làm                                                            */
/* ------------------------------------------------------------------ */

export function attemptColumns(withQuiz: boolean): Column<AttemptRow>[] {
  return [
    {
      key: "userName",
      header: "Học viên",
      sortable: true,
      cell: (r) => (
        <div className="flex min-w-[180px] items-center gap-2.5">
          <Avatar src={r.userAvatar} name={r.userName} size={32} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.userName}</p>
            <p className="truncate text-[11px] text-muted">{r.userEmail}</p>
          </div>
        </div>
      ),
    },
    ...(withQuiz
      ? [
          {
            key: "quiz",
            header: "Bài / đề",
            cell: (r: AttemptRow) => (
              <div className="min-w-[180px]">
                <p className="line-clamp-1 font-medium">{r.quizTitle}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted">
                  <Level level={r.quizLevel} /> {r.quizKind === "jlpt" ? "Đề JLPT" : "Bài tập"}
                </p>
              </div>
            ),
          },
        ]
      : []),
    {
      key: "score",
      header: "Điểm",
      sortable: true,
      cell: (r) => (r.status === "in_progress" ? <span className="text-xs text-muted">Đang làm · {r.answered} câu</span> : <ScoreBar value={r.percent} pass={r.passScore} />),
    },
    { key: "status", header: "Trạng thái", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "ai",
      header: "Chấm",
      cell: (r) =>
        r.manual ? (
          <Badge tone="blue">GV sửa</Badge>
        ) : r.aiGraded ? (
          <Badge tone="violet">
            <Bot className="size-3" /> AI
          </Badge>
        ) : (
          <span className="text-xs text-muted">Tự động</span>
        ),
      hideOnMobile: true,
    },
    { key: "durationSec", header: "Thời gian", sortable: true, cell: (r) => <span className="text-xs tabular-nums">{fmtDuration(r.durationSec)}</span>, hideOnMobile: true },
    { key: "startedAt", header: "Ngày làm", sortable: true, cell: (r) => <span className="text-xs text-muted">{fmtDate(r.submittedAt ?? r.startedAt, true)}</span> },
  ];
}

function AttemptsTab({ id }: { id: string }) {
  const t = useTable<AttemptRow>(`/admin/quizzes/${id}/attempts`, { sort: "startedAt" });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card className="p-4">
      <TableToolbar
        table={t}
        placeholder="Tìm học viên…"
        filters={[
          { key: "status", label: "Trạng thái", options: [{ value: "graded", label: "Đã chấm" }, { value: "in_progress", label: "Đang làm" }] },
          { key: "result", label: "Kết quả", options: [{ value: "pass", label: "Đạt" }, { value: "fail", label: "Chưa đạt" }] },
          { key: "ai", label: "AI chấm", options: [{ value: "1", label: "Có AI chấm" }, { value: "0", label: "Không" }] },
        ]}
      />
      <DataTable table={t} columns={attemptColumns(false)} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r.id)} />
      <Pagination table={t as never} />
      <AttemptDrawer id={open} onClose={() => setOpen(null)} />
    </Card>
  );
}
