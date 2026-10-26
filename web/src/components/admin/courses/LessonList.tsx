"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Copy, ExternalLink, FileQuestion, FileText, MoreHorizontal, Pencil, PlayCircle, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Dropdown, Field, IconButton, Input, Level, Modal, Select, StatusBadge, toast, useConfirm } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, useForm } from "@/components/admin/page";
import { api, compact, qs } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { mmss } from "@/components/courses/types";
import { STATUS_OPTIONS } from "./CourseList";

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  type: "video" | "text" | "quiz";
  durationSec: number;
  isFree: boolean;
  hasDocs: boolean;
  hasExercise: boolean;
  status: string;
  hasVideo: boolean;
  vocabCount: number;
  views: number;
  updatedAt: string;
  module: { id: string; title: string };
  course: { id: string; title: string; slug: string; level: string | null };
};

export const TYPE_OPTIONS = [
  { value: "video", label: "Video" },
  { value: "text", label: "Bài đọc" },
  { value: "quiz", label: "Bài kiểm tra" },
];
const TYPE_ICON = { video: PlayCircle, text: FileText, quiz: FileQuestion } as const;

type ModuleOption = { value: string; label: string; courseId: string; courseTitle: string };

export default function LessonList() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("courses.write");
  const t = useTable<LessonRow>("/admin/lessons", { pageSize: 20, filters: sp.get("courseId") ? { courseId: sp.get("courseId")! } : {} });
  const courses = useApi<{ value: string; label: string }[]>("/admin/options/courses");
  const courseId = t.state.filters.courseId;
  const modules = useApi<ModuleOption[]>(courseId ? `/admin/modules${qs({ courseId })}` : null);
  const creating = sp.get("new") === "1";
  const closeCreate = () => router.replace(pathname, { scroll: false });

  const refresh = () => invalidate("/admin/lessons");

  const duplicate = async (l: LessonRow) => {
    try {
      const r = await api<{ id: string }>(`/admin/lessons/${l.id}/duplicate`, { method: "POST" });
      toast.success("Đã nhân bản bài học");
      refresh();
      router.push(`/admin/bai-hoc/${r.id}`);
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (l: LessonRow) => {
    if (!(await confirm({ title: `Xoá bài “${l.title}”?`, message: "Từ vựng, tài liệu, bình luận và tiến độ học của bài cũng bị xoá.", confirmText: "Xoá", danger: true }))) return;
    try {
      await api(`/admin/lessons/${l.id}`, { method: "DELETE" });
      toast.success("Đã xoá bài học");
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const columns: Column<LessonRow>[] = [
    {
      key: "title",
      header: "Bài học",
      sortable: true,
      cell: (l) => {
        const Icon = TYPE_ICON[l.type];
        return (
          <div className="flex min-w-[260px] items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="line-clamp-1 font-semibold">{l.title}</p>
              <p className="line-clamp-1 text-[11px] text-muted">{l.module.title}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "course",
      header: "Khóa học",
      sortable: true,
      hideOnMobile: true,
      cell: (l) => (
        <span className="flex min-w-[180px] items-center gap-2">
          <Level level={l.course.level} />
          <span className="line-clamp-1 text-xs">{l.course.title}</span>
        </span>
      ),
    },
    { key: "durationSec", header: "Thời lượng", sortable: true, cell: (l) => <span className="text-xs tabular-nums">{mmss(l.durationSec)}</span> },
    {
      key: "content",
      header: "Nội dung",
      hideOnMobile: true,
      cell: (l) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {l.type === "video" && (l.hasVideo ? <Badge tone="blue">Video</Badge> : <Badge tone="amber">Thiếu video</Badge>)}
          {l.vocabCount > 0 && <Badge tone="violet">{l.vocabCount} từ</Badge>}
          {l.hasDocs && <FileText className="size-3.5 text-muted" />}
          {l.hasExercise && <ClipboardList className="size-3.5 text-muted" />}
          {l.isFree && <Badge tone="green">Học thử</Badge>}
        </span>
      ),
    },
    { key: "views", header: "Lượt học", hideOnMobile: true, cell: (l) => <span className="text-xs">{compact(l.views)}</span> },
    { key: "status", header: "Trạng thái", cell: (l) => <StatusBadge status={l.status} /> },
    {
      key: "actions",
      header: "",
      cell: (l) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <IconButton label="Sửa" onClick={() => router.push(`/admin/bai-hoc/${l.id}`)}>
            <Pencil className="size-4" />
          </IconButton>
          <Dropdown
            trigger={
              <IconButton label="Thao tác khác">
                <MoreHorizontal className="size-4" />
              </IconButton>
            }
            items={[
              { label: "Xem trên trang học", icon: <ExternalLink className="size-4" />, onClick: () => window.open(`/hoc/${l.slug}`, "_blank") },
              ...(canWrite
                ? [
                    { label: "Nhân bản", icon: <Copy className="size-4" />, onClick: () => duplicate(l) },
                    "divider" as const,
                    { label: "Xoá", icon: <Trash2 className="size-4" />, danger: true, onClick: () => remove(l) },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bài học"
        subtitle="Tất cả bài học trên mọi khóa học: video, nội dung, từ vựng, ngữ pháp và tài liệu."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Bài học" }]}
        actions={
          canWrite && (
            <Button icon={<Plus className="size-4" />} onClick={() => router.replace(`${pathname}?new=1`, { scroll: false })}>
              Tạo bài học
            </Button>
          )
        }
      />
      <TableCard
        table={t}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/bai-hoc/${r.id}`)}
        placeholder="Tìm bài học…"
        filters={[
          { key: "courseId", label: "Khóa học", options: courses.data ?? [] },
          ...(courseId ? [{ key: "moduleId", label: "Chương", options: (modules.data ?? []).map((m) => ({ value: m.value, label: m.label })) }] : []),
          { key: "type", label: "Loại bài", options: TYPE_OPTIONS },
          { key: "status", label: "Trạng thái", options: STATUS_OPTIONS },
          { key: "isFree", label: "Học thử", options: [{ value: "true", label: "Miễn phí (học thử)" }, { value: "false", label: "Có phí" }] },
        ]}
      />
      <CreateLessonModal open={creating} onClose={closeCreate} defaultCourse={courseId} />
    </div>
  );
}

function CreateLessonModal({ open, onClose, defaultCourse }: { open: boolean; onClose: () => void; defaultCourse?: string }) {
  const router = useRouter();
  const courses = useApi<{ value: string; label: string }[]>(open ? "/admin/options/courses" : null);
  const f = useForm({ courseId: defaultCourse ?? "", moduleId: "", title: "", type: "video" });
  const modules = useApi<ModuleOption[]>(open && f.values.courseId ? `/admin/modules${qs({ courseId: f.values.courseId })}` : null);
  const firstModule = modules.data?.[0]?.value;
  const { set } = f;

  useEffect(() => {
    if (firstModule && !f.values.moduleId) set("moduleId", firstModule);
  }, [firstModule, f.values.moduleId, set]);

  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const r = await f.submit((v) => api<{ id: string }>("/admin/lessons", { body: { moduleId: v.moduleId, title: v.title, type: v.type, status: "draft" } }));
      invalidate("/admin/lessons");
      invalidate("/admin/courses");
      toast.success("Đã tạo bài học");
      if (r) router.push(`/admin/bai-hoc/${r.id}`);
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
      title="Tạo bài học mới"
      description="Chọn khóa học và chương, sau đó soạn nội dung chi tiết ở trang chỉnh sửa."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={create} loading={busy} disabled={!f.values.moduleId || !f.values.title.trim()}>
            Tạo & soạn nội dung
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Khóa học" required>
          <Select
            value={f.values.courseId}
            onChange={(e) => {
              f.set("courseId", e.target.value);
              f.set("moduleId", "");
            }}
            options={courses.data ?? []}
            placeholder="— Chọn khóa học —"
          />
        </Field>
        <Field label="Chương" required error={f.errors.moduleId} hint={f.values.courseId && modules.data && !modules.data.length ? "Khóa học chưa có chương — hãy thêm chương ở tab Chương trình." : undefined}>
          <Select value={f.values.moduleId} onChange={f.input("moduleId")} options={(modules.data ?? []).map((m) => ({ value: m.value, label: m.label }))} placeholder="— Chọn chương —" />
        </Field>
        <Field label="Tên bài học" required error={f.errors.title}>
          <Input value={f.values.title} onChange={f.input("title")} placeholder="VD: Thể て (Te-form)" onKeyDown={(e) => e.key === "Enter" && create()} />
        </Field>
        <Field label="Loại bài">
          <Select value={f.values.type} onChange={f.input("type")} options={TYPE_OPTIONS} />
        </Field>
      </div>
    </Modal>
  );
}
