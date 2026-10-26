"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, CalendarClock, Eye, FileText, Mail, Megaphone, Plus, Send, Smartphone, Trash2, Users, X } from "lucide-react";
import { api, ApiError, fmtDate, num } from "@/lib/api";
import { invalidate, useApi, useDebounced, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Checkbox, Drawer, Field, Input, Level, Select, Skeleton, Tabs, cx, toast, useConfirm, type Tone } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, StatCard, useForm } from "@/components/admin/page";
import { ProgressBar } from "@/components/admin/charts";
import { LEVEL_OPTIONS } from "./StudentsPage";

const RichTextEditor = dynamic(() => import("@/components/admin/editor/RichTextEditor"), { ssr: false, loading: () => <Skeleton className="h-40" /> });

type Notif = {
  id: string;
  title: string;
  body: string;
  audience: "all" | "students" | "teachers" | "level" | "user";
  level: string | null;
  userId: string | null;
  userName: string | null;
  channels: string[];
  link: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  readCount: number;
  recipients: number;
  status: "sent" | "scheduled" | "draft";
};

const AUDIENCE: Record<Notif["audience"], string> = {
  all: "Tất cả người dùng",
  students: "Tất cả học viên",
  teachers: "Giáo viên",
  level: "Học viên theo cấp độ",
  user: "Một người dùng",
};
const STATUS: Record<Notif["status"], { label: string; tone: Tone }> = {
  sent: { label: "Đã gửi", tone: "green" },
  scheduled: { label: "Đã hẹn giờ", tone: "blue" },
  draft: { label: "Bản nháp", tone: "gray" },
};
const CHANNELS = [
  { value: "in_app", label: "Trong ứng dụng", icon: Bell },
  { value: "email", label: "Email", icon: Mail },
  { value: "push", label: "Push mobile", icon: Smartphone },
];

