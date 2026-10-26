"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ClipboardList,
  FileQuestion,
  FileText,
  GripVertical,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, Card, Dropdown, EmptyState, IconButton, Input, StatusBadge, cx, toast, useConfirm } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { invalidate } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { mmss } from "@/components/courses/types";

export type AdminLessonRow = {
  id: string;
  moduleId: string;
  order: number;
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
};
export type AdminModule = { id: string; courseId: string; order: number; title: string; description: string | null; lessons: AdminLessonRow[] };

const TYPE_ICON = { video: PlayCircle, text: FileText, quiz: FileQuestion } as const;

type Drag = { kind: "module"; id: string } | { kind: "lesson"; id: string; from: string } | null;

export default function Curriculum({
  course,
  onChange,
  reload,
}: {
  course: { id: string; slug: string; modules: AdminModule[] };
  onChange: (m: AdminModule[]) => void;
  reload: () => void;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const { can } = useAuth();
  const canWrite = can("courses.write");
  const modules = course.modules;
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(modules.map((m, i) => [m.id, i < 2])));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [newModule, setNewModule] = useState("");
  const [newLesson, setNewLesson] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<Drag>(null);
  const [over, setOver] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = () => {
    invalidate(`/public/courses/${course.slug}`);
    invalidate("/admin/lessons");
  };

  const run = async (fn: () => Promise<unknown>, msg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (msg) toast.success(msg);
      done();
    } catch (e) {
      toast.error(e);
      reload();
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ Chương ------------------------------ */

  const addModule = () =>
    newModule.trim() &&
    run(async () => {
      const m = await api<AdminModule>(`/admin/courses/${course.id}/modules`, { body: { title: newModule.trim() } });
      onChange([...modules, { ...m, lessons: [] }]);
      setOpen((o) => ({ ...o, [m.id]: true }));
      setNewModule("");
    }, "Đã thêm chương");

  const saveModule = (m: AdminModule) =>
    run(async () => {
      await api(`/admin/modules/${m.id}`, { method: "PATCH", body: { title: draft.title, description: draft.description || null } });
      onChange(modules.map((x) => (x.id === m.id ? { ...x, title: draft.title, description: draft.description || null } : x)));
      setEditing(null);
    }, "Đã đổi tên chương");

  const deleteModule = async (m: AdminModule) => {
    const ok = await confirm({
      title: `Xoá chương “${m.title}”?`,
      message: m.lessons.length ? `${m.lessons.length} bài học trong chương cũng sẽ bị xoá.` : undefined,
      confirmText: "Xoá chương",
      danger: true,
    });
    if (!ok) return;
    run(async () => {
      await api(`/admin/modules/${m.id}`, { method: "DELETE" });
      onChange(modules.filter((x) => x.id !== m.id));
    }, "Đã xoá chương");
  };

  const reorderModules = (ids: string[]) =>
    run(async () => {
      onChange(ids.map((id, i) => ({ ...modules.find((m) => m.id === id)!, order: i + 1 })));
      await api(`/admin/courses/${course.id}/modules/reorder`, { body: { ids } });
    });

  const moveModule = (i: number, dir: -1 | 1) => {
    const ids = modules.map((m) => m.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderModules(ids);
  };

  /* ------------------------------ Bài học ------------------------------ */

  const addLesson = (m: AdminModule) => {
    const title = newLesson[m.id]?.trim();
    if (!title) return;
    run(async () => {
      const l = await api<AdminLessonRow & { video: unknown }>("/admin/lessons", { body: { moduleId: m.id, title, status: "draft" } });
      onChange(
        modules.map((x) =>
          x.id === m.id
            ? { ...x, lessons: [...x.lessons, { ...l, hasVideo: false, vocabCount: 0, moduleId: m.id }] }
            : x,
        ),
      );
      setNewLesson((s) => ({ ...s, [m.id]: "" }));
    }, "Đã thêm bài học (bản nháp)");
  };

  const setLessonOrder = (moduleId: string, ids: string[], allLessons: AdminLessonRow[]) =>
    run(async () => {
      onChange(
        modules.map((x) => {
          const rest = x.lessons.filter((l) => !ids.includes(l.id));
          if (x.id !== moduleId) return { ...x, lessons: rest };
          return { ...x, lessons: ids.map((id, i) => ({ ...allLessons.find((l) => l.id === id)!, moduleId, order: i + 1 })) };
        }),
      );
      await api(`/admin/modules/${moduleId}/lessons/reorder`, { body: { ids } });
    });

  const moveLesson = (m: AdminModule, i: number, dir: -1 | 1) => {
    const ids = m.lessons.map((l) => l.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setLessonOrder(m.id, ids, m.lessons);
  };

  const moveToModule = (l: AdminLessonRow, target: AdminModule) =>
    run(async () => {
      await api(`/admin/lessons/${l.id}/move`, { body: { moduleId: target.id } });
      onChange(
        modules.map((x) =>
          x.id === target.id
            ? { ...x, lessons: [...x.lessons.filter((y) => y.id !== l.id), { ...l, moduleId: target.id }] }
            : { ...x, lessons: x.lessons.filter((y) => y.id !== l.id) },
        ),
      );
    }, `Đã chuyển sang “${target.title}”`);

  const patchLesson = (l: AdminLessonRow, body: Partial<AdminLessonRow>, msg: string) =>
    run(async () => {
      await api(`/admin/lessons/${l.id}`, { method: "PATCH", body });
      onChange(modules.map((x) => ({ ...x, lessons: x.lessons.map((y) => (y.id === l.id ? { ...y, ...body } : y)) })));
    }, msg);

  const deleteLesson = async (l: AdminLessonRow) => {
    if (!(await confirm({ title: `Xoá bài “${l.title}”?`, message: "Từ vựng, tài liệu, bình luận và tiến độ của bài cũng bị xoá.", confirmText: "Xoá", danger: true }))) return;
    run(async () => {
      await api(`/admin/lessons/${l.id}`, { method: "DELETE" });
      onChange(modules.map((x) => ({ ...x, lessons: x.lessons.filter((y) => y.id !== l.id) })));
    }, "Đã xoá bài học");
  };

  /* ------------------------------ Kéo thả ------------------------------ */

  const dropOnModule = (target: AdminModule) => {
    if (!drag) return;
    if (drag.kind === "module" && drag.id !== target.id) {
      const ids = modules.map((m) => m.id).filter((id) => id !== drag.id);
      ids.splice(ids.indexOf(target.id), 0, drag.id);
      reorderModules(ids);
    }
    if (drag.kind === "lesson" && drag.from !== target.id) {
      const l = modules.flatMap((m) => m.lessons).find((x) => x.id === drag.id);
      if (l) moveToModule(l, target);
    }
    setDrag(null);
    setOver(null);
  };

  const dropOnLesson = (target: AdminLessonRow, m: AdminModule) => {
    if (drag?.kind !== "lesson" || drag.id === target.id) return;
    const all = modules.flatMap((x) => x.lessons);
    const ids = m.lessons.map((l) => l.id).filter((id) => id !== drag.id);
    ids.splice(ids.indexOf(target.id), 0, drag.id);
    setLessonOrder(m.id, ids, all);
    setDrag(null);
    setOver(null);
  };

  const total = modules.reduce((s, m) => s + m.lessons.length, 0);
  const totalSec = modules.reduce((s, m) => s + m.lessons.reduce((a, l) => a + l.durationSec, 0), 0);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm">
          <b>{modules.length}</b> chương · <b>{total}</b> bài học · tổng <b>{Math.round(totalSec / 60)}</b> phút
          <p className="text-xs text-muted">Kéo thả biểu tượng ⋮⋮ (hoặc dùng mũi tên) để sắp xếp; kéo bài học thả vào tiêu đề chương khác để chuyển chương.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const allOpen = modules.every((m) => open[m.id]);
            setOpen(Object.fromEntries(modules.map((m) => [m.id, !allOpen])));
          }}
        >
          {modules.every((m) => open[m.id]) ? "Thu gọn tất cả" : "Mở rộng tất cả"}
        </Button>
      </Card>

      {!modules.length && <EmptyState title="Chưa có chương nào" description="Thêm chương đầu tiên để bắt đầu xây dựng chương trình học." />}

      {modules.map((m, i) => {
        const isOpen = !!open[m.id];
        const sec = m.lessons.reduce((a, l) => a + l.durationSec, 0);
        return (
          <Card
            key={m.id}
            className={cx("overflow-hidden transition", over === m.id && "ring-2 ring-brand-300", busy && "opacity-90")}
            onDragOver={(e) => {
              if (!drag) return;
              e.preventDefault();
              setOver(m.id);
            }}
            onDragLeave={() => setOver((o) => (o === m.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              dropOnModule(m);
            }}
          >
            <div className="flex items-center gap-2 border-b border-ink/5 bg-ink/[.02] px-3 py-2.5">
              {canWrite && (
                <span
                  draggable
                  onDragStart={() => setDrag({ kind: "module", id: m.id })}
                  onDragEnd={() => (setDrag(null), setOver(null))}
                  className="cursor-grab text-ink/30 hover:text-ink/60"
                  title="Kéo để sắp xếp chương"
                >
                  <GripVertical className="size-4" />
                </span>
              )}
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-sm font-extrabold text-brand-500 shadow-sm">{String(i + 1).padStart(2, "0")}</span>
              {editing === m.id ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input className="h-9 min-w-[200px] flex-1" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} autoFocus onKeyDown={(e) => e.key === "Enter" && saveModule(m)} />
                  <Input className="h-9 min-w-[200px] flex-1" value={draft.description} placeholder="Mô tả ngắn" onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && saveModule(m)} />
                  <IconButton label="Lưu" onClick={() => saveModule(m)} disabled={!draft.title.trim()}>
                    <Check className="size-4" />
                  </IconButton>
                  <IconButton label="Huỷ" onClick={() => setEditing(null)}>
                    <X className="size-4" />
                  </IconButton>
                </div>
              ) : (
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => ({ ...o, [m.id]: !isOpen }))}>
                  <p className="truncate font-bold">{m.title}</p>
                  <p className="truncate text-[11px] text-muted">
                    {m.lessons.length} bài · {Math.round(sec / 60)} phút{m.description ? ` · ${m.description}` : ""}
                  </p>
                </button>
              )}
              {canWrite && editing !== m.id && (
                <div className="flex shrink-0 items-center">
                  <IconButton label="Lên" onClick={() => moveModule(i, -1)} disabled={i === 0}>
                    <ArrowUp className="size-4" />
                  </IconButton>
                  <IconButton label="Xuống" onClick={() => moveModule(i, 1)} disabled={i === modules.length - 1}>
                    <ArrowDown className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Đổi tên"
                    onClick={() => {
                      setEditing(m.id);
                      setDraft({ title: m.title, description: m.description ?? "" });
                    }}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label="Xoá chương" onClick={() => deleteModule(m)} className="hover:!text-red-600">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              )}
              <IconButton label={isOpen ? "Thu gọn" : "Mở rộng"} onClick={() => setOpen((o) => ({ ...o, [m.id]: !isOpen }))}>
                <ChevronDown className={cx("size-4 transition-transform", isOpen && "rotate-180")} />
              </IconButton>
            </div>

            {isOpen && (
              <div>
                {!m.lessons.length && <p className="px-4 py-4 text-center text-xs text-muted">Chưa có bài học — thêm bài hoặc kéo bài từ chương khác vào đây.</p>}
                <ul className="divide-y divide-ink/5">
                  {m.lessons.map((l, j) => {
                    const Icon = TYPE_ICON[l.type];
                    return (
                      <li
                        key={l.id}
                        onDragOver={(e) => {
                          if (drag?.kind !== "lesson") return;
                          e.preventDefault();
                          e.stopPropagation();
                          setOver(l.id);
                        }}
                        onDrop={(e) => {
                          if (drag?.kind !== "lesson") return;
                          e.preventDefault();
                          e.stopPropagation();
                          dropOnLesson(l, m);
                        }}
                        className={cx("group flex items-center gap-2 px-3 py-2 text-sm transition hover:bg-brand-50/40", over === l.id && "border-t-2 border-brand-400", drag?.kind === "lesson" && drag.id === l.id && "opacity-40")}
                      >
                        {canWrite && (
                          <span
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDrag({ kind: "lesson", id: l.id, from: m.id });
                            }}
                            onDragEnd={() => (setDrag(null), setOver(null))}
                            className="cursor-grab text-ink/25 hover:text-ink/60"
                            title="Kéo để sắp xếp / chuyển chương"
                          >
                            <GripVertical className="size-4" />
                          </span>
                        )}
                        <span className="w-12 shrink-0 text-xs font-semibold text-muted">Bài {j + 1}</span>
                        <Icon className="size-4 shrink-0 text-brand-400" />
                        <Link href={`/admin/bai-hoc/${l.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-brand-500">
                          {l.title}
                        </Link>
                        <span className="hidden items-center gap-1.5 md:flex">
                          {l.isFree && <Badge tone="green">Học thử</Badge>}
                          {l.status !== "published" && <StatusBadge status={l.status} />}
                          {!l.hasVideo && l.type === "video" && <Badge tone="amber">Thiếu video</Badge>}
                          {l.vocabCount > 0 && <Badge tone="violet">{l.vocabCount} từ</Badge>}
                          {l.hasDocs && <FileText className="size-3.5 text-muted" />}
                          {l.hasExercise && <ClipboardList className="size-3.5 text-muted" />}
                        </span>
                        <span className="hidden w-14 shrink-0 text-right text-xs text-muted sm:block">{mmss(l.durationSec)}</span>
                        {canWrite && (
                          <div className="flex shrink-0 items-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                            <IconButton label="Lên" onClick={() => moveLesson(m, j, -1)} disabled={j === 0}>
                              <ArrowUp className="size-3.5" />
                            </IconButton>
                            <IconButton label="Xuống" onClick={() => moveLesson(m, j, 1)} disabled={j === m.lessons.length - 1}>
                              <ArrowDown className="size-3.5" />
                            </IconButton>
                            <Dropdown
                              trigger={
                                <IconButton label="Thao tác">
                                  <span className="text-base leading-none">⋯</span>
                                </IconButton>
                              }
                              items={[
                                { label: "Chỉnh sửa bài học", icon: <Pencil className="size-4" />, onClick: () => router.push(`/admin/bai-hoc/${l.id}`) },
                                { label: l.isFree ? "Bỏ học thử" : "Cho học thử miễn phí", icon: <PlayCircle className="size-4" />, onClick: () => patchLesson(l, { isFree: !l.isFree }, "Đã cập nhật") },
                                l.status === "published"
                                  ? { label: "Ẩn (nháp)", icon: <X className="size-4" />, onClick: () => patchLesson(l, { status: "draft" }, "Đã ẩn bài học") }
                                  : { label: "Xuất bản", icon: <Check className="size-4" />, onClick: () => patchLesson(l, { status: "published" }, "Đã xuất bản bài học") },
                                ...modules
                                  .filter((x) => x.id !== m.id)
                                  .map((x) => ({ label: `Chuyển sang: ${x.title}`, icon: <ArrowDown className="size-4 -rotate-90" />, onClick: () => moveToModule(l, x) })),
                                "divider" as const,
                                { label: "Xoá bài học", icon: <Trash2 className="size-4" />, danger: true, onClick: () => deleteLesson(l) },
                              ]}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {canWrite && (
                  <div className="flex gap-2 border-t border-ink/5 bg-ink/[.015] px-3 py-2.5">
                    <Input
                      className="h-9"
                      value={newLesson[m.id] ?? ""}
                      onChange={(e) => setNewLesson((s) => ({ ...s, [m.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addLesson(m)}
                      placeholder="Tên bài học mới…"
                    />
                    <Button size="sm" variant="soft" icon={<Plus className="size-3.5" />} onClick={() => addLesson(m)} disabled={!newLesson[m.id]?.trim()}>
                      Thêm bài
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {canWrite && (
        <Card className="flex gap-2 p-3">
          <Input value={newModule} onChange={(e) => setNewModule(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addModule()} placeholder="Tên chương mới, VD: Chương 7: Ôn tập" />
          <Button icon={<Plus className="size-4" />} onClick={addModule} disabled={!newModule.trim()}>
            Thêm chương
          </Button>
        </Card>
      )}
    </div>
  );
}
