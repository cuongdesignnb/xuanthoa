"use client";

/** Chọn ảnh/tệp từ Media Library (có upload ngay trong hộp thoại — ảnh tự chuyển WebP). */
import { useState } from "react";
import { Check, Search } from "lucide-react";
import { Button, EmptyState, ErrorState, Input, Modal, Select, Skeleton, cx, type MediaItem, type MediaPickerProps } from "../ui";
import { useApi, useDebounced } from "@/lib/hooks";
import { qs, type Paged } from "@/lib/api";
import { DropZone, MediaThumb, UploadQueue, fmtBytes, useUploader } from "./shared";

type Folders = { items: { folder: string; count: number }[]; total: number };

export default function MediaPicker({ open, onClose, onSelect, folder, accept = "image" }: MediaPickerProps) {
  return (
    <Modal open={open} onClose={onClose} title="Media Library" description={accept === "image" ? "Chọn ảnh hoặc tải ảnh mới (tự chuyển WebP)" : "Chọn tệp hoặc tải tệp mới"} size="xl">
      {open && <PickerBody onSelect={onSelect} onClose={onClose} folder={folder} accept={accept} />}
    </Modal>
  );
}

function PickerBody({ onSelect, onClose, folder, accept }: Omit<MediaPickerProps, "open">) {
  const [q, setQ] = useState("");
  const [filterFolder, setFilterFolder] = useState("");
  const [limit, setLimit] = useState(30);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const dq = useDebounced(q, 300);
  const path = `/admin/media${qs({ q: dq, folder: filterFolder, type: accept === "image" ? "image" : undefined, pageSize: limit, page: 1 })}`;
  const { data, loading, error, reload } = useApi<Paged<MediaItem>>(path, { dedupeMs: 0 });
  const folders = useApi<Folders>("/admin/media/folders");
  const up = useUploader({ folder, onUploaded: (m) => setSelected(m) });

  const items = data?.items ?? [];
  const pick = (m: MediaItem) => {
    onSelect(m);
    onClose();
  };

  return (
    <div className="space-y-3">
      <DropZone
        compact
        accept={accept === "image" ? "image/*" : undefined}
        onFiles={up.start}
        hint={accept === "image" ? "JPG, PNG, GIF, WebP, AVIF… → WebP tự động" : undefined}
      />
      <UploadQueue jobs={up.jobs} onClear={up.clearDone} onDismiss={up.dismiss} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, mô tả…" leftIcon={<Search className="size-4" />} />
        </div>
        <Select
          className="sm:w-56"
          value={filterFolder}
          onChange={(e) => setFilterFolder(e.target.value)}
          placeholder="Tất cả thư mục"
          options={(folders.data?.items ?? []).map((f) => ({ value: f.folder, label: `${f.folder} (${f.count})` }))}
        />
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState title="Chưa có tệp nào" description="Kéo thả tệp vào khung phía trên để tải lên." />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {items.map((m) => {
            const on = selected?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m)}
                onDoubleClick={() => pick(m)}
                title={m.filename}
                className={cx(
                  "group relative aspect-square overflow-hidden rounded-xl bg-ink/[.04] ring-2 transition",
                  on ? "ring-brand-500" : "ring-transparent hover:ring-brand-200",
                )}
              >
                <MediaThumb item={m} className="transition group-hover:scale-105" />
                {on && (
                  <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-brand-500 text-white shadow">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  {m.filename}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {data && data.total > items.length && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => setLimit((l) => Math.min(200, l + 30))}>
            Xem thêm ({data.total - items.length})
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-4 flex flex-col gap-2 border-t border-ink/5 bg-white px-5 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 text-xs text-muted">
          {selected ? (
            <span className="block truncate">
              <b className="text-ink">{selected.filename}</b>
              {selected.width ? ` · ${selected.width}×${selected.height}` : ""} · {fmtBytes(selected.size)}
            </span>
          ) : (
            "Nhấp để chọn, nhấp đúp để chọn nhanh"
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button disabled={!selected || up.busy} onClick={() => selected && pick(selected)}>
            Chọn {accept === "image" ? "ảnh" : "tệp"}
          </Button>
        </div>
      </div>
    </div>
  );
}
