"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, File, FileArchive, FileAudio, FileSpreadsheet, FileText, Loader2, UploadCloud, X, XCircle } from "lucide-react";
import { ApiError, upload } from "@/lib/api";
import { invalidate } from "@/lib/hooks";
import { cx, type MediaItem } from "../ui";

export type UploadedMedia = MediaItem & { originalSize: number; savedPercent: number; converted: boolean };

export function fmtBytes(n: number | null | undefined) {
  const v = n ?? 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} KB`;
  if (v < 1024 ** 3) return `${(v / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
  return `${(v / 1024 ** 3).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} GB`;
}

export const isImage = (m: { mime: string }) => m.mime.startsWith("image/");

export function FileIcon({ mime, className }: { mime: string; className?: string }) {
  const I = mime.startsWith("audio/")
    ? FileAudio
    : mime.includes("sheet") || mime.includes("excel") || mime === "text/csv"
      ? FileSpreadsheet
      : mime.includes("zip")
        ? FileArchive
        : mime.includes("pdf") || mime.includes("word") || mime.startsWith("text/")
          ? FileText
          : File;
  return <I className={className} />;
}

/** Ô xem trước (ảnh hoặc icon tệp). */
export function MediaThumb({ item, className }: { item: MediaItem; className?: string }) {
  if (isImage(item))
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={item.alt ?? ""} loading="lazy" draggable={false} className={cx("size-full object-cover", className)} />;
  const ext = item.filename.split(".").pop()?.toUpperCase();
  return (
    <div className={cx("grid size-full place-items-center bg-gradient-to-br from-brand-50 to-white text-brand-400", className)}>
      <div className="flex flex-col items-center gap-1">
        <FileIcon mime={item.mime} className="size-8" />
        <span className="rounded bg-white px-1.5 text-[10px] font-bold text-ink/60 shadow-sm">{ext}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hàng đợi upload (mỗi tệp một request để có tiến độ riêng)            */
/* ------------------------------------------------------------------ */

export type UploadJob = {
  key: string;
  name: string;
  size: number;
  progress: number;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  error?: string;
  result?: UploadedMedia;
};

export function useUploader({ folder, onUploaded }: { folder?: string; onUploaded?: (m: UploadedMedia) => void } = {}) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const counter = useRef(0);
  const cb = useRef(onUploaded);
  useEffect(() => {
    cb.current = onUploaded;
  });

  const patch = (key: string, p: Partial<UploadJob>) => setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...p } : j)));

  const start = useCallback(
    async (files: File[] | FileList) => {
      const list = Array.from(files);
      if (!list.length) return;
      const items = list.map((f) => ({ file: f, key: `u${++counter.current}` }));
      setJobs((js) => [...items.map(({ file, key }) => ({ key, name: file.name, size: file.size, progress: 0, status: "queued" as const })), ...js]);
      let idx = 0;
      const worker = async () => {
        while (idx < items.length) {
          const { file, key } = items[idx++];
          patch(key, { status: "uploading" });
          const fd = new FormData();
          if (folder) fd.append("folder", folder);
          fd.append("file", file, file.name);
          try {
            const res = await upload<{ items: UploadedMedia[]; errors: { name: string; error: string }[] }>("/admin/media", fd, (p) =>
              patch(key, { progress: p, status: p >= 100 ? "processing" : "uploading" }),
            );
            const m = res.items[0];
            if (!m) throw new Error(res.errors[0]?.error ?? "Upload thất bại");
            patch(key, { status: "done", progress: 100, result: m });
            cb.current?.(m);
          } catch (e) {
            patch(key, { status: "error", error: e instanceof ApiError || e instanceof Error ? e.message : String(e) });
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      invalidate("/admin/media");
    },
    [folder],
  );

  const clearDone = () => setJobs((js) => js.filter((j) => j.status !== "done" && j.status !== "error"));
  const dismiss = (key: string) => setJobs((js) => js.filter((j) => j.key !== key));
  const busy = jobs.some((j) => j.status === "queued" || j.status === "uploading" || j.status === "processing");
  return { jobs, start, clearDone, dismiss, busy };
}

export function UploadQueue({ jobs, onClear, onDismiss }: { jobs: UploadJob[]; onClear: () => void; onDismiss: (k: string) => void }) {
  if (!jobs.length) return null;
  const done = jobs.filter((j) => j.status === "done").length;
  return (
    <div className="rounded-xl border border-ink/5 bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold">
          Đã tải {done}/{jobs.length} tệp
        </span>
        <button type="button" onClick={onClear} className="font-semibold text-brand-500 hover:underline">
          Ẩn tệp đã xong
        </button>
      </div>
      <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {jobs.map((j) => (
            <motion.li key={j.key} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="rounded-lg bg-ink/[.025] px-2.5 py-2">
              <div className="flex items-center gap-2 text-xs">
                {j.status === "done" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : j.status === "error" ? (
                  <XCircle className="size-4 shrink-0 text-red-500" />
                ) : (
                  <Loader2 className="size-4 shrink-0 animate-spin text-brand-500" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{j.name}</span>
                <span className="shrink-0 text-muted">{fmtBytes(j.size)}</span>
                {(j.status === "done" || j.status === "error") && (
                  <button type="button" aria-label="Ẩn" onClick={() => onDismiss(j.key)} className="text-ink/30 hover:text-ink">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              {j.status === "uploading" || j.status === "queued" || j.status === "processing" ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <motion.div className="h-full rounded-full bg-brand-500" animate={{ width: `${j.progress}%` }} transition={{ duration: 0.2 }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[11px] text-muted">
                    {j.status === "queued" ? "Đang chờ…" : j.status === "processing" ? "Đang chuyển WebP…" : `${j.progress}%`}
                  </span>
                </div>
              ) : j.status === "done" && j.result ? (
                <p className="mt-1 pl-6 text-[11px] text-emerald-600">
                  {j.result.converted
                    ? `Đã chuyển sang WebP · ${fmtBytes(j.result.originalSize)} → ${fmtBytes(j.result.size)} · ${j.result.savedPercent >= 0 ? `giảm ${j.result.savedPercent}%` : `tăng ${-j.result.savedPercent}%`}`
                    : `Đã lưu · ${fmtBytes(j.result.size)}`}
                </p>
              ) : (
                <p className="mt-1 pl-6 text-[11px] text-red-500">{j.error}</p>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/** Vùng kéo-thả + nút chọn tệp. */
export function DropZone({
  onFiles,
  accept,
  compact,
  hint,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  compact?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled && e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      onClick={() => !disabled && input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      className={cx(
        "flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed text-center transition",
        compact ? "px-4 py-3" : "flex-col px-6 py-8",
        over ? "border-brand-400 bg-brand-50" : "border-ink/10 bg-ink/[.015] hover:border-brand-300 hover:bg-brand-50/40",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span className={cx("grid shrink-0 place-items-center rounded-full bg-brand-50 text-brand-500", compact ? "size-9" : "size-12")}>
        <UploadCloud className={compact ? "size-5" : "size-6"} />
      </span>
      <div className={compact ? "text-left" : ""}>
        <p className="text-sm font-semibold">
          Kéo thả tệp vào đây hoặc <span className="text-brand-500">chọn từ máy</span>
        </p>
        <p className="text-xs text-muted">{hint ?? "Ảnh tự chuyển sang WebP và xoá bản gốc · PDF, DOCX, MP3… tối đa 50MB"}</p>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
