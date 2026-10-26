"use client";

import { useState } from "react";
import { Eye, MoreHorizontal, Pencil, RefreshCw, ShieldCheck, SquarePlay, Trash2, Upload } from "lucide-react";
import { Badge, Button, Dropdown, Field, IconButton, Input, Modal, StatusBadge, toast, useConfirm } from "../ui";
import { TableCard, type Column } from "../table";
import { PageHeader, useForm } from "../page";
import { api, ApiError, fmtDate } from "@/lib/api";
import { invalidate, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import VideoPlayer, { youtubeIdOf } from "@/components/video/VideoPlayer";
import { DropZone, fmtBytes } from "./shared";
import { VideoJobs, VideoThumb, fmtDuration, usePollWhile, useVideoUploader, type VideoRow } from "./video-shared";

export default function VideoLibrary() {
  const { can } = useAuth();
  const canWrite = can("media.write");
  const t = useTable<VideoRow>("/admin/videos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [preview, setPreview] = useState<VideoRow | null>(null);
  const [edit, setEdit] = useState<VideoRow | null>(null);
  const confirm = useConfirm();
  const up = useVideoUploader();

  usePollWhile(t.items.some((v) => v.status === "processing" || v.status === "pending"), t.reload);

  const del = async (v: VideoRow) => {
    const msg = v.lessonCount ? `Video đang được dùng trong ${v.lessonCount} bài học — các bài này sẽ mất video.` : "Video và các tệp HLS mã hoá sẽ bị xoá vĩnh viễn.";
    if (!(await confirm({ title: `Xoá "${v.title}"?`, message: msg, danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/videos/${v.id}`, { method: "DELETE" });
      toast.success("Đã xoá video");
      invalidate("/admin/videos");
    } catch (e) {
      toast.error(e);
    }
  };

  const retry = async (v: VideoRow) => {
    try {
      await api(`/admin/videos/${v.id}/retry`, { method: "POST" });
      toast.info("Đang xử lý lại video");
      invalidate("/admin/videos");
    } catch (e) {
      toast.error(e);
    }
  };

  const columns: Column<VideoRow>[] = [
    {
      key: "title",
      header: "Video",
      sortable: true,
      cell: (v) => (
        <div className="flex min-w-0 items-center gap-3">
          <VideoThumb v={v} className="w-28" />
          <div className="min-w-0">
            <p className="line-clamp-2 font-semibold">{v.title}</p>
            <p className="mt-0.5 text-xs text-muted">{v.lessonCount ? `Dùng trong ${v.lessonCount} bài học` : "Chưa gắn bài học"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "source",
      header: "Nguồn",
      cell: (v) =>
        v.source === "youtube" ? (
          <Badge tone="red">YouTube</Badge>
        ) : (
          <Badge tone="violet">
            <ShieldCheck className="size-3" /> HLS mã hoá
          </Badge>
        ),
    },
    { key: "durationSec", header: "Thời lượng", sortable: true, cell: (v) => <span className="tabular-nums">{fmtDuration(v.durationSec)}</span> },
    { key: "size", header: "Dung lượng", hideOnMobile: true, cell: (v) => (v.sizeBytes ? fmtBytes(v.sizeBytes) : "—") },
    {
      key: "status",
      header: "Trạng thái",
      sortable: true,
      cell: (v) => (
        <div className="max-w-[200px]">
          <StatusBadge status={v.status} />
          {v.status === "failed" && v.error && (
            <p className="mt-1 line-clamp-2 text-[11px] text-red-500" title={v.error}>
              {v.error}
            </p>
          )}
        </div>
      ),
    },
    { key: "createdAt", header: "Ngày tạo", sortable: true, hideOnMobile: true, cell: (v) => fmtDate(v.createdAt) },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (v) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton label="Xem trước" disabled={v.status !== "ready"} onClick={() => setPreview(v)}>
            <Eye className="size-4" />
          </IconButton>
          {canWrite && (
            <Dropdown
              trigger={
                <IconButton label="Thêm">
                  <MoreHorizontal className="size-4" />
                </IconButton>
              }
              items={[
                { label: "Đổi tên", icon: <Pencil className="size-4" />, onClick: () => setEdit(v) },
                ...(v.status === "failed" && v.source === "upload" ? [{ label: "Xử lý lại", icon: <RefreshCw className="size-4" />, onClick: () => retry(v) }] : []),
                "divider" as const,
                { label: "Xoá", icon: <Trash2 className="size-4" />, danger: true, onClick: () => del(v) },
              ]}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Video bài giảng"
        subtitle="Video tải lên được mã hoá HLS AES-128 (720p), khoá cấp qua token ngắn hạn — học viên không tải xuống được."
        crumbs={[{ label: "Nội dung" }, { label: "Video bài giảng" }]}
        actions={
          canWrite && (
            <>
              <Button variant="outline" icon={<SquarePlay className="size-4" />} onClick={() => setYtOpen(true)}>
                Thêm YouTube
              </Button>
              <Button icon={<Upload className="size-4" />} onClick={() => setUploadOpen(true)}>
                Tải video lên
              </Button>
            </>
          )
        }
      />

      {up.jobs.length > 0 && (
        <div className="mb-4 rounded-2xl border border-ink/5 bg-white p-3">
          <VideoJobs jobs={up.jobs} onDismiss={up.dismiss} />
        </div>
      )}

      <TableCard
        table={t}
        columns={columns}
        rowKey={(v) => v.id}
        onRowClick={(v) => v.status === "ready" && setPreview(v)}
        placeholder="Tìm theo tiêu đề, ID YouTube…"
        filters={[
          {
            key: "source",
            label: "Mọi nguồn",
            options: [
              { value: "upload", label: "Video tải lên (HLS)" },
              { value: "youtube", label: "YouTube" },
            ],
          },
          {
            key: "status",
            label: "Mọi trạng thái",
            options: [
              { value: "processing", label: "Đang xử lý" },
              { value: "ready", label: "Sẵn sàng" },
              { value: "failed", label: "Lỗi" },
            ],
          },
        ]}
      />

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Tải video lên" description="Có thể chọn nhiều video. Quá trình mã hoá chạy nền — bạn có thể đóng hộp thoại." size="lg">
        <div className="space-y-3">
          <DropZone accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v" onFiles={up.start} hint="MP4, MOV, WebM · tối đa 2GB · tự chuyển HLS AES-128 720p, tạo ảnh bìa WebP, xoá tệp gốc" />
          <VideoJobs jobs={up.jobs} onDismiss={up.dismiss} />
        </div>
      </Modal>

      <YoutubeModal open={ytOpen} onClose={() => setYtOpen(false)} />
      {edit && <EditModal video={edit} onClose={() => setEdit(null)} />}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title} size="lg">
        {preview && (
          <div className="space-y-2">
            <VideoPlayer videoId={preview.source === "upload" ? preview.id : null} youtube={preview.source === "youtube" ? preview.youtubeId : null} poster={preview.thumbnailUrl} />
            <p className="text-xs text-muted">
              {preview.source === "upload"
                ? "Bản xem trước dùng token ngắn hạn như học viên; watermark email người xem hiển thị trên video."
                : "Video YouTube nhúng qua youtube-nocookie, chặn logo và nút sao chép link."}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function YoutubeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const f = useForm({ url: "", title: "", durationMin: "" as string });
  const id = youtubeIdOf(f.values.url);
  const submit = async () => {
    try {
      const dm = f.values.durationMin.trim();
      const parts = dm.split(":").map(Number);
      const durationSec = !dm ? undefined : parts.length === 2 ? parts[0] * 60 + parts[1] : Math.round(Number(dm) * 60);
      await f.submit((v) => api("/admin/videos/youtube", { body: { url: v.url, title: v.title || undefined, durationSec } }));
      toast.success("Đã thêm video YouTube");
      invalidate("/admin/videos");
      f.reset();
      onClose();
    } catch (e) {
      if (!(e instanceof ApiError && Object.keys(e.fieldErrors).length)) toast.error(e);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm video YouTube"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} loading={f.submitting} disabled={!id}>
            Thêm video
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Link YouTube" required error={f.errors.url}>
          <Input value={f.values.url} onChange={f.input("url")} placeholder="https://www.youtube.com/watch?v=… hoặc https://youtu.be/…" autoFocus invalid={!!f.errors.url} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="Tiêu đề" error={f.errors.title}>
            <Input value={f.values.title} onChange={f.input("title")} placeholder="vd: Bài 12 — Thể て" />
          </Field>
          <Field label="Thời lượng" hint="mm:ss">
            <Input value={f.values.durationMin} onChange={f.input("durationMin")} placeholder="12:30" />
          </Field>
        </div>
        {id ? <VideoPlayer youtube={id} /> : f.values.url.trim() && <p className="text-xs text-red-500">Không nhận diện được ID video.</p>}
      </div>
    </Modal>
  );
}

function EditModal({ video, onClose }: { video: VideoRow; onClose: () => void }) {
  const f = useForm({ title: video.title });
  const submit = async () => {
    try {
      await f.submit((v) => api(`/admin/videos/${video.id}`, { method: "PATCH", body: { title: v.title } }));
      toast.success("Đã đổi tên video");
      invalidate("/admin/videos");
      onClose();
    } catch (e) {
      if (!(e instanceof ApiError && Object.keys(e.fieldErrors).length)) toast.error(e);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Đổi tên video"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} loading={f.submitting} disabled={!f.values.title.trim()}>
            Lưu
          </Button>
        </>
      }
    >
      <Field label="Tiêu đề" required error={f.errors.title}>
        <Input
          value={f.values.title}
          onChange={f.input("title")}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
      </Field>
    </Modal>
  );
}
