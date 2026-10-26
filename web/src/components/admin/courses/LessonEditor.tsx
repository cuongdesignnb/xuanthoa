"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, FileText, Paperclip, Plus, Save, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Modal,
  Select,
  Spinner,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
  toast,
  useConfirm,
  type MediaItem,
} from "@/components/admin/ui";
import { PageHeader, useForm } from "@/components/admin/page";
import RichTextEditor from "@/components/admin/editor/RichTextEditor";
import VideoPicker, { type VideoValue } from "@/components/admin/media/VideoPicker";
import MediaPicker from "@/components/admin/media/MediaPicker";
import { api, qs } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { fileSize, mmss } from "@/components/courses/types";
import VocabEditor, { type AdminVocab } from "./VocabEditor";
import { STATUS_OPTIONS } from "./CourseList";
import { TYPE_OPTIONS } from "./LessonList";

export type Resource = { id: string; title: string; fileUrl: string; fileType: string; sizeBytes: number; isFree: boolean; downloads: number };

type AdminLesson = {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  summary: string | null;
  type: "video" | "text" | "quiz";
  content: string | null;
  grammar: string | null;
  durationSec: number;
  isFree: boolean;
  hasDocs: boolean;
  hasExercise: boolean;
  quizId: string | null;
  status: string;
  module: { id: string; title: string };
  course: { id: string; slug: string; title: string; level: string | null };
  video: { id: string; source: string; youtubeId: string | null; durationSec: number | null } | null;
  videoValue: VideoValue;
  vocab: AdminVocab[];
  resources: Resource[];
};

type ModuleOption = { value: string; label: string; courseId: string; courseTitle: string };

