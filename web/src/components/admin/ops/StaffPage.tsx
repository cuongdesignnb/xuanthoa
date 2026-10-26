"use client";

import { useState } from "react";
import { Copy, Plus, ShieldCheck, Trash2, UserCog, UserX, Users } from "lucide-react";
import { api, ApiError, fmtDate, timeAgo } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Avatar, Badge, Button, Card, Checkbox, Drawer, EmptyState, ErrorState, Field, IconButton, Input, Select, Skeleton, StatusBadge, Tabs, Textarea, cx, toast, useConfirm, type Tone } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, useForm } from "@/components/admin/page";

type StaffRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: "admin" | "staff" | "teacher";
  roleId: string | null;
  roleName: string | null;
  status: string;
  lastActiveAt: string | null;
  createdAt: string;
};
type Role = { id: string; name: string; description: string | null; permissions: string[]; userCount: number; createdAt: string };
type RolesRes = { items: Role[]; modules: Record<string, string>; all: string[] };

export const ROLE_LABEL: Record<string, { label: string; tone: Tone }> = {
  admin: { label: "Quản trị viên", tone: "red" },
  staff: { label: "Nhân sự", tone: "blue" },
  teacher: { label: "Giáo viên", tone: "violet" },
};
const ROLE_OPTS = Object.entries(ROLE_LABEL).map(([value, v]) => ({ value, label: v.label }));

