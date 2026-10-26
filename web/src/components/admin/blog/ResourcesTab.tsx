"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, ExternalLink, FileText, Paperclip, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Drawer, Field, IconButton, Input, Select, Switch, toast, useConfirm, type MediaItem } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { useForm } from "@/components/admin/page";
import MediaPicker from "@/components/admin/media/MediaPicker";
import { fileSize } from "@/components/blog/types";
import { api, fmtDate, num } from "@/lib/api";
import { invalidate, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

type Resource = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
  downloads: number;
  isFree: boolean;
  createdAt: string;
};

const TYPES = ["PDF", "DOCX", "XLSX", "PPTX", "ZIP", "MP3", "PNG"].map((v) => ({ value: v, label: v }));
const typeFromName = (name: string) => {
  const ext = name.split(".").pop()?.toUpperCase() ?? "PDF";
  return ext === "DOC" ? "DOCX" : ext.length <= 4 ? ext : "PDF";
};

export default function ResourcesTab() {
  const t = useTable<Resource>("/admin/free-resources", { sort: "createdAt" });
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [edit, setEdit] = useState<Resource | null>(null);
  const creating = sp.get("new") === "1";
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("posts.write");
  const refresh = () => {
    invalidate("/admin/free-resources");
    invalidate("/public/resources");
  };

  const remove = async (ids: string[], clear?: () => void) => {
    if (!(await confirm({ title: `Xoá ${ids.length} tài liệu?`, message: "Học viên sẽ không tải được tài liệu này nữa.", danger: true, confirmText: "Xoá" }))) return;
    try {
      for (const id of ids) await api(`/admin/free-resources/${id}`, { method: "DELETE" });
      toast.success("Đã xoá tài liệu");
      clear?.();
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const cols: Column<Resource>[] = [
    {
      key: "title",
      header: "Tài liệu",
      sortable: true,
      cell: (r) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <span className="grid h-10 w-9 shrink-0 place-items-center rounded-md bg-brand-500 text-[9px] font-bold text-white">{r.fileType}</span>
          <div className="min-w-0">
            <p className="line-clamp-1 font-semibold">{r.title}</p>
            <p className="truncate text-[11px] text-muted">{r.fileUrl}</p>
          </div>
        </div>
      ),
    },
    { key: "sizeBytes", header: "Dung lượng", sortable: true, cell: (r) => <span className="text-xs">{fileSize(r.sizeBytes)}</span> },
    {
      key: "downloads",
      header: "Lượt tải",
      sortable: true,
      cell: (r) => (
        <span className="flex items-center gap-1 text-xs font-semibold">
          <Download className="size-3.5 text-muted" /> {num(r.downloads)}
        </span>
      ),
    },
    { key: "isFree", header: "Hiển thị", cell: (r) => (r.isFree ? <Badge tone="green" dot>Công khai</Badge> : <Badge tone="gray">Ẩn</Badge>) },
    { key: "createdAt", header: "Ngày tạo", sortable: true, hideOnMobile: true, cell: (r) => <span className="text-xs text-muted">{fmtDate(r.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-20",
      cell: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <a href={r.fileUrl} target="_blank" rel="noreferrer">
            <IconButton label="Mở tệp">
              <ExternalLink className="size-4" />
            </IconButton>
          </a>
          {canWrite && (
            <IconButton label="Xoá" onClick={() => remove([r.id])} className="hover:text-red-600">
              <Trash2 className="size-4" />
            </IconButton>
          )}
        </div>
      ),
    },
  ];

  const close = () => {
    setEdit(null);
    if (creating) router.replace(`${pathname}?tab=resources`, { scroll: false });
  };

  return (
    <>
      <TableCard
        table={t}
        columns={cols}
        rowKey={(r) => r.id}
        onRowClick={canWrite ? setEdit : undefined}
        placeholder="Tìm tài liệu…"
        actions={
          canWrite && (
            <Button icon={<Plus className="size-4" />} onClick={() => router.replace(`${pathname}?tab=resources&new=1`, { scroll: false })}>
              Thêm tài liệu
            </Button>
          )
        }
        bulk={canWrite ? (ids, clear) => <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => remove(ids, clear)}>Xoá</Button> : undefined}
      />
      <ResourceDrawer key={edit?.id ?? (creating ? "new" : "none")} open={!!edit || creating} item={edit} onClose={close} onSaved={refresh} />
    </>
  );
}

function ResourceDrawer({ open, item, onClose, onSaved }: { open: boolean; item: Resource | null; onClose: () => void; onSaved: () => void }) {
  const f = useForm({
    title: item?.title ?? "",
    fileUrl: item?.fileUrl ?? "",
    fileType: item?.fileType ?? "PDF",
    sizeBytes: item?.sizeBytes ?? 0,
    isFree: item?.isFree ?? true,
  });
  const [picker, setPicker] = useState(false);
  const save = async () => {
    try {
      await f.submit((v) => (item ? api(`/admin/free-resources/${item.id}`, { method: "PATCH", body: v }) : api("/admin/free-resources", { body: v })));
      toast.success(item ? "Đã cập nhật tài liệu" : "Đã thêm tài liệu");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };
  const pick = (m: MediaItem) => {
    f.set("fileUrl", m.url);
    f.set("sizeBytes", m.size);
    f.set("fileType", typeFromName(m.originalName || m.filename));
    if (!f.values.title) f.set("title", (m.originalName || m.filename).replace(/\.[^.]+$/, ""));
  };
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={item ? "Sửa tài liệu" : "Thêm tài liệu miễn phí"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} loading={f.submitting}>
            {item ? "Lưu thay đổi" : "Thêm tài liệu"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tên tài liệu" required error={f.errors.title}>
          <Input value={f.values.title} onChange={f.input("title")} placeholder="VD: Tổng hợp từ vựng N5 theo chủ đề" />
        </Field>
        <Field label="Tệp" required error={f.errors.fileUrl} hint="Chọn từ Media Library hoặc dán đường dẫn tệp.">
          <div className="flex gap-2">
            <Input value={f.values.fileUrl} onChange={f.input("fileUrl")} placeholder="/api/files/…" leftIcon={<Paperclip className="size-4" />} />
            <Button variant="outline" icon={<FileText className="size-4" />} onClick={() => setPicker(true)}>
              Chọn tệp
            </Button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Định dạng">
            <Select value={f.values.fileType} onChange={f.input("fileType")} options={TYPES} />
          </Field>
          <Field label="Dung lượng (byte)" hint={fileSize(Number(f.values.sizeBytes) || 0)}>
            <Input type="number" min={0} value={f.values.sizeBytes ?? 0} onChange={f.input("sizeBytes")} />
          </Field>
        </div>
        <Switch checked={f.values.isFree} onChange={(v) => f.set("isFree", v)} label="Hiển thị ở mục “Tài liệu miễn phí” trên blog" />
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onSelect={pick} accept="file" folder="resources" />
    </Drawer>
  );
}
