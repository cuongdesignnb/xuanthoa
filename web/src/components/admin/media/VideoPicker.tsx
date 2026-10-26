"use client";

/**
 * Chọn nguồn video cho bài học: video đã upload (HLS chống tải) hoặc link YouTube.
 * Link YouTube cũng được lưu thành bản ghi `videos` (source=youtube) nên luôn trả về `videoId`.
 */
import { useState } from "react";
import { Check, Eye, Film, Search, X } from "lucide-react";
import { Button, EmptyState, Input, Modal, Skeleton, StatusBadge, Tabs, cx, toast } from "../ui";
import { api, ApiError, qs, type Paged } from "@/lib/api";
import { invalidate, useApi, useDebounced } from "@/lib/hooks";
import VideoPlayer, { youtubeIdOf } from "@/components/video/VideoPlayer";
import { DropZone } from "./shared";
import { VideoJobs, VideoThumb, fmtDuration, usePollWhile, useVideoUploader, type VideoRow } from "./video-shared";

export type VideoValue = { videoId: string | null; youtubeUrl?: string | null };

export type VideoPickerProps = {
  value: VideoValue;
  onChange: (v: VideoValue) => void;
};

export default function VideoPicker({ value, onChange }: VideoPickerProps) {
  const [tab, setTab] = useState<"upload" | "youtube">(value.youtubeUrl && !value.videoId ? "youtube" : "upload");
  const [preview, setPreview] = useState(false);
  const current = useApi<VideoRow>(value.videoId ? `/admin/videos/${value.videoId}` : null);
  const ytOnly = !value.videoId && youtubeIdOf(value.youtubeUrl);
  const cur = value.videoId ? current.data : null;

  return (
    <div className="space-y-3">
      {/* Video đang chọn */}
      {(value.videoId || ytOnly) && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-2.5">
          {cur ? (
            <VideoThumb v={cur} className="w-28" />
          ) : ytOnly ? (
            <VideoThumb v={{ thumbnailUrl: `https://i.ytimg.com/vi/${ytOnly}/hqdefault.jpg`, durationSec: null, status: "ready", source: "youtube" }} className="w-28" />
          ) : (
            <Skeleton className="aspect-video w-28" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{cur?.title ?? (ytOnly ? `YouTube · ${ytOnly}` : "Đang tải…")}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              {cur && <StatusBadge status={cur.status} />}
              {cur && <span>{cur.source === "youtube" ? "YouTube" : "Video bảo vệ (HLS)"}</span>}
              {cur?.durationSec ? <span>{fmtDuration(cur.durationSec)}</span> : null}
            </div>
          </div>
          <Button type="button" size="sm" variant="ghost" icon={<Eye className="size-4" />} onClick={() => setPreview(true)} disabled={!!cur && cur.status !== "ready"}>
            <span className="hidden sm:inline">Xem</span>
          </Button>
          <button type="button" aria-label="Bỏ chọn video" onClick={() => onChange({ videoId: null, youtubeUrl: null })} className="grid size-8 place-items-center rounded-lg text-ink/40 hover:bg-white hover:text-red-500">
            <X className="size-4" />
          </button>
        </div>
      )}

      <Tabs
        size="sm"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "upload", label: "Video đã tải lên" },
          { value: "youtube", label: "YouTube" },
        ]}
      />
      {tab === "upload" ? (
        <UploadedTab selected={value.videoId} onPick={(v) => onChange({ videoId: v.id, youtubeUrl: null })} />
      ) : (
        <YoutubeTab initial={value.youtubeUrl ?? (cur?.source === "youtube" && cur.youtubeId ? `https://youtu.be/${cur.youtubeId}` : "")} onPick={(v, url) => onChange({ videoId: v.id, youtubeUrl: url })} />
      )}

      <Modal open={preview} onClose={() => setPreview(false)} title={cur?.title ?? "Xem trước video"} size="lg">
        {preview && (cur ? <VideoPlayer videoId={cur.source === "upload" ? cur.id : null} youtube={cur.source === "youtube" ? cur.youtubeId : null} /> : <VideoPlayer youtube={value.youtubeUrl} />)}
      </Modal>
    </div>
  );
}

function UploadedTab({ selected, onPick }: { selected: string | null; onPick: (v: VideoRow) => void }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const list = useApi<Paged<VideoRow>>(`/admin/videos${qs({ source: "upload", q: dq, pageSize: 50 })}`, { dedupeMs: 0 });
  const up = useVideoUploader();
  const items = list.data?.items ?? [];
  usePollWhile(items.some((v) => v.status === "processing"), list.reload);

  return (
    <div className="space-y-2.5">
      <DropZone compact accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v" onFiles={up.start} hint="MP4, MOV, WebM · tự mã hoá HLS AES-128 720p, chống tải xuống" />
      <VideoJobs jobs={up.jobs} onDismiss={up.dismiss} />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm video…" leftIcon={<Search className="size-4" />} />
      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {list.loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
        ) : !items.length ? (
          <EmptyState icon={<Film className="size-6" />} title="Chưa có video nào" description="Kéo thả video vào khung phía trên để tải lên." />
        ) : (
          items.map((v) => {
            const on = v.id === selected;
            const ok = v.status === "ready";
            return (
              <button
                key={v.id}
                type="button"
                disabled={!ok}
                onClick={() => onPick(v)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                  on ? "border-brand-400 bg-brand-50" : "border-ink/5 hover:border-brand-200 hover:bg-brand-50/40",
                )}
              >
                <VideoThumb v={v} className="w-24" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{v.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <StatusBadge status={v.status} />
                    {v.status === "failed" && v.error && <span className="truncate text-red-500">{v.error}</span>}
                  </div>
                </div>
                {on && <Check className="size-5 shrink-0 text-brand-500" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function YoutubeTab({ initial, onPick }: { initial: string; onPick: (v: VideoRow, url: string) => void }) {
  const [url, setUrl] = useState(initial);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const id = youtubeIdOf(url);
  const save = async () => {
    if (!id) return setErr("Link YouTube không hợp lệ");
    setSaving(true);
    setErr(null);
    try {
      const v = await api<VideoRow>("/admin/videos/youtube", { body: { url, title: title.trim() || undefined } });
      invalidate("/admin/videos");
      onPick(v, url.trim());
      toast.success("Đã chọn video YouTube");
    } catch (e) {
      setErr(e instanceof ApiError ? (e.fieldErrors.url ?? e.message) : String(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-2.5">
      <Input
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setErr(null);
        }}
        placeholder="Dán link YouTube: https://www.youtube.com/watch?v=…"
        invalid={!!err}
      />
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề (tuỳ chọn)" />
      {err && <p className="text-xs text-red-500">{err}</p>}
      {id ? (
        <div className="space-y-2">
          <VideoPlayer youtube={id} />
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={save} loading={saving} icon={<Check className="size-4" />}>
              Dùng video này
            </Button>
          </div>
        </div>
      ) : (
        url.trim() && <p className="text-xs text-muted">Không nhận diện được ID video từ link này.</p>
      )}
    </div>
  );
}