export default function StaffPage() {
  const [tab, setTab] = useState<"staff" | "roles">("staff");
  const roles = useApi<RolesRes>("/admin/roles");
  return (
    <>
      <PageHeader title="Phân quyền nhân sự" subtitle="Quản lý tài khoản nội bộ và nhóm quyền truy cập từng module" crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Phân quyền nhân sự" }]} />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-4 w-fit"
        tabs={[
          { value: "staff", label: "Nhân sự" },
          { value: "roles", label: "Nhóm quyền", count: roles.data?.items.length },
        ]}
      />
      {tab === "staff" ? <StaffTab roles={roles.data?.items ?? []} /> : <RolesTab res={roles} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Nhân sự                                                             */
/* ------------------------------------------------------------------ */

function StaffTab({ roles }: { roles: Role[] }) {
  const { user, can } = useAuth();
  const writable = can("staff.write");
  const confirm = useConfirm();
  const t = useTable<StaffRow>("/admin/staff");
  const [edit, setEdit] = useState<StaffRow | "new" | null>(null);

  const toggleActive = async (r: StaffRow) => {
    const deactivate = r.status === "active";
    if (deactivate && !(await confirm({ title: `Vô hiệu hoá ${r.name}?`, message: "Tài khoản sẽ không đăng nhập được vào hệ thống.", danger: true, confirmText: "Vô hiệu hoá" }))) return;
    try {
      if (deactivate) await api(`/admin/staff/${r.id}`, { method: "DELETE" });
      else await api(`/admin/staff/${r.id}`, { method: "PATCH", body: { status: "active" } });
      toast.success(deactivate ? "Đã vô hiệu hoá" : "Đã kích hoạt lại");
      invalidate("/admin/staff");
    } catch (e) {
      toast.error(e);
    }
  };

  const columns: Column<StaffRow>[] = [
    {
      key: "name",
      header: "Nhân sự",
      sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar src={r.avatarUrl} name={r.name} size={34} />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {r.name} {r.id === user?.id && <Badge tone="pink">Bạn</Badge>}
            </p>
            <p className="truncate text-xs text-muted">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Vai trò", sortable: true, cell: (r) => <Badge tone={ROLE_LABEL[r.role]?.tone}>{ROLE_LABEL[r.role]?.label ?? r.role}</Badge> },
    { key: "roleName", header: "Nhóm quyền", cell: (r) => (r.role === "admin" ? <span className="text-xs text-muted">Toàn quyền</span> : (r.roleName ?? <span className="text-xs text-muted">—</span>)) },
    { key: "phone", header: "Điện thoại", hideOnMobile: true, cell: (r) => r.phone ?? "—" },
    { key: "lastActiveAt", header: "Hoạt động", sortable: true, hideOnMobile: true, cell: (r) => <span className="text-xs text-muted">{timeAgo(r.lastActiveAt)}</span> },
    { key: "status", header: "Trạng thái", cell: (r) => <StatusBadge status={r.status} label={r.status === "blocked" ? "Vô hiệu" : undefined} /> },
    ...(writable
      ? [
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (r: StaffRow) =>
              r.id !== user?.id && (
                <IconButton label={r.status === "active" ? "Vô hiệu hoá" : "Kích hoạt"} onClick={(e) => (e.stopPropagation(), toggleActive(r))}>
                  {r.status === "active" ? <UserX className="size-4" /> : <ShieldCheck className="size-4" />}
                </IconButton>
              ),
          },
        ]
      : []),
  ];

  return (
    <>
      <TableCard
        table={t}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={writable ? (r) => setEdit(r) : undefined}
        placeholder="Tìm tên, email…"
        filters={[
          { key: "role", label: "Vai trò", options: ROLE_OPTS },
          { key: "roleId", label: "Nhóm quyền", options: roles.map((r) => ({ value: r.id, label: r.name })) },
          { key: "status", label: "Trạng thái", options: [{ value: "active", label: "Hoạt động" }, { value: "blocked", label: "Vô hiệu" }] },
        ]}
        actions={
          writable && (
            <Button icon={<Plus className="size-4" />} onClick={() => setEdit("new")}>
              Thêm nhân sự
            </Button>
          )
        }
      />
      {edit && <StaffDrawer row={edit === "new" ? null : edit} roles={roles} self={edit !== "new" && edit.id === user?.id} onClose={() => setEdit(null)} />}
    </>
  );
}

function StaffDrawer({ row, roles, self, onClose }: { row: StaffRow | null; roles: Role[]; self: boolean; onClose: () => void }) {
  const f = useForm({
    name: row?.name ?? "",
    email: row?.email ?? "",
    phone: row?.phone ?? "",
    password: "",
    role: row?.role ?? "staff",
    roleId: row?.roleId ?? "",
    status: row?.status ?? "active",
  });
  const save = async () => {
    const v = f.values;
    const body: Record<string, unknown> = { name: v.name, email: v.email, phone: v.phone || null };
    if (!self) Object.assign(body, { role: v.role, roleId: v.role === "admin" ? null : v.roleId || null, status: v.status });
    if (v.password) body.password = v.password;
    try {
      await f.submit(() => (row ? api(`/admin/staff/${row.id}`, { method: "PATCH", body }) : api("/admin/staff", { body })));
      toast.success(row ? "Đã lưu nhân sự" : "Đã thêm nhân sự");
      invalidate("/admin/staff");
      invalidate("/admin/roles");
      onClose();
    } catch (e) {
      if (!(e instanceof ApiError && Object.keys(e.fieldErrors).length)) toast.error(e);
    }
  };
  const perms = roles.find((r) => r.id === f.values.roleId)?.permissions ?? [];
  return (
    <Drawer
      open
      onClose={onClose}
      title={row ? `Sửa: ${row.name}` : "Thêm nhân sự"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button loading={f.submitting} onClick={save} icon={<UserCog className="size-4" />}>
            {row ? "Lưu" : "Tạo tài khoản"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Họ và tên" required error={f.errors.name}>
          <Input value={f.values.name} onChange={f.input("name")} invalid={!!f.errors.name} />
        </Field>
        <Field label="Email đăng nhập" required error={f.errors.email}>
          <Input type="email" value={f.values.email} onChange={f.input("email")} invalid={!!f.errors.email} />
        </Field>
        <Field label={row ? "Mật khẩu mới" : "Mật khẩu"} required={!row} hint={row ? "Để trống nếu không đổi" : "Tối thiểu 6 ký tự"} error={f.errors.password}>
          <Input type="text" autoComplete="new-password" value={f.values.password} onChange={f.input("password")} invalid={!!f.errors.password} />
        </Field>
        <Field label="Điện thoại" error={f.errors.phone}>
          <Input value={f.values.phone} onChange={f.input("phone")} />
        </Field>
        {self && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Bạn không thể tự đổi vai trò, nhóm quyền hoặc trạng thái của chính mình.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vai trò" error={f.errors.role}>
            <Select value={f.values.role} onChange={f.input("role")} options={ROLE_OPTS} disabled={self} />
          </Field>
          <Field label="Trạng thái" error={f.errors.status}>
            <Select value={f.values.status} onChange={f.input("status")} options={[{ value: "active", label: "Hoạt động" }, { value: "blocked", label: "Vô hiệu" }]} disabled={self} />
          </Field>
        </div>
        {f.values.role !== "admin" ? (
          <Field label="Nhóm quyền" hint="Quyết định module nhân sự được xem/sửa" error={f.errors.roleId}>
            <Select value={f.values.roleId} onChange={f.input("roleId")} options={roles.map((r) => ({ value: r.id, label: r.name }))} placeholder="Không có (chỉ xem tổng quan)" disabled={self} />
          </Field>
        ) : (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-600">Quản trị viên luôn có toàn quyền hệ thống.</p>
        )}
        {f.values.role !== "admin" && perms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {perms.map((p) => (
              <Badge key={p} tone={p.endsWith(".write") ? "green" : "gray"}>
                {p}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Nhóm quyền + ma trận quyền                                          */
/* ------------------------------------------------------------------ */

function RolesTab({ res }: { res: ReturnType<typeof useApi<RolesRes>> }) {
  const { can } = useAuth();
  const writable = can("staff.write");
  const [sel, setSel] = useState<string | "new" | null>(null);
  const [dup, setDup] = useState<string[] | null>(null);
  if (res.error && !res.data) return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!res.data)
    return (
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  const { items, modules } = res.data;
  const current = sel === "new" ? null : (items.find((r) => r.id === sel) ?? items[0] ?? null);
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-sm font-bold">Nhóm quyền</p>
          {writable && (
            <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => (setDup(null), setSel("new"))}>
              Tạo nhóm
            </Button>
          )}
        </div>
        <ul className="space-y-1">
          {items.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setSel(r.id)}
                className={cx("w-full rounded-xl px-3 py-2.5 text-left transition", sel !== "new" && current?.id === r.id ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-ink/[.03]")}
              >
                <p className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {r.name}
                  <span className="flex items-center gap-1 text-xs font-normal text-muted">
                    <Users className="size-3.5" /> {r.userCount}
                  </span>
                </p>
                <p className="line-clamp-1 text-xs text-muted">{r.description ?? `${r.permissions.length} quyền`}</p>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {sel === "new" || current ? (
        <RoleEditor
          key={sel === "new" ? `new-${dup?.length ?? 0}` : current!.id}
          role={sel === "new" ? null : current}
          initialPerms={sel === "new" ? (dup ?? undefined) : undefined}
          modules={modules}
          writable={writable}
          onSaved={(id) => setSel(id)}
          onDeleted={() => setSel(null)}
          onDuplicate={(perms) => {
            setDup(perms);
            setSel("new");
          }}
        />
      ) : (
        <Card>
          <EmptyState title="Chưa có nhóm quyền" />
        </Card>
      )}
    </div>
  );
}

function RoleEditor({
  role,
  initialPerms,
  modules,
  writable,
  onSaved,
  onDeleted,
  onDuplicate,
}: {
  role: Role | null;
  initialPerms?: string[];
  modules: Record<string, string>;
  writable: boolean;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onDuplicate: (perms: string[]) => void;
}) {
  const confirm = useConfirm();
  const f = useForm({ name: role?.name ?? "", description: role?.description ?? "", permissions: role?.permissions ?? initialPerms ?? ["dashboard.read"] });
  const perms = new Set(f.values.permissions);
  const keys = Object.keys(modules);
  const setPerm = (p: string, on: boolean) => {
    const n = new Set(perms);
    if (on) n.add(p);
    else n.delete(p);
    const [m, kind] = p.split(".");
    if (kind === "write" && on) n.add(`${m}.read`);
    if (kind === "read" && !on) n.delete(`${m}.write`);
    f.set("permissions", [...n]);
  };
  const setCol = (kind: "read" | "write", on: boolean) => {
    const n = new Set(perms);
    for (const m of keys) {
      if (on) {
        n.add(`${m}.${kind}`);
        if (kind === "write") n.add(`${m}.read`);
      } else {
        n.delete(`${m}.${kind}`);
        if (kind === "read") n.delete(`${m}.write`);
      }
    }
    f.set("permissions", [...n]);
  };
  const allRead = keys.every((m) => perms.has(`${m}.read`));
  const allWrite = keys.every((m) => perms.has(`${m}.write`));

  const save = async () => {
    try {
      const r = await f.submit((v) =>
        role ? api<Role>(`/admin/roles/${role.id}`, { method: "PATCH", body: v }) : api<Role>("/admin/roles", { body: v }),
      );
      toast.success(role ? "Đã lưu nhóm quyền" : "Đã tạo nhóm quyền");
      invalidate("/admin/roles");
      if (r) onSaved(r.id);
    } catch (e) {
      if (!(e instanceof ApiError && Object.keys(e.fieldErrors).length)) toast.error(e);
    }
  };
  const remove = async () => {
    if (!role || !(await confirm({ title: `Xoá nhóm “${role.name}”?`, danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/roles/${role.id}`, { method: "DELETE" });
      toast.success("Đã xoá nhóm quyền");
      invalidate("/admin/roles");
      onDeleted();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Card className="p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên nhóm" required error={f.errors.name}>
          <Input value={f.values.name} onChange={f.input("name")} disabled={!writable} invalid={!!f.errors.name} />
        </Field>
        <Field label="Mô tả" error={f.errors.description}>
          <Textarea rows={1} value={f.values.description} onChange={f.input("description")} disabled={!writable} />
        </Field>
      </div>
      {role && <p className="mt-2 text-xs text-muted">Tạo ngày {fmtDate(role.createdAt)} · {role.userCount} nhân sự đang dùng nhóm này</p>}
      {f.errors.permissions && <p className="mt-2 text-xs text-red-500">{f.errors.permissions}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-ink/5">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-ink/[.02] text-left text-xs text-muted">
              <th className="px-3 py-2.5 font-semibold">Module</th>
              <th className="w-28 px-3 py-2.5 text-center font-semibold">
                <span className="inline-flex flex-col items-center gap-1">
                  Xem
                  <Checkbox checked={allRead} onChange={(v) => writable && setCol("read", v)} />
                </span>
              </th>
              <th className="w-28 px-3 py-2.5 text-center font-semibold">
                <span className="inline-flex flex-col items-center gap-1">
                  Thêm / sửa / xoá
                  <Checkbox checked={allWrite} onChange={(v) => writable && setCol("write", v)} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((m) => (
              <tr key={m} className="border-t border-ink/5 hover:bg-brand-50/30">
                <td className="px-3 py-2">
                  <p className="font-medium">{modules[m]}</p>
                  <p className="font-mono text-[10px] text-muted">{m}</p>
                </td>
                <td className="px-3 py-2 text-center">
                  <Checkbox checked={perms.has(`${m}.read`)} onChange={(v) => writable && setPerm(`${m}.read`, v)} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Checkbox checked={perms.has(`${m}.write`)} onChange={(v) => writable && setPerm(`${m}.write`, v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {writable && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {role && (
              <Button variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} onClick={remove}>
                Xoá nhóm
              </Button>
            )}
            {role && (
              <Button variant="ghost" icon={<Copy className="size-4" />} onClick={() => onDuplicate(f.values.permissions)}>
                Nhân bản
              </Button>
            )}
          </div>
          <Button loading={f.submitting} onClick={save} icon={<ShieldCheck className="size-4" />}>
            {role ? "Lưu nhóm quyền" : "Tạo nhóm"}
          </Button>
        </div>
      )}
    </Card>
  );
}
