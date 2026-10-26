"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, ExternalLink, Folder, FolderInput, FolderOpen, HardDrive, Images, LayoutGrid, List as ListIcon, Trash2, Upload } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Modal,
  Skeleton,
  Tabs,
  Textarea,
  cx,
  toast,
  useConfirm,
  type MediaItem,
} from "../ui";
import { BulkBar, DataTable, Pagination, TableToolbar, type Column } from "../table";
import { PageHeader } from "../page";
import { api, fmtDate } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { DropZone, MediaThumb, UploadQueue, fmtBytes, isImage, useUploader } from "./shared";

type Folders = { items: { folder: string; count: number }[]; total: number; size: number };

export default function MediaLibrary() {
  const { can } = useAuth();
  const canWrite = can("media.write");
  const t = useTable<MediaItem>("/admin/media", { pageSize: 24 });
  const folders = useApi<Folders>("/admin/media/folders");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<MediaItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const confirm = useConfirm();
  const folder = t.state.filters.folder ?? "";
  const up = useUploader({ folder: folder || undefined });

  const changeView = (v: "grid" | "list") => setView(v);

  const onFiles = (files: File[]) => {
    if (!canWrite) return toast.error("Bạn không có quyền tải lên");
    setShowUpload(true);
    void up.start(files);
  };

  const bulkDelete = async () => {
    if (!(await confirm({ title: `Xoá ${selected.length} tệp?`, message: "Tệp sẽ bị xoá vĩnh viễn khỏi máy chủ. Các nội dung đang dùng ảnh này sẽ mất ảnh.", danger: true, confirmText: "Xoá" })))
      return;
    try {
      const r = await api<{ deleted: number }>("/admin/media/bulk-delete", { body: { ids: selected } });
      toast.success(`Đã xoá ${r.deleted} tệp`);
      setSelected([]);
      invalidate("/admin/media");
    } catch (e) {
      toast.error(e);
    }
  };

  const columns: Column<MediaItem>[] = [
    {
      key: "filename",
      header: "Tệp",
      sortable: true,
      cell: (m) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-ink/5">
            <MediaThumb item={m} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{m.filename}</p>
            <p className="truncate text-xs text-muted">{m.alt || m.originalName}</p>
          </div>
        </div>
      ),
    },
    { key: "folder", header: "Thư mục", hideOnMobile: true, cell: (m) => <Badge tone="gray">{m.folder}</Badge> },
    { key: "dim", header: "Kích thước", hideOnMobile: true, cell: (m) => (m.width ? `${m.width}×${m.height}` : "—") },
    { key: "size", header: "Dung lượng", sortable: true, cell: (m) => fmtBytes(m.size) },
    { key: "mime", header: "Loại", hideOnMobile: true, cell: (m) => <span className="text-xs text-muted">{m.mime.replace("application/", "")}</span> },
    { key: "createdAt", header: "Ngày tải", sortable: true, hideOnMobile: true, cell: (m) => fmtDate(m.createdAt) },
  ];

  const allIds = t.items.map((m) => m.id);
  const allSel = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  return (
    <div
      onDragEnter={(e) => {
        if (canWrite && e.dataTransfer.types.includes("Files")) setDragging(true);
      }}
      className="relative"
    >
      <PageHeader
        title="Media Library"
        subtitle="Ảnh tải lên được tự động chuyển sang WebP và xoá bản gốc — nhẹ hơn, tải trang nhanh hơn."
        crumbs={[{ label: "Nội dung" }, { label: "Media Library" }]}
        actions={
          canWrite && (
            <Button icon={<Upload className="size-4" />} onClick={() => setShowUpload((s) => !s)}>
              Tải lên
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        {/* Thư mục */}
        <Card className="h-fit p-3 lg:sticky lg:top-20">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-muted">Thư mục</p>
          <div className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
            <FolderBtn active={!folder} label="Tất cả tệp" count={folders.data?.total} onClick={() => t.setFilter("folder", "")} icon={<Images className="size-4" />} />
            {folders.loading && <Skeleton className="h-8 w-full" />}
            {folders.data?.items.map((f) => (
              <FolderBtn key={f.folder} active={folder === f.folder} label={f.folder} count={f.count} onClick={() => t.setFilter("folder", f.folder)} />
            ))}
          </div>
          {folders.data && (
            <div className="mt-3 hidden items-center gap-2 rounded-xl bg-brand-50/60 px-3 py-2.5 text-xs lg:flex">
              <HardDrive className="size-4 text-brand-500" />
              <div>
                <p className="font-semibold">{fmtBytes(folders.data.size)}</p>
                <p className="text-muted">{folders.data.total.toLocaleString("vi-VN")} tệp</p>
              </div>
            </div>
          )}
        </Card>

        <div className="min-w-0 space-y-3">
          {showUpload && canWrite && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <DropZone onFiles={onFiles} hint={`Thư mục: ${folder || "general"} · Ảnh tự chuyển sang WebP và xoá bản gốc · PDF, DOCX, MP3… tối đa 50MB`} />
              <UploadQueue jobs={up.jobs} onClear={up.clearDone} onDismiss={up.dismiss} />
            </motion.div>
          )}

          <Card className="p-4">
            <TableToolbar
              table={t}
              placeholder="Tìm theo tên tệp, mô tả…"
              filters={[
                {
                  key: "type",
                  label: "Mọi loại tệp",
                  options: [
                    { value: "image", label: "Ảnh (WebP)" },
                    { value: "file", label: "Tài liệu / âm thanh" },
                  ],
                },
              ]}
            >
              <Tabs
                size="sm"
                value={view}
                onChange={changeView}
                tabs={[
                  { value: "grid", label: <LayoutGrid className="size-4" aria-label="Lưới" /> },
                  { value: "list", label: <ListIcon className="size-4" aria-label="Danh sách" /> },
                ]}
              />
            </TableToolbar>

            {canWrite && (
              <BulkBar count={selected.length} onClear={() => setSelected([])}>
                <Button size="sm" variant="outline" icon={<FolderInput className="size-4" />} onClick={() => setMoveOpen(true)}>
                  Chuyển thư mục
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={bulkDelete}>
                  Xoá
                </Button>
              </BulkBar>
            )}

            {view === "list" ? (
              <DataTable table={t} columns={columns} rowKey={(m) => m.id} onRowClick={setDetail} selectable={canWrite} selected={selected} onSelectedChange={setSelected} />
            ) : t.error && !t.data ? (
              <ErrorState error={t.error} onRetry={t.reload} />
            ) : t.loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : !t.items.length ? (
              <EmptyState
                icon={<FolderOpen className="size-6" />}
                title="Chưa có tệp nào"
                description="Kéo thả ảnh hoặc tài liệu vào trang này để tải lên."
                action={canWrite && <Button onClick={() => setShowUpload(true)}>Tải lên</Button>}
              />
            ) : (
              <>
                {canWrite && (
                  <div className="mb-2">
                    <Checkbox
                      checked={allSel}
                      indeterminate={!allSel && selected.length > 0}
                      onChange={() => setSelected(allSel ? selected.filter((id) => !allIds.includes(id)) : [...new Set([...selected, ...allIds])])}
                      label={<span className="text-xs text-muted">Chọn tất cả trang này</span>}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                  {t.items.map((m, i) => {
                    const on = selected.includes(m.id);
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.015, 0.2) }}
                        className={cx("group relative overflow-hidden rounded-xl border bg-white transition hover:shadow-md", on ? "border-brand-400 ring-2 ring-brand-200" : "border-ink/5")}
                      >
                        <button type="button" onClick={() => setDetail(m)} className="block aspect-square w-full overflow-hidden bg-ink/[.04]">
                          <MediaThumb item={m} className="transition duration-300 group-hover:scale-105" />
                        </button>
                        {canWrite && (
                          <span className={cx("absolute left-2 top-2 rounded-md bg-white/90 p-0.5 shadow-sm transition", on ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                            <Checkbox checked={on} onChange={(v) => setSelected(v ? [...selected, m.id] : selected.filter((x) => x !== m.id))} />
                          </span>
                        )}
                        {isImage(m) && <span className="absolute right-2 top-2 rounded bg-ink/60 px-1.5 text-[9px] font-bold text-white">WEBP</span>}
                        <div className="px-2.5 py-2">
                          <p className="truncate text-xs font-semibold" title={m.filename}>
                            {m.filename}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {m.width ? `${m.width}×${m.height} · ` : ""}
                            {fmtBytes(m.size)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
            <Pagination table={t as never} />
          </Card>
        </div>
      </div>

      {/* Lớp phủ kéo-thả toàn trang */}
      {dragging && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-brand-500/10 p-6 backdrop-blur-sm"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="pointer-events-none rounded-2xl border-2 border-dashed border-brand-400 bg-white px-10 py-8 text-center shadow-xl">
            <Upload className="mx-auto size-8 text-brand-500" />
            <p className="mt-2 font-bold">Thả tệp để tải lên</p>
            <p className="text-sm text-muted">Thư mục: {folder || "general"}</p>
          </div>
        </div>
      )}

      {detail && <MediaDetail key={detail.id} item={detail} onClose={() => setDetail(null)} canWrite={canWrite} onChanged={setDetail} />}
      <MoveModal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        ids={selected}
        folders={folders.data?.items.map((f) => f.folder) ?? []}
        onDone={() => setSelected([])}
      />
    </div>
  );
}

function FolderBtn({ active, label, count, onClick, icon }: { active: boolean; label: string; count?: number; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
        active ? "bg-brand-50 font-semibold text-brand-600" : "text-ink/70 hover:bg-ink/[.04]",
      )}
    >
      {icon ?? <Folder className="size-4" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-[11px] text-muted">{count}</span>}
    </button>
  );
}

function MediaDetail({ item, onClose, canWrite, onChanged }: { item: MediaItem; onClose: () => void; canWrite: boolean; onChanged: (m: MediaItem) => void }) {
  const [alt, setAlt] = useState(item.alt ?? "");
  const [filename, setFilename] = useState(item.filename);
  const [folder, setFolder] = useState(item.folder);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const confirm = useConfirm();

  const absUrl = typeof window !== "undefined" ? new URL(item.url, window.location.origin).toString() : item.url;
  const dirty = alt !== (item.alt ?? "") || filename !== item.filename || folder !== item.folder;

  const save = async () => {
    setSaving(true);
    try {
      const m = await api<MediaItem>(`/admin/media/${item.id}`, { method: "PATCH", body: { alt: alt || null, filename, folder } });
      toast.success("Đã lưu thông tin tệp");
      onChanged(m);
      invalidate("/admin/media");
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!(await confirm({ title: "Xoá tệp này?", message: `"${item.filename}" sẽ bị xoá vĩnh viễn khỏi máy chủ.`, danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/media/${item.id}`, { method: "DELETE" });
      toast.success("Đã xoá tệp");
      invalidate("/admin/media");
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không sao chép được");
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Chi tiết tệp"
      footer={
        canWrite && (
          <>
            <Button variant="ghost" className="mr-auto text-red-600 hover:bg-red-50" icon={<Trash2 className="size-4" />} onClick={del}>
              Xoá
            </Button>
            <Button onClick={save} loading={saving} disabled={!dirty || !filename.trim()}>
              Lưu thay đổi
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid aspect-video place-items-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#f3f3f6_0_25%,#fff_0_50%)] bg-[length:20px_20px]">
          {isImage(item) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.alt ?? ""} className="max-h-full max-w-full object-contain" />
          ) : item.mime.startsWith("audio/") ? (
            <audio controls src={item.url} className="w-4/5" />
          ) : (
            <div className="size-32">
              <MediaThumb item={item} className="rounded-xl" />
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-ink/[.025] p-3 text-xs">
          <Info label="Định dạng" value={item.mime} />
          <Info label="Dung lượng" value={fmtBytes(item.size)} />
          <Info label="Kích thước" value={item.width ? `${item.width} × ${item.height}px` : "—"} />
          <Info label="Ngày tải" value={fmtDate(item.createdAt, true)} />
          <Info label="Tên gốc" value={item.originalName ?? "—"} className="col-span-2" />
        </dl>
        <Field label="Đường dẫn">
          <div className="flex gap-2">
            <Input readOnly value={absUrl} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
            <IconButton label={copied ? "Đã sao chép" : "Sao chép URL"} onClick={copy} className="size-10 border border-ink/10">
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </IconButton>
            <a href={item.url} target="_blank" rel="noreferrer" className="grid size-10 shrink-0 place-items-center rounded-lg border border-ink/10 text-ink/60 hover:text-brand-500" aria-label="Mở tệp">
              <ExternalLink className="size-4" />
            </a>
          </div>
        </Field>
        <Field label="Tên hiển thị">
          <Input value={filename} onChange={(e) => setFilename(e.target.value)} disabled={!canWrite} />
        </Field>
        {isImage(item) && (
          <Field label="Văn bản thay thế (alt)" hint="Mô tả ngắn nội dung ảnh — tốt cho SEO và người dùng trình đọc màn hình.">
            <Textarea rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} disabled={!canWrite} placeholder="vd: Cô giáo hướng dẫn viết chữ Hán" />
          </Field>
        )}
        <Field label="Thư mục">
          <Input value={folder} onChange={(e) => setFolder(e.target.value)} disabled={!canWrite} />
        </Field>
      </div>
    </Drawer>
  );
}

function Info({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <dt className="text-muted">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  );
}

function MoveModal({ open, onClose, ids, folders, onDone }: { open: boolean; onClose: () => void; ids: string[]; folders: string[]; onDone: () => void }) {
  const [folder, setFolder] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!folder.trim()) return;
    setSaving(true);
    try {
      await api("/admin/media/bulk-move", { body: { ids, folder } });
      toast.success(`Đã chuyển ${ids.length} tệp`);
      invalidate("/admin/media");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Chuyển ${ids.length} tệp`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} loading={saving} disabled={!folder.trim()}>
            Chuyển
          </Button>
        </>
      }
    >
      <Field label="Thư mục đích" hint="Chọn thư mục có sẵn hoặc nhập tên mới.">
        <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="vd: blog, khoa-hoc-n5" list="media-folders" autoFocus />
        <datalist id="media-folders">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </Field>
    </Modal>
  );
}