export default function LessonEditor({ id }: { id: string }) {
  const { data, error, loading, reload, mutate } = useApi<AdminLesson>(`/admin/lessons/${id}`, { dedupeMs: 0 });
  if (loading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  if (error || !data) return <ErrorState error={error ?? new Error("Không tìm thấy bài học")} onRetry={reload} />;
  return <Body key={data.id + data.slug} lesson={data} reload={reload} mutate={mutate} />;
}

function Body({ lesson, reload, mutate }: { lesson: AdminLesson; reload: () => void; mutate: (u: (p: AdminLesson | undefined) => AdminLesson) => void }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("courses.write");
  const [tab, setTab] = useState<"content" | "grammar" | "vocab" | "resources">("content");
  const modules = useApi<ModuleOption[]>(`/admin/modules${qs({ courseId: lesson.course.id })}`);
  const quizzes = useApi<{ items: { id: string; title: string; level: string }[] }>(canWrite ? "/admin/quizzes?pageSize=200" : null);

  const f = useForm({
    title: lesson.title,
    slug: lesson.slug,
    summary: lesson.summary ?? "",
    moduleId: lesson.moduleId,
    type: lesson.type,
    isFree: lesson.isFree,
    hasExercise: lesson.hasExercise,
    quizId: lesson.quizId ?? "",
    status: lesson.status,
    durationMin: Math.floor(lesson.durationSec / 60) as number | null,
    durationS: (lesson.durationSec % 60) as number | null,
    content: lesson.content ?? "",
    grammar: lesson.grammar ?? "",
    video: lesson.videoValue as VideoValue,
  });
  const v = f.values;

  useEffect(() => {
    if (!f.dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [f.dirty]);

  // Gợi ý thời lượng từ video đã chọn
  const pickedVideo = useApi<{ durationSec: number | null }>(v.video.videoId ? `/admin/videos/${v.video.videoId}` : null);
  const suggestSec = pickedVideo.data?.durationSec ?? null;

  const save = async () => {
    try {
      const videoChanged = v.video.videoId !== lesson.videoValue.videoId || (v.video.youtubeUrl ?? null) !== (lesson.videoValue.youtubeUrl ?? null);
      const body: Record<string, unknown> = {
        title: v.title,
        slug: v.slug || null,
        summary: v.summary || null,
        moduleId: v.moduleId,
        type: v.type,
        isFree: v.isFree,
        hasExercise: v.hasExercise,
        quizId: v.quizId || null,
        status: v.status,
        durationSec: (v.durationMin ?? 0) * 60 + (v.durationS ?? 0),
        content: v.content || null,
        grammar: v.grammar || null,
      };
      if (videoChanged) body.video = v.video.videoId || v.video.youtubeUrl ? v.video : null;
      await f.submit(() => api(`/admin/lessons/${lesson.id}`, { method: "PATCH", body }));
      toast.success("Đã lưu bài học");
      invalidate("/admin/lessons");
      invalidate(`/admin/courses/${lesson.course.id}`);
      invalidate(`/public/lessons/${lesson.slug}`);
      invalidate(`/public/courses/${lesson.course.slug}`);
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const duplicate = async () => {
    try {
      const r = await api<{ id: string }>(`/admin/lessons/${lesson.id}/duplicate`, { method: "POST" });
      toast.success("Đã nhân bản bài học");
      router.push(`/admin/bai-hoc/${r.id}`);
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: `Xoá bài “${lesson.title}”?`, message: "Không thể hoàn tác.", confirmText: "Xoá", danger: true }))) return;
    try {
      await api(`/admin/lessons/${lesson.id}`, { method: "DELETE" });
      invalidate("/admin/lessons");
      toast.success("Đã xoá bài học");
      router.push(`/admin/khoa-hoc/${lesson.course.id}?tab=curriculum`);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <div>
      <PageHeader
        title={lesson.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lesson.status} />
            <Link href={`/admin/khoa-hoc/${lesson.course.id}?tab=curriculum`} className="hover:text-brand-500">
              {lesson.course.title}
            </Link>
            <span>· {lesson.module.title}</span>
          </span>
        }
        crumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Bài học", href: "/admin/bai-hoc" },
          { label: "Chỉnh sửa" },
        ]}
        actions={
          <>
            {f.dirty && <span className="self-center text-xs font-semibold text-amber-600">● Chưa lưu</span>}
            <Button variant="ghost" icon={<ExternalLink className="size-4" />} onClick={() => window.open(`/hoc/${lesson.slug}`, "_blank")}>
              Xem trước
            </Button>
            {canWrite && (
              <>
                <Button variant="ghost" icon={<Copy className="size-4" />} onClick={duplicate}>
                  Nhân bản
                </Button>
                <Button icon={<Save className="size-4" />} onClick={save} loading={f.submitting} disabled={!f.dirty}>
                  Lưu thay đổi
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <Field label="Tên bài học" required error={f.errors.title}>
              <Input value={v.title} onChange={f.input("title")} />
            </Field>
            <Field label="Tóm tắt" hint="Hiển thị dưới tiêu đề ở trang học.">
              <Textarea rows={2} value={v.summary} onChange={f.input("summary")} />
            </Field>
            <Field label="Video bài giảng" hint={v.type === "video" ? "Video upload (HLS chống tải) hoặc link YouTube." : "Bài không phải dạng video có thể bỏ trống."}>
              <VideoPicker value={v.video} onChange={(x) => f.set("video", x)} />
            </Field>
          </Card>

          <div>
            <Tabs
              className="mb-3 w-fit"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "content", label: "Nội dung" },
                { value: "grammar", label: "Ngữ pháp" },
                { value: "vocab", label: "Từ vựng", count: lesson.vocab.length },
                { value: "resources", label: "Tài liệu", count: lesson.resources.length },
              ]}
            />
            {tab === "content" && (
              <Card className="p-5">
                <RichTextEditor value={v.content} onChange={(h) => f.set("content", h)} toolbar="full" minHeight={360} placeholder="Nội dung bài giảng: giải thích, ví dụ, furigana…" />
              </Card>
            )}
            {tab === "grammar" && (
              <Card className="p-5">
                <RichTextEditor value={v.grammar} onChange={(h) => f.set("grammar", h)} toolbar="full" minHeight={320} placeholder="Bảng chia, mẫu câu, lưu ý ngữ pháp…" />
              </Card>
            )}
            {tab === "vocab" && <VocabEditor lessonId={lesson.id} items={lesson.vocab} onChange={(vocab) => mutate((p) => ({ ...p!, vocab }))} />}
            {tab === "resources" && (
              <ResourcesEditor
                addPath={`/admin/lessons/${lesson.id}/resources`}
                items={lesson.resources}
                onChange={(resources) => {
                  mutate((p) => ({ ...p!, resources, hasDocs: resources.length > 0 }));
                  invalidate(`/public/lessons/${lesson.slug}`);
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <h3 className="font-bold">Thiết lập</h3>
            <Field label="Trạng thái">
              <Select value={v.status} onChange={f.input("status")} options={STATUS_OPTIONS} />
            </Field>
            <Field label="Chương" hint={`Khóa: ${lesson.course.title}`}>
              <Select value={v.moduleId} onChange={f.input("moduleId")} options={(modules.data ?? [{ value: lesson.module.id, label: lesson.module.title, courseId: "", courseTitle: "" }]).map((m) => ({ value: m.value, label: m.label }))} />
            </Field>
            <Field label="Loại bài">
              <Select value={v.type} onChange={f.input("type")} options={TYPE_OPTIONS} />
            </Field>
            <Field label="Đường dẫn (slug)" error={f.errors.slug} hint={`/hoc/${v.slug}`}>
              <Input value={v.slug} onChange={f.input("slug")} />
            </Field>
            <Field
              label="Thời lượng"
              hint={
                suggestSec ? (
                  <button type="button" className="text-brand-500" onClick={() => (f.set("durationMin", Math.floor(suggestSec / 60)), f.set("durationS", suggestSec % 60))}>
                    Dùng thời lượng video ({mmss(suggestSec)})
                  </button>
                ) : (
                  "Phút : giây"
                )
              }
            >
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={v.durationMin ?? ""} onChange={f.input("durationMin")} />
                <span>:</span>
                <Input type="number" min={0} max={59} value={v.durationS ?? ""} onChange={f.input("durationS")} />
              </div>
            </Field>
            <Switch checked={v.isFree} onChange={(x) => f.set("isFree", x)} label="Cho học thử miễn phí" />
            <Switch checked={v.hasExercise} onChange={(x) => f.set("hasExercise", x)} label="Có bài tập đi kèm" />
            {v.hasExercise && (
              <Field label="Bài tập liên kết" hint="Hiển thị nút “Làm bài tập” ở trang học.">
                <Select
                  value={v.quizId}
                  onChange={f.input("quizId")}
                  options={(quizzes.data?.items ?? []).map((q) => ({ value: q.id, label: `${q.level} · ${q.title}` }))}
                  placeholder="— Không liên kết —"
                />
              </Field>
            )}
          </Card>
          <Card className="p-5 text-sm">
            <h3 className="font-bold">Tổng quan</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-muted">
              <li className="flex justify-between">
                Video <span className="font-semibold text-ink">{lesson.video ? (lesson.video.source === "youtube" ? "YouTube" : "Đã upload") : "Chưa có"}</span>
              </li>
              <li className="flex justify-between">
                Từ vựng <span className="font-semibold text-ink">{lesson.vocab.length}</span>
              </li>
              <li className="flex justify-between">
                Tài liệu <span className="font-semibold text-ink">{lesson.resources.length}</span>
              </li>
              <li className="flex justify-between">
                Ngữ pháp <span className="font-semibold text-ink">{lesson.grammar ? "Có" : "Chưa có"}</span>
              </li>
            </ul>
          </Card>
          {canWrite && (
            <Card className="p-5">
              <h3 className="font-bold text-red-600">Xoá bài học</h3>
              <p className="mt-1 text-xs text-muted">Xoá vĩnh viễn bài học cùng từ vựng, tài liệu, bình luận và tiến độ của học viên.</p>
              <Button className="mt-3" size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={remove}>
                Xoá bài học
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tài liệu bài học                                                    */
/* ------------------------------------------------------------------ */

const FILE_TYPES = ["PDF", "DOC", "XLS", "PPT", "ZIP", "MP3", "ANKI"].map((x) => ({ value: x, label: x }));
const typeFromName = (n: string) => {
  const ext = n.split(".").pop()?.toUpperCase() ?? "";
  if (["DOC", "DOCX", "RTF"].includes(ext)) return "DOC";
  if (["XLS", "XLSX", "CSV"].includes(ext)) return "XLS";
  if (["PPT", "PPTX"].includes(ext)) return "PPT";
  if (["ZIP", "RAR", "7Z"].includes(ext)) return "ZIP";
  if (["MP3", "M4A", "WAV"].includes(ext)) return "MP3";
  if (ext === "APKG") return "ANKI";
  return "PDF";
};

export function ResourcesEditor({
  addPath,
  items,
  onChange,
  title = "Tài liệu đính kèm",
  hint = "Học viên đã ghi danh tải được; bật “Miễn phí” để ai cũng tải được.",
}: {
  addPath: string;
  items: Resource[];
  onChange: (r: Resource[]) => void;
  title?: string;
  hint?: string;
}) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const remove = async (r: Resource) => {
    if (!(await confirm({ title: `Xoá tài liệu “${r.title}”?`, danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/course-resources/${r.id}`, { method: "DELETE" });
      onChange(items.filter((x) => x.id !== r.id));
      toast.success("Đã xoá tài liệu");
    } catch (e) {
      toast.error(e);
    }
  };
  const toggleFree = async (r: Resource) => {
    try {
      const u = await api<Resource>(`/admin/resources/${r.id}`, { method: "PATCH", body: { isFree: !r.isFree } });
      onChange(items.map((x) => (x.id === r.id ? u : x)));
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <Button size="sm" variant="soft" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>
          Thêm tài liệu
        </Button>
      </div>
      {!items.length ? (
        <EmptyState icon={<FileText className="size-8" />} title="Chưa có tài liệu" description="Slide, phiếu bài tập, bảng tổng hợp…" />
      ) : (
        <ul className="divide-y divide-ink/5">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-500">{r.fileType}</span>
              <div className="min-w-0 flex-1">
                <a href={r.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:text-brand-500">
                  {r.title}
                </a>
                <p className="text-[11px] text-muted">
                  {fileSize(r.sizeBytes)} · {r.downloads} lượt tải
                </p>
              </div>
              <Switch checked={r.isFree} onChange={() => toggleFree(r)} label={<span className="text-xs">Miễn phí</span>} />
              {r.isFree && <Badge tone="green">Công khai</Badge>}
              <IconButton label="Xoá" onClick={() => remove(r)} className="hover:!text-red-600">
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <AddResourceModal key={String(open)} open={open} addPath={addPath} onClose={() => setOpen(false)} onAdded={(r) => onChange([...items, r])} />
    </Card>
  );
}

function AddResourceModal({ open, addPath, onClose, onAdded }: { open: boolean; addPath: string; onClose: () => void; onAdded: (r: Resource) => void }) {
  const f = useForm({ title: "", fileUrl: "", fileType: "PDF", sizeBytes: 0 as number | null, isFree: false });
  const [picker, setPicker] = useState(false);
  const pick = (m: MediaItem) => {
    f.set("fileUrl", m.url);
    f.set("sizeBytes", m.size);
    f.set("fileType", typeFromName(m.originalName || m.filename));
    if (!f.values.title) f.set("title", (m.originalName || m.filename).replace(/\.[^.]+$/, ""));
    setPicker(false);
  };
  const save = async () => {
    try {
      const r = await f.submit((v) => api<Resource>(addPath, { body: { ...v, sizeBytes: v.sizeBytes ?? 0 } }));
      if (r) {
        onAdded(r);
        toast.success("Đã thêm tài liệu");
        onClose();
      }
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm tài liệu"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} loading={f.submitting}>
            Thêm
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tệp" required error={f.errors.fileUrl} hint="Chọn từ Media Library (tải tệp mới ngay trong hộp chọn) hoặc dán đường dẫn.">
          <div className="flex gap-2">
            <Input value={f.values.fileUrl} onChange={f.input("fileUrl")} placeholder="/api/files/…" leftIcon={<Paperclip className="size-4" />} />
            <Button variant="outline" icon={<FileText className="size-4" />} onClick={() => setPicker(true)}>
              Chọn tệp
            </Button>
          </div>
        </Field>
        <Field label="Tên tài liệu" required error={f.errors.title}>
          <Input value={f.values.title} onChange={f.input("title")} placeholder="VD: Slide bài giảng (PDF)" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Định dạng">
            <Select value={f.values.fileType} onChange={f.input("fileType")} options={FILE_TYPES} />
          </Field>
          <Field label="Dung lượng (byte)" hint={fileSize(f.values.sizeBytes ?? 0)}>
            <Input type="number" min={0} value={f.values.sizeBytes ?? ""} onChange={f.input("sizeBytes")} />
          </Field>
        </div>
        <Switch checked={f.values.isFree} onChange={(x) => f.set("isFree", x)} label="Miễn phí (ai cũng tải được)" />
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onSelect={pick} accept="file" folder="resources" />
    </Modal>
  );
}
