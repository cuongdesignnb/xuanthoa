"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, BarChart3, Bot, ClipboardList, Copy, ExternalLink, FileQuestion, MoreHorizontal, Pencil, Plus, Send, Sparkles, Trash2, Trophy, Undo2, Users } from "lucide-react";
import { Badge, Button, Dropdown, Field, IconButton, Input, Level, Modal, Select, StatusBadge, toast, useConfirm } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, StatCard, useForm } from "@/components/admin/page";
import { api, fmtDate, num } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import {
  DIFF_OPTIONS,
  DIFF_TONE,
  LEVEL_OPTIONS,
  SKILL_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
  ScoreBar,
  SourceBadge,
  TOPIC_SUGGESTIONS,
  diffLabel,
  kindPath,
  skillLabel,
  type AdminQuizRow,
  type QuizKind,
} from "./shared";

type Stats = {
  quizzes: { total: number; published: number; draft: number; ai: number; questions: number };
  attempts: { total: number; last30: number; avgScore: number | null; completion: number | null };
  trend: number[];
};

export default function QuizList({ kind }: { kind: QuizKind }) {
  const router = useRouter();
  const params = useSearchParams();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("quizzes.write");
  const base = kindPath(kind);
  const t = useTable<AdminQuizRow>(`/admin/quizzes?kind=${kind}`, { sort: kind === "jlpt" ? "level" : "createdAt", order: kind === "jlpt" ? "asc" : "desc" });
  const stats = useApi<Stats>(`/admin/quizzes/stats?kind=${kind}`);
  const [creating, setCreating] = useState(() => params.get("new") === "1");
  const isJlpt = kind === "jlpt";

  const refresh = () => {
    invalidate("/admin/quizzes");
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (r: AdminQuizRow) => {
    if (!(await confirm({ title: `Xoá “${r.title}”?`, message: `Toàn bộ ${r.questionCount} câu hỏi và ${r.attemptCount} lượt làm sẽ bị xoá vĩnh viễn.`, danger: true, confirmText: "Xoá" }))) return;
    act(() => api(`/admin/quizzes/${r.id}`, { method: "DELETE" }), "Đã xoá");
  };
  const duplicate = (r: AdminQuizRow) =>
    act(async () => {
      const copy = await api<{ id: string }>(`/admin/quizzes/${r.id}/duplicate`, { method: "POST" });
      router.push(`${base}/${copy.id}`);
    }, "Đã nhân bản thành bản nháp");
  const setStatus = (r: AdminQuizRow, status: string) =>
    act(() => api(`/admin/quizzes/${r.id}/publish`, { body: { status } }), status === "published" ? "Đã xuất bản" : "Đã cập nhật trạng thái");

  const cols: Column<AdminQuizRow>[] = [
    {
      key: "title",
      header: isJlpt ? "Bộ đề" : "Bài tập",
      sortable: true,
      cell: (r) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <span className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br text-xl ${r.tone ?? "from-brand-50 to-rose-50"}`}>
            {r.icon?.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.icon} alt="" className="size-full object-cover" />
            ) : (
              r.emoji ?? "📘"
            )}
          </span>
          <div className="min-w-0">
            <Link href={`${base}/${r.id}`} onClick={(e) => e.stopPropagation()} className="line-clamp-1 font-semibold hover:text-brand-600">
              {r.title}
            </Link>
            <p className="truncate text-[11px] text-muted">
              /{r.slug}
              {r.topic ? ` · ${r.topic}` : ""}
              {r.featured ? " · ⭐ Nổi bật" : ""}
            </p>
          </div>
        </div>
      ),
    },
    { key: "level", header: "Cấp độ", sortable: true, cell: (r) => <Level level={r.level} /> },
    ...(!isJlpt
      ? [
          { key: "skill", header: "Kỹ năng", cell: (r: AdminQuizRow) => <span className="text-xs">{skillLabel(r.skill)}</span>, hideOnMobile: true },
          { key: "difficulty", header: "Độ khó", cell: (r: AdminQuizRow) => <Badge tone={DIFF_TONE[r.difficulty]}>{diffLabel(r.difficulty)}</Badge>, hideOnMobile: true },
        ]
      : []),
    { key: "questionCount", header: "Câu hỏi", sortable: true, cell: (r) => <span className="font-semibold tabular-nums">{r.questionCount}</span> },
    { key: "attemptCount", header: "Lượt làm", sortable: true, cell: (r) => <span className="tabular-nums">{num(r.attemptCount)}</span> },
    { key: "avgScore", header: "Điểm TB", sortable: true, cell: (r) => <ScoreBar value={r.avgScore} pass={r.passScore} /> },
    { key: "source", header: "Nguồn", cell: (r) => <SourceBadge source={r.source} />, hideOnMobile: true },
    { key: "status", header: "Trạng thái", sortable: true, cell: (r) => <StatusBadge status={r.status} /> },
    { key: "updatedAt", header: "Cập nhật", sortable: true, cell: (r) => <span className="text-xs text-muted">{fmtDate(r.updatedAt)}</span>, hideOnMobile: true },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <Dropdown
            trigger={
              <IconButton label="Thao tác">
                <MoreHorizontal className="size-4" />
              </IconButton>
            }
            items={[
              { label: "Chỉnh sửa", icon: <Pencil className="size-4" />, onClick: () => router.push(`${base}/${r.id}`) },
              { label: "Thống kê", icon: <BarChart3 className="size-4" />, onClick: () => router.push(`${base}/${r.id}?tab=stats`) },
              { label: "Xem trên web", icon: <ExternalLink className="size-4" />, onClick: () => window.open(`/bai-tap/${r.slug}`, "_blank") },
              ...(canWrite
                ? [
                    "divider" as const,
                    r.status === "published"
                      ? { label: "Chuyển về nháp", icon: <Undo2 className="size-4" />, onClick: () => setStatus(r, "draft") }
                      : { label: "Xuất bản", icon: <Send className="size-4" />, onClick: () => setStatus(r, "published") },
                    { label: "Nhân bản", icon: <Copy className="size-4" />, onClick: () => duplicate(r) },
                    { label: "Lưu trữ", icon: <Archive className="size-4" />, onClick: () => setStatus(r, "archived") },
                    "divider" as const,
                    { label: "Xoá", icon: <Trash2 className="size-4" />, danger: true, onClick: () => remove(r) },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  const s = stats.data;
  return (
    <div>
      <PageHeader
        title={isJlpt ? "Bộ đề JLPT" : "Bài tập"}
        subtitle={isJlpt ? "Quản lý đề thi thử JLPT N5 – N1 theo cấu trúc chuẩn." : "Bài luyện tập theo chủ đề và kỹ năng cho trang Bài tập."}
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: isJlpt ? "JLPT & Đề thi" : "Bài tập" }]}
        actions={
          canWrite && (
            <>
              <Link href={`/admin/de-thi/ai?kind=${kind}`}>
                <Button variant="outline" icon={<Sparkles className="size-4" />}>
                  Tạo bằng AI
                </Button>
              </Link>
              <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                {isJlpt ? "Tạo đề thi" : "Tạo bài tập"}
              </Button>
            </>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} icon={isJlpt ? <Trophy className="size-5" /> : <ClipboardList className="size-5" />} label={isJlpt ? "Bộ đề" : "Bài tập"} value={num(s?.quizzes.total)} sub={`${num(s?.quizzes.published)} đã xuất bản · ${num(s?.quizzes.draft)} nháp`} />
        <StatCard index={1} tone="violet" icon={<FileQuestion className="size-5" />} label="Câu hỏi" value={num(s?.quizzes.questions)} sub={<span className="inline-flex items-center gap-1"><Bot className="size-3" /> {num(s?.quizzes.ai)} bài do AI tạo</span>} />
        <StatCard index={2} tone="blue" icon={<Users className="size-5" />} label="Lượt làm" value={num(s?.attempts.total)} sub={`${num(s?.attempts.last30)} lượt trong 30 ngày`} spark={s?.trend} />
        <StatCard index={3} tone="green" icon={<BarChart3 className="size-5" />} label="Điểm trung bình" value={s?.attempts.avgScore != null ? `${s.attempts.avgScore}%` : "—"} sub={`Tỷ lệ hoàn thành ${s?.attempts.completion ?? 0}%`} />
      </div>
      <TableCard
        table={t}
        columns={cols}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`${base}/${r.id}`)}
        placeholder={isJlpt ? "Tìm bộ đề…" : "Tìm bài tập, chủ đề…"}
        filters={[
          { key: "level", label: "Cấp độ", options: LEVEL_OPTIONS },
          ...(!isJlpt ? [{ key: "skill", label: "Kỹ năng", options: SKILL_OPTIONS.filter((x) => x.value !== "jlpt") }] : []),
          { key: "status", label: "Trạng thái", options: STATUS_OPTIONS },
          { key: "source", label: "Nguồn", options: SOURCE_OPTIONS },
          ...(!isJlpt ? [{ key: "difficulty", label: "Độ khó", options: DIFF_OPTIONS }] : []),
        ]}
        bulk={
          canWrite
            ? (ids, clear) => (
                <>
                  <Button size="sm" variant="soft" onClick={() => act(() => api("/admin/quizzes/bulk", { body: { ids, action: "publish" } }), "Đã xuất bản").then(clear)}>
                    Xuất bản
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => act(() => api("/admin/quizzes/bulk", { body: { ids, action: "draft" } }), "Đã chuyển về nháp").then(clear)}>
                    Về nháp
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (!(await confirm({ title: `Xoá ${ids.length} mục đã chọn?`, danger: true, confirmText: "Xoá" }))) return;
                      await act(() => api("/admin/quizzes/bulk", { body: { ids, action: "delete" } }), "Đã xoá");
                      clear();
                    }}
                  >
                    Xoá
                  </Button>
                </>
              )
            : undefined
        }
      />
      <CreateModal
        open={creating}
        kind={kind}
        onClose={() => {
          setCreating(false);
          if (params.get("new")) router.replace(base);
        }}
        onCreated={(id) => router.push(`${base}/${id}`)}
      />
    </div>
  );
}

function CreateModal({ open, kind, onClose, onCreated }: { open: boolean; kind: QuizKind; onClose: () => void; onCreated: (id: string) => void }) {
  const isJlpt = kind === "jlpt";
  const f = useForm({
    title: "",
    level: "N5",
    skill: isJlpt ? "jlpt" : "grammar",
    topic: "",
    difficulty: "medium",
    durationMin: isJlpt ? 60 : 15,
    emoji: isJlpt ? "📝" : "📘",
  });
  const submit = () =>
    f
      .submit((v) => api<{ id: string }>("/admin/quizzes", { body: { ...v, kind, topic: v.topic || null, status: "draft", tone: isJlpt ? "from-brand-50 to-rose-50" : "from-sky-100 to-blue-50" } }))
      .then((r) => {
        if (!r) return;
        toast.success("Đã tạo — thêm câu hỏi nhé");
        invalidate("/admin/quizzes");
        onCreated(r.id);
      })
      .catch(() => {});
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isJlpt ? "Tạo đề thi JLPT" : "Tạo bài tập mới"}
      description="Tạo bản nháp, sau đó thêm câu hỏi trong trang chỉnh sửa."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button loading={f.submitting} onClick={submit}>
            Tạo & thêm câu hỏi
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tiêu đề" required error={f.errors.title} className="sm:col-span-2">
          <Input value={f.values.title} onChange={f.input("title")} placeholder={isJlpt ? "JLPT N4 – Bộ đề số 6" : "Ngữ pháp: 〜てしまう"} autoFocus />
        </Field>
        <Field label="Cấp độ">
          <Select value={f.values.level} onChange={f.input("level")} options={LEVEL_OPTIONS} />
        </Field>
        {!isJlpt && (
          <Field label="Kỹ năng">
            <Select value={f.values.skill} onChange={f.input("skill")} options={SKILL_OPTIONS.filter((x) => x.value !== "jlpt")} />
          </Field>
        )}
        {!isJlpt && (
          <Field label="Chủ đề">
            <Input value={f.values.topic} onChange={f.input("topic")} list="quiz-topics" placeholder="Đời sống" />
            <datalist id="quiz-topics">
              {TOPIC_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
        )}
        <Field label="Độ khó">
          <Select value={f.values.difficulty} onChange={f.input("difficulty")} options={DIFF_OPTIONS} />
        </Field>
        <Field label="Thời gian (phút)" error={f.errors.durationMin}>
          <Input type="number" min={1} value={f.values.durationMin} onChange={f.input("durationMin")} />
        </Field>
        <Field label="Biểu tượng (emoji)">
          <Input value={f.values.emoji} onChange={f.input("emoji")} />
        </Field>
      </div>
    </Modal>
  );
}