/** Date → giá trị cho <input type="datetime-local"> theo giờ máy. */
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function NotificationsPage() {
  const { can } = useAuth();
  const writable = can("notifications.write");
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const t = useTable<Notif>("/admin/notifications");
  const counts = (t.data as unknown as { counts?: { sent: number; scheduled: number; draft: number; reads: number } } | undefined)?.counts;
  const [open, setOpen] = useState<Notif | "new" | null>(null);
  const [preset, setPreset] = useState<{ userId: string; userName: string } | null>(null);

  useEffect(() => {
    if (params.get("new") === "1" && writable) {
      const uid = params.get("userId");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreset(uid ? { userId: uid, userName: params.get("userName") ?? "" } : null);
      setOpen("new");
      router.replace(path, { scroll: false });
    }
  }, [params, writable, router, path]);

  const tab = t.state.filters.status ?? "";
  const columns: Column<Notif>[] = [
    {
      key: "title",
      header: "Thông báo",
      sortable: true,
      cell: (r) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate font-semibold">{r.title}</p>
          <p className="truncate text-xs text-muted">{r.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</p>
        </div>
      ),
    },
    {
      key: "audience",
      header: "Đối tượng",
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-xs">
          {r.audience === "level" ? <Level level={r.level} /> : null}
          {r.audience === "user" ? r.userName ?? "Người dùng" : AUDIENCE[r.audience]}
        </span>
      ),
    },
    {
      key: "channels",
      header: "Kênh",
      hideOnMobile: true,
      cell: (r) => (
        <span className="flex gap-1 text-muted">
          {CHANNELS.filter((c) => r.channels.includes(c.value)).map((c) => (
            <c.icon key={c.value} className="size-4" aria-label={c.label} />
          ))}
        </span>
      ),
    },
    {
      key: "reads",
      header: "Đã đọc",
      cell: (r) =>
        r.status === "sent" ? (
          <div className="w-32">
            <p className="text-xs">
              <b>{num(r.readCount)}</b> / {num(r.recipients)}
            </p>
            <ProgressBar value={r.recipients ? (r.readCount / r.recipients) * 100 : 0} tone="brand" />
          </div>
        ) : (
          <span className="text-xs text-muted">~{num(r.recipients)} người nhận</span>
        ),
    },
    {
      key: "scheduledAt",
      header: "Thời gian",
      sortable: true,
      cell: (r) => <span className="text-xs">{fmtDate(r.sentAt ?? r.scheduledAt ?? r.createdAt, true)}</span>,
    },
    { key: "status", header: "Trạng thái", cell: (r) => <Badge tone={STATUS[r.status].tone} dot>{STATUS[r.status].label}</Badge> },
  ];

  return (
    <>
      <PageHeader
        title="Thông báo"
        subtitle="Gửi thông báo trong ứng dụng, email và push tới học viên, giáo viên"
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Thông báo" }]}
        actions={
          writable && (
            <Button icon={<Plus className="size-4" />} onClick={() => (setPreset(null), setOpen("new"))}>
              Soạn thông báo
            </Button>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} icon={<Send className="size-5" />} label="Đã gửi" value={counts ? num(counts.sent) : "…"} tone="green" />
        <StatCard index={1} icon={<CalendarClock className="size-5" />} label="Đang hẹn giờ" value={counts ? num(counts.scheduled) : "…"} tone="blue" />
        <StatCard index={2} icon={<FileText className="size-5" />} label="Bản nháp" value={counts ? num(counts.draft) : "…"} tone="amber" />
        <StatCard index={3} icon={<Eye className="size-5" />} label="Tổng lượt đọc" value={counts ? num(counts.reads) : "…"} tone="violet" />
      </div>
      <Tabs
        value={tab}
        onChange={(v) => t.setFilter("status", v)}
        className="mb-3 w-fit max-w-full"
        tabs={[
          { value: "", label: "Tất cả" },
          { value: "sent", label: "Đã gửi" },
          { value: "scheduled", label: "Hẹn giờ" },
          { value: "draft", label: "Nháp" },
        ]}
      />
      <TableCard
        table={t}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpen(r)}
        placeholder="Tìm theo tiêu đề…"
        filters={[{ key: "audience", label: "Đối tượng", options: Object.entries(AUDIENCE).map(([value, label]) => ({ value, label })) }]}
      />
      {open && <Composer row={open === "new" ? null : open} preset={preset} writable={writable} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Soạn / xem thông báo                                                */
/* ------------------------------------------------------------------ */

type Mode = "now" | "schedule" | "draft";

function Composer({ row, preset, writable, onClose }: { row: Notif | null; preset: { userId: string; userName: string } | null; writable: boolean; onClose: () => void }) {
  const confirm = useConfirm();
  const readonly = !writable || row?.status === "sent";
  const f = useForm({
    title: row?.title ?? "",
    body: row?.body ?? "",
    audience: (row?.audience ?? (preset ? "user" : "all")) as Notif["audience"],
    level: row?.level ?? "N5",
    userId: row?.userId ?? preset?.userId ?? "",
    userName: row?.userName ?? preset?.userName ?? "",
    channels: row?.channels ?? ["in_app"],
    link: row?.link ?? "",
    mode: (row?.status === "scheduled" ? "schedule" : row?.status === "draft" ? "draft" : "now") as Mode,
    scheduledAt: row?.scheduledAt ? toLocalInput(new Date(row.scheduledAt)) : "",
  });
  const [preview, setPreview] = useState(false);
  const v = f.values;

  const save = async () => {
    if (v.mode === "schedule" && !v.scheduledAt) return f.setErrors({ scheduledAt: "Chọn thời gian gửi" });
    const body = {
      title: v.title,
      body: v.body,
      audience: v.audience,
      level: v.audience === "level" ? v.level : null,
      userId: v.audience === "user" ? v.userId || null : null,
      channels: v.channels,
      link: v.link || null,
      scheduledAt: v.mode === "schedule" ? new Date(v.scheduledAt).toISOString() : null,
      sendNow: v.mode === "now",
    };
    if (v.mode === "now" && !(await confirm({ title: "Gửi thông báo ngay?", message: `Gửi tới: ${v.audience === "user" ? v.userName : AUDIENCE[v.audience]}`, confirmText: "Gửi ngay" }))) return;
    try {
      await f.submit(() => (row ? api(`/admin/notifications/${row.id}`, { method: "PATCH", body }) : api("/admin/notifications", { body })));
      toast.success(v.mode === "now" ? "Đã gửi thông báo" : v.mode === "schedule" ? "Đã hẹn giờ gửi" : "Đã lưu bản nháp");
      invalidate("/admin/notifications");
      onClose();
    } catch (e) {
      if (!(e instanceof ApiError && Object.keys(e.fieldErrors).length)) toast.error(e);
    }
  };
  const remove = async () => {
    if (!row || !(await confirm({ title: "Xoá thông báo này?", message: "Người dùng sẽ không còn thấy thông báo.", danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/notifications/${row.id}`, { method: "DELETE" });
      toast.success("Đã xoá");
      invalidate("/admin/notifications");
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-3xl"
      title={row ? (readonly ? "Chi tiết thông báo" : "Sửa thông báo") : "Soạn thông báo"}
      footer={
        <>
          {row && writable && (
            <Button variant="ghost" className="mr-auto text-red-600" icon={<Trash2 className="size-4" />} onClick={remove}>
              Xoá
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          {!readonly && (
            <Button loading={f.submitting} onClick={save} icon={v.mode === "now" ? <Send className="size-4" /> : v.mode === "schedule" ? <CalendarClock className="size-4" /> : <FileText className="size-4" />}>
              {v.mode === "now" ? "Gửi ngay" : v.mode === "schedule" ? "Hẹn giờ gửi" : "Lưu nháp"}
            </Button>
          )}
        </>
      }
    >
      {row?.status === "sent" && (
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-emerald-50/60 p-3 text-center text-sm">
          <div>
            <p className="text-lg font-extrabold">{num(row.recipients)}</p>
            <p className="text-[11px] text-muted">Người nhận</p>
          </div>
          <div>
            <p className="text-lg font-extrabold">{num(row.readCount)}</p>
            <p className="text-[11px] text-muted">Đã đọc</p>
          </div>
          <div>
            <p className="text-lg font-extrabold">{row.recipients ? Math.round((row.readCount / row.recipients) * 100) : 0}%</p>
            <p className="text-[11px] text-muted">Tỉ lệ đọc</p>
          </div>
        </div>
      )}
      <div className="mb-3 flex justify-end">
        <Tabs size="sm" value={preview ? "p" : "e"} onChange={(x) => setPreview(x === "p")} tabs={[{ value: "e", label: readonly ? "Nội dung" : "Soạn thảo" }, { value: "p", label: "Xem trước" }]} />
      </div>
      {preview ? (
        <PreviewCard title={v.title} body={v.body} link={v.link} />
      ) : (
        <div className="space-y-4">
          <Field label="Tiêu đề" required error={f.errors.title}>
            <Input value={v.title} onChange={f.input("title")} disabled={readonly} invalid={!!f.errors.title} placeholder="VD: Ra mắt khóa N3 Luyện thi tổng hợp" />
          </Field>
          <Field label="Nội dung" required error={f.errors.body}>
            {readonly ? (
              <div className="prose prose-sm max-w-none rounded-lg border border-ink/10 p-3" dangerouslySetInnerHTML={{ __html: v.body }} />
            ) : (
              <RichTextEditor value={v.body} onChange={(h) => f.set("body", h)} toolbar="basic" minHeight={160} placeholder="Nội dung thông báo…" />
            )}
          </Field>
          <Field label="Đối tượng nhận" error={f.errors.audience}>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(AUDIENCE) as Notif["audience"][]).map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={readonly}
                  onClick={() => f.set("audience", a)}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60",
                    v.audience === a ? "border-brand-400 bg-brand-50 text-brand-600" : "border-ink/10 hover:border-brand-200",
                  )}
                >
                  <Users className="size-3.5" /> {AUDIENCE[a]}
                </button>
              ))}
            </div>
          </Field>
          {v.audience === "level" && (
            <Field label="Cấp độ" error={f.errors.level}>
              <Select value={v.level} onChange={f.input("level")} options={LEVEL_OPTIONS} disabled={readonly} />
            </Field>
          )}
          {v.audience === "user" && (
            <Field label="Người nhận" required error={f.errors.userId}>
              <RecipientPicker
                value={{ id: v.userId, name: v.userName }}
                disabled={readonly}
                onChange={(u) => {
                  f.set("userId", u.id);
                  f.set("userName", u.name);
                }}
              />
            </Field>
          )}
          <Field label="Kênh gửi" error={f.errors.channels}>
            <div className="flex flex-wrap gap-4">
              {CHANNELS.map((c) => (
                <Checkbox
                  key={c.value}
                  checked={v.channels.includes(c.value)}
                  onChange={(on) => !readonly && f.set("channels", on ? [...v.channels, c.value] : v.channels.filter((x) => x !== c.value))}
                  label={
                    <span className="inline-flex items-center gap-1">
                      <c.icon className="size-4 text-muted" /> {c.label}
                    </span>
                  }
                />
              ))}
            </div>
          </Field>
          <Field label="Liên kết khi bấm" hint="VD: /khoa-hoc hoặc https://…" error={f.errors.link}>
            <Input value={v.link} onChange={f.input("link")} disabled={readonly} placeholder="/khoa-hoc" />
          </Field>
          {!readonly && (
            <Field label="Thời điểm gửi" error={f.errors.scheduledAt}>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs<Mode>
                  size="sm"
                  value={v.mode}
                  onChange={(m) => {
                    f.set("mode", m);
                    if (m === "schedule" && !v.scheduledAt) f.set("scheduledAt", toLocalInput(new Date(Date.now() + 3600_000)));
                  }}
                  tabs={[
                    { value: "now", label: "Gửi ngay" },
                    { value: "schedule", label: "Hẹn giờ" },
                    { value: "draft", label: "Lưu nháp" },
                  ]}
                />
                {v.mode === "schedule" && <Input type="datetime-local" className="w-56" value={v.scheduledAt} onChange={f.input("scheduledAt")} invalid={!!f.errors.scheduledAt} />}
              </div>
            </Field>
          )}
          {row && readonly && (
            <p className="text-xs text-muted">
              {row.sentAt ? `Đã gửi lúc ${fmtDate(row.sentAt, true)}` : row.scheduledAt ? `Gửi theo lịch lúc ${fmtDate(row.scheduledAt, true)}` : ""}
            </p>
          )}
        </div>
      )}
    </Drawer>
  );
}

function PreviewCard({ title, body, link }: { title: string; body: string; link: string }) {
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-ink/10 bg-gradient-to-b from-brand-50 to-white p-4 shadow-inner">
      <p className="mb-2 text-center text-[11px] text-muted">Xem trước trên ứng dụng</p>
      <div className="rounded-2xl bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
            <Megaphone className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">{title || "Tiêu đề thông báo"}</p>
            <p className="text-[11px] text-muted">Nihongo+ · vừa xong</p>
          </div>
        </div>
        <div className="prose prose-sm mt-3 max-w-none text-sm" dangerouslySetInnerHTML={{ __html: body || "<p>Nội dung thông báo…</p>" }} />
        {link && <p className="mt-3 text-xs font-semibold text-brand-500">Xem chi tiết →</p>}
      </div>
    </div>
  );
}

function RecipientPicker({ value, onChange, disabled }: { value: { id: string; name: string }; onChange: (u: { id: string; name: string }) => void; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const { data } = useApi<{ value: string; label: string; email: string; role: string }[]>(dq.length >= 2 ? `/admin/notifications/recipients/search?q=${encodeURIComponent(dq)}` : null);
  if (value.id)
    return (
      <div className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2 text-sm">
        <span className="font-semibold">{value.name || value.id}</span>
        {!disabled && (
          <button type="button" aria-label="Bỏ chọn" onClick={() => onChange({ id: "", name: "" })} className="text-muted hover:text-red-500">
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  return (
    <div className="relative">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Gõ tên hoặc email (tối thiểu 2 ký tự)…" disabled={disabled} />
      {dq.length >= 2 && data && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-ink/5 bg-white py-1 shadow-xl">
          {!data.length && <li className="px-3 py-2 text-xs text-muted">Không tìm thấy</li>}
          {data.map((u) => (
            <li key={u.value}>
              <button type="button" onClick={() => onChange({ id: u.value, name: u.label })} className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-brand-50">
                <span className="font-medium">{u.label}</span>
                <span className="text-xs text-muted">
                  {u.email} · {u.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
