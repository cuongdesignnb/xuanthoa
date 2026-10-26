"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Film, Loader2, X, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { api, ApiError, upload } from "@/lib/api";
import { invalidate } from "@/lib/hooks";
import { cx } from "../ui";
import { fmtBytes } from "./shared";

export type VideoRow = {
  id: string;
  title: string;
  source: "upload" | "youtube";
  youtubeId: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  durationSec: number | null;
  thumbnailUrl: string | null;
  sizeBytes: number | null;
  error: string | null;
  createdAt: string;
  lessonCount?: number;
};

export const fmtDuration = (s: number | null | undefined) => {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export function VideoThumb({ v, className }: { v: Pick<VideoRow, "thumbnailUrl" | "durationSec" | "status" | "source">; className?: string }) {
  return (
    <div className={cx("relative aspect-video shrink-0 overflow-hidden rounded-lg bg-ink/90", className)}>
      {v.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-white/40">
          {v.status === "processing" ? <Loader2 className="size-5 animate-spin" /> : <Film className="size-5" />}
        </div>
      )}
      {v.durationSec ? (
        <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-semibold tabular-nums text-white">{fmtDuration(v.durationSec)}</span>
      ) : null}
      {v.source === "youtube" && <span className="absolute left-1 top-1 rounded bg-red-600 px-1 text-[9px] font-bold text-white">YT</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upload video + theo dõi trạng thái xử lý                             */
/* ------------------------------------------------------------------ */

export type VideoJob = {
  key: string;
  name: string;
  size: number;
  progress: number;
  phase: "uploading" | "processing" | "ready" | "failed";
  error?: string;
  video?: VideoRow;
  queue?: number;
};

export function useVideoUploader(onReady?: (v: VideoRow) => void) {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const n = useRef(0);
  const cb = useRef(onReady);
  useEffect(() => {
    cb.current = onReady;
  });
  const patch = (key: string, p: Partial<VideoJob>) => setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...p } : j)));

  const poll = useCallback(async (key: string, id: string) => {
    for (let i = 0; i < 1200; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const s = await api<{ status: VideoRow["status"]; error: string | null; queuePosition: number }>(`/admin/videos/${id}/status`);
        if (s.status === "ready") {
          const v = await api<VideoRow>(`/admin/videos/${id}`);
          patch(key, { phase: "ready", video: v });
          invalidate("/admin/videos");
          cb.current?.(v);
          return;
        }
        if (s.status === "failed") {
          patch(key, { phase: "failed", error: s.error ?? "Xử lý video thất bại" });
          invalidate("/admin/videos");
          return;
        }
        patch(key, { queue: s.queuePosition });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          patch(key, { phase: "failed", error: "Video đã bị xoá" });
          return;
        }
      }
    }
  }, []);

  const start = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const key = `v${++n.current}`;
        setJobs((js) => [{ key, name: file.name, size: file.size, progress: 0, phase: "uploading" }, ...js]);
        const fd = new FormData();
        fd.append("title", file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
        fd.append("file", file, file.name);
        try {
          const r = await upload<{ items: VideoRow[] }>("/admin/videos", fd, (p) => patch(key, { progress: p }));
          const v = r.items[0];
          patch(key, { phase: "processing", progress: 100, video: v });
          invalidate("/admin/videos");
          void poll(key, v.id);
        } catch (e) {
          patch(key, { phase: "failed", error: e instanceof Error ? e.message : String(e) });
        }
      }
    },
    [poll],
  );

  const dismiss = (key: string) => setJobs((js) => js.filter((j) => j.key !== key));
  return { jobs, start, dismiss };
}

export function VideoJobs({ jobs, onDismiss }: { jobs: VideoJob[]; onDismiss: (k: string) => void }) {
  if (!jobs.length) return null;
  return (
    <ul className="space-y-1.5">
      {jobs.map((j) => (
        <motion.li key={j.key} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-ink/[.03] px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            {j.phase === "ready" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            ) : j.phase === "failed" ? (
              <XCircle className="size-4 shrink-0 text-red-500" />
            ) : (
              <Loader2 className="size-4 shrink-0 animate-spin text-brand-500" />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{j.name}</span>
            <span className="shrink-0 text-muted">{fmtBytes(j.size)}</span>
            {(j.phase === "ready" || j.phase === "failed") && (
              <button type="button" aria-label="Ẩn" onClick={() => onDismiss(j.key)} className="text-ink/30 hover:text-ink">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {j.phase === "uploading" && (
            <div className="mt-1.5 flex items-center gap-2 pl-6">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                <motion.div className="h-full rounded-full bg-brand-500" animate={{ width: `${j.progress}%` }} />
              </div>
              <span className="w-10 text-right text-[11px] text-muted">{j.progress}%</span>
            </div>
          )}
          {j.phase === "processing" && (
            <div className="mt-1.5 pl-6">
              <div className="h-1.5 overflow-hidden rounded-full bg-sky-100">
                <div className="h-full w-1/3 animate-[vidbar_1.4s_ease-in-out_infinite] rounded-full bg-sky-500" />
              </div>
              <p className="mt-1 text-[11px] text-sky-600">
                Đang mã hoá HLS (AES-128, 720p)…{j.queue && j.queue > 0 ? ` · thứ ${j.queue} trong hàng đợi` : ""}
              </p>
              <style>{`@keyframes vidbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
            </div>
          )}
          {j.phase === "ready" && <p className="mt-1 pl-6 text-[11px] text-emerald-600">Sẵn sàng · {fmtDuration(j.video?.durationSec)} · đã xoá tệp gốc</p>}
          {j.phase === "failed" && <p className="mt-1 pl-6 text-[11px] text-red-500">{j.error}</p>}
        </motion.li>
      ))}
    </ul>
  );
}

/** Tự tải lại khi còn video đang xử lý. */
export function usePollWhile(active: boolean, reload: () => unknown, ms = 3000) {
  const r = useRef(reload);
  useEffect(() => {
    r.current = reload;
  });
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => r.current(), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}
