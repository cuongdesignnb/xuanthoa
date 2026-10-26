"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Download, Plus, ShieldCheck, Trash2, UserCheck, UserPlus, Users, Activity } from "lucide-react";
import { api, ApiError, fmtDate, num, qs, timeAgo, vnd } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Avatar, Button, Drawer, Field, Input, Level, Select, StatusBadge, toast, useConfirm } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, StatCard, useForm } from "@/components/admin/page";

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  level: string | null;
  targetLevel: string | null;
  status: string;
  streak: number;
  xp: number;
  lastActiveAt: string | null;
  createdAt: string;
  enrollments: number;
  totalPaid: number;
};

type Stats = { total: number; active30: number; newMonth: number; newPrevMonth: number; blocked: number; monthly: number[] };

export const LEVEL_OPTIONS = ["N5", "N4", "N3", "N2", "N1"].map((l) => ({ value: l, label: l }));
const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động" },
  { value: "blocked", label: "Đã khoá" },
  { value: "pending", label: "Chờ xác nhận" },
];


/** Tải tệp (CSV) qua thẻ <a> tạm — cookie đăng nhập đi kèm. */
function download(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function StudentsPage() {
  const router = useRouter();
  const { can } = useAuth();
  const confirm = useConfirm();
  const writable = can("students.write");
  const t = useTable<StudentRow>("/admin/students");
  const stats = useApi<Stats>("/admin/students/stats");
  const [creating, setCreating] = useState(false);
  const s = stats.data;

  const refresh = () => {
    invalidate("/admin/students");
  };

  const bulk = async (ids: string[], action: "block" | "unblock" | "delete", clear: () => void) => {
    const label = { block: "Khoá", unblock: "Mở khoá", delete: "Xoá" }[action];
    const ok = await confirm({
      title: `${label} ${ids.length} học viên?`,
      message: action === "delete" ? "Toàn bộ dữ liệu học tập, đơn hàng của các học viên này sẽ bị xoá vĩnh viễn." : undefined,
      danger: action !== "unblock",
      confirmText: label,
    });
    if (!ok) return;
    try {
      const r = await api<{ count: number }>("/admin/students/bulk", { body: { ids, action } });
      toast.success(`Đã ${label.toLowerCase()} ${r.count} học viên`);
      clear();
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const exportCsv = () => {
    const f = t.state.filters;
    download(`/api/admin/students/export.csv${qs({ q: t.state.q, ...f, sort: t.state.sort, order: t.state.order })}`);
  };

  const columns: Column<StudentRow>[] = [
    {
      key: "name",
      header: "Học viên",
      sortable: true,
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar src={r.avatarUrl} name={r.name} size={34} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.name}</p>
            <p className="truncate text-xs text-muted">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Điện thoại", hideOnMobile: true, cell: (r) => r.phone ?? <span className="text-muted">—</span> },
    {
      key: "level",
      header: "Trình độ",
      sortable: true,
      cell: (r) => (
        <span className="flex items-center gap-1">
          <Level level={r.level} />
          {r.targetLevel && <span className="text-[11px] text-muted">→ {r.targetLevel}</span>}
        </span>
      ),
    },
    { key: "enrollments", header: "Khóa học", hideOnMobile: true, cell: (r) => num(r.enrollments) },
    { key: "totalPaid", header: "Đã chi", hideOnMobile: true, cell: (r) => (r.totalPaid ? vnd(r.totalPaid) : <span className="text-muted">—</span>) },
    { key: "xp", header: "XP", sortable: true, hideOnMobile: true, cell: (r) => num(r.xp) },
    { key: "lastActiveAt", header: "Hoạt động", sortable: true, hideOnMobile: true, cell: (r) => <span className="text-xs text-muted">{timeAgo(r.lastActiveAt)}</span> },
    { key: "createdAt", header: "Ngày tham gia", sortable: true, cell: (r) => <span className="text-xs">{fmtDate(r.createdAt)}</span> },
    { key: "status", header: "Trạng thái", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const growth = s && s.newPrevMonth ? Math.round(((s.newMonth - s.newPrevMonth) / s.newPrevMonth) * 100) : undefined;

  return (
    <>
      <PageHeader
        title="Học viên"
        subtitle="Quản lý tài khoản, tiến độ và hoạt động của học viên"
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Học viên" }]}
        actions={
          <>
            <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
              Xuất CSV
            </Button>
            {writable && (
              <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Thêm học viên
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} icon={<Users className="size-5" />} label="Tổng học viên" value={s ? num(s.total) : "…"} spark={s?.monthly} sub="Đăng ký 12 tháng qua" />
        <StatCard index={1} tone="green" icon={<Activity className="size-5" />} label="Hoạt động 30 ngày" value={s ? num(s.active30) : "…"} sub={s ? `${s.total ? Math.round((s.active30 / s.total) * 100) : 0}% tổng học viên` : undefined} />
        <StatCard index={2} tone="violet" icon={<UserPlus className="size-5" />} label="Mới tháng này" value={s ? num(s.newMonth) : "…"} delta={growth} sub={s ? `Tháng trước: ${num(s.newPrevMonth)}` : undefined} />
        <div role="button" tabIndex={0} className="cursor-pointer" onClick={() => t.setFilter("status", "blocked")} onKeyDown={(e) => e.key === "Enter" && t.setFilter("status", "blocked")}>
          <StatCard index={3} tone="amber" icon={<Ban className="size-5" />} label="Đã khoá" value={s ? num(s.blocked) : "…"} sub="Nhấn để lọc tài khoản bị khoá" />
        </div>
      </div>

      <TableCard
        table={t}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/hoc-vien/${r.id}`)}
        placeholder="Tìm tên, email, số điện thoại…"
        filters={[
          { key: "level", label: "Trình độ", options: LEVEL_OPTIONS },
          { key: "status", label: "Trạng thái", options: STATUS_OPTIONS },
        ]}
        actions={
          <div className="flex items-center gap-1.5">
            <Input type="date" aria-label="Tham gia từ ngày" className="w-[150px]" value={t.state.filters.joinedFrom ?? ""} onChange={(e) => t.setFilter("joinedFrom", e.target.value)} />
            <span className="text-xs text-muted">→</span>
            <Input type="date" aria-label="Tham gia đến ngày" className="w-[150px]" value={t.state.filters.joinedTo ?? ""} onChange={(e) => t.setFilter("joinedTo", e.target.value)} />
          </div>
        }
        bulk={
          writable
            ? (ids, clear) => (
                <>
                  <Button size="sm" variant="outline" icon={<UserCheck className="size-4" />} onClick={() => bulk(ids, "unblock", clear)}>
                    Mở khoá
                  </Button>
                  <Button size="sm" variant="outline" icon={<Ban className="size-4" />} onClick={() => bulk(ids, "block", clear)}>
                    Khoá
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => bulk(ids, "delete", clear)}>
                    Xoá
                  </Button>
                </>
              )
            : undefined
        }
      />

      <StudentFormDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          setCreating(false);
          refresh();
          stats.reload();
          router.push(`/admin/hoc-vien/${id}`);
        }}
      />
    </>
  );
}

export type StudentForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  level: string;
  targetLevel: string;
  targetDate: string;
  status: string;
};

/** Drawer tạo / sửa học viên. */
export function StudentFormDrawer({
  open,
  onClose,
  onSaved,
  initial,
  id,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  initial?: Partial<StudentForm>;
  id?: string;
}) {
  return open ? <StudentFormInner onClose={onClose} onSaved={onSaved} initial={initial} id={id} /> : null;
}

function StudentFormInner({ onClose, onSaved, initial, id }: { onClose: () => void; onSaved: (id: string) => void; initial?: Partial<StudentForm>; id?: string }) {
  const f = useForm<StudentForm>({ name: "", email: "", password: "", phone: "", level: "N5", targetLevel: "", targetDate: "", status: "active", ...initial });
  const save = async () => {
    try {
      const v = f.values;
      const body = {
        name: v.name,
        email: v.email,
        phone: v.phone || null,
        level: v.level || null,
        targetLevel: v.targetLevel || null,
        targetDate: v.targetDate || null,
        status: v.status,
        ...(v.password ? { password: v.password } : {}),
      };
      const r = await f.submit(() => (id ? api<{ id: string }>(`/admin/students/${id}`, { method: "PATCH", body }) : api<{ id: string }>("/admin/students", { body })));
      toast.success(id ? "Đã lưu học viên" : "Đã tạo học viên");
      invalidate("/admin/students");
      if (r) onSaved(r.id);
    } catch (e) {
      if (!(e instanceof ApiError && Object.keys(e.fieldErrors).length)) toast.error(e);
    }
  };
  return (
    <Drawer
      open
      onClose={onClose}
      title={id ? "Sửa học viên" : "Thêm học viên"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button loading={f.submitting} onClick={save} icon={<ShieldCheck className="size-4" />}>
            {id ? "Lưu thay đổi" : "Tạo học viên"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Họ và tên" required error={f.errors.name}>
          <Input value={f.values.name} onChange={f.input("name")} invalid={!!f.errors.name} />
        </Field>
        <Field label="Email" required error={f.errors.email}>
          <Input type="email" value={f.values.email} onChange={f.input("email")} invalid={!!f.errors.email} />
        </Field>
        <Field label={id ? "Mật khẩu mới" : "Mật khẩu"} required={!id} hint={id ? "Để trống nếu không đổi" : "Tối thiểu 6 ký tự"} error={f.errors.password}>
          <Input type="text" autoComplete="new-password" value={f.values.password} onChange={f.input("password")} invalid={!!f.errors.password} />
        </Field>
        <Field label="Điện thoại" error={f.errors.phone}>
          <Input value={f.values.phone} onChange={f.input("phone")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trình độ" error={f.errors.level}>
            <Select value={f.values.level} onChange={f.input("level")} options={LEVEL_OPTIONS} placeholder="—" />
          </Field>
          <Field label="Mục tiêu" error={f.errors.targetLevel}>
            <Select value={f.values.targetLevel} onChange={f.input("targetLevel")} options={LEVEL_OPTIONS} placeholder="—" />
          </Field>
          <Field label="Thời hạn mục tiêu" hint="MM/YYYY" error={f.errors.targetDate}>
            <Input value={f.values.targetDate} onChange={f.input("targetDate")} placeholder="12/2026" />
          </Field>
          <Field label="Trạng thái" error={f.errors.status}>
            <Select value={f.values.status} onChange={f.input("status")} options={STATUS_OPTIONS} />
          </Field>
        </div>
      </div>
    </Drawer>
  );
}
