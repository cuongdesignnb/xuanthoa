"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, Dices, Layers, Plus, Tag, Ticket, Trash2, TrendingUp, Wallet } from "lucide-react";
import { Badge, Button, Drawer, Field, IconButton, Input, Modal, Select, Switch, toast, useConfirm, type Tone } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { ProgressBar } from "@/components/admin/charts";
import { PageHeader, StatCard, useForm } from "@/components/admin/page";
import { api, fmtDate, num, vnd, vndShort } from "@/lib/api";
import { invalidate, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  maxUses: number | null;
  used: number;
  minAmount: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  createdAt: string;
  state: "active" | "expired" | "scheduled" | "inactive" | "used_up";
  orders: number;
  discountTotal: number;
  revenue: number;
};
type Summary = { states: Record<string, number>; used: number; discount: number; revenue: number };

const STATE: Record<Coupon["state"], { label: string; tone: Tone }> = {
  active: { label: "Đang chạy", tone: "green" },
  scheduled: { label: "Sắp diễn ra", tone: "blue" },
  expired: { label: "Hết hạn", tone: "gray" },
  used_up: { label: "Hết lượt", tone: "amber" },
  inactive: { label: "Tạm tắt", tone: "red" },
};

const valueText = (c: { type: string; value: number }) => (c.type === "percent" ? `${c.value}%` : vnd(c.value));
/** ISO → giá trị cho input datetime-local (giờ địa phương). */
const toLocal = (d: string | null) => {
  if (!d) return "";
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};

export default function CouponsAdmin() {
  const t = useTable<Coupon>("/admin/coupons");
  const summary = (t.data as unknown as { summary?: Summary } | undefined)?.summary;
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [edit, setEdit] = useState<Coupon | null>(null);
  const [bulk, setBulk] = useState(false);
  const creating = sp.get("new") === "1";
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("coupons.write");

  const openNew = () => router.replace(`${pathname}?new=1`, { scroll: false });
  const closeDrawer = () => {
    setEdit(null);
    if (creating) router.replace(pathname, { scroll: false });
  };
  const refresh = () => invalidate("/admin/coupons");

  const remove = async (ids: string[], clear?: () => void) => {
    if (!(await confirm({ title: `Xoá ${ids.length} mã giảm giá?`, message: "Đơn hàng đã dùng mã vẫn được giữ nguyên.", danger: true, confirmText: "Xoá" }))) return;
    try {
      for (const id of ids) await api(`/admin/coupons/${id}`, { method: "DELETE" });
      toast.success("Đã xoá mã giảm giá");
      clear?.();
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const cols: Column<Coupon>[] = [
    {
      key: "code",
      header: "Mã",
      sortable: true,
      cell: (c) => (
        <div className="flex items-center gap-1.5">
          <span className="rounded-md border border-dashed border-brand-300 bg-brand-50 px-2 py-0.5 font-mono text-xs font-bold text-brand-600">{c.code}</span>
          <IconButton
            label="Sao chép mã"
            className="size-6"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(c.code);
              toast.info(`Đã sao chép ${c.code}`);
            }}
          >
            <Copy className="size-3.5" />
          </IconButton>
        </div>
      ),
    },
    {
      key: "value",
      header: "Giảm",
      sortable: true,
      cell: (c) => (
        <div>
          <p className="font-bold">{valueText(c)}</p>
          {c.minAmount > 0 && <p className="text-[11px] text-muted">Đơn từ {vnd(c.minAmount)}</p>}
        </div>
      ),
    },
    {
      key: "used",
      header: "Lượt dùng",
      sortable: true,
      cell: (c) => {
        const pct = c.maxUses ? Math.round((c.used / c.maxUses) * 100) : 0;
        return (
          <div className="w-36">
            <p className="text-xs">
              <b>{num(c.used)}</b>
              <span className="text-muted"> / {c.maxUses ? num(c.maxUses) : "∞"}</span>
            </p>
            {c.maxUses ? <ProgressBar value={pct} tone={pct >= 100 ? "red" : pct > 75 ? "amber" : "brand"} className="mt-1" /> : <p className="text-[10px] text-muted">Không giới hạn</p>}
          </div>
        );
      },
    },
    {
      key: "endsAt",
      header: "Thời gian",
      sortable: true,
      hideOnMobile: true,
      cell: (c) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {c.startsAt ? fmtDate(c.startsAt) : "—"} → {c.endsAt ? fmtDate(c.endsAt) : "Không hạn"}
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Hiệu quả",
      hideOnMobile: true,
      cell: (c) => (
        <div className="text-xs">
          <p className="font-semibold">{vndShort(c.revenue)}</p>
          <p className="text-muted">
            {num(c.orders)} đơn · giảm {vndShort(c.discountTotal)}
          </p>
        </div>
      ),
    },
    {
      key: "state",
      header: "Trạng thái",
      cell: (c) => (
        <Badge tone={STATE[c.state].tone} dot>
          {STATE[c.state].label}
        </Badge>
      ),
    },
  ];

  const states = summary?.states ?? {};
  return (
    <div>
      <PageHeader
        title="Mã giảm giá"
        subtitle="Tạo và theo dõi hiệu quả các chương trình khuyến mãi."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Mã giảm giá" }]}
        actions={
          canWrite && (
            <>
              <Button variant="outline" icon={<Layers className="size-4" />} onClick={() => setBulk(true)}>
                Tạo hàng loạt
              </Button>
              <Button icon={<Plus className="size-4" />} onClick={openNew}>
                Tạo mã
              </Button>
            </>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} icon={<Ticket className="size-5" />} label="Mã đang chạy" value={summary ? num(states.active ?? 0) : "…"} sub={summary ? `${states.scheduled ?? 0} sắp diễn ra · ${(states.expired ?? 0) + (states.used_up ?? 0)} đã kết thúc` : undefined} />
        <StatCard index={1} tone="violet" icon={<Tag className="size-5" />} label="Tổng lượt sử dụng" value={summary ? num(summary.used) : "…"} />
        <StatCard index={2} tone="amber" icon={<Wallet className="size-5" />} label="Tổng tiền đã giảm" value={summary ? vndShort(summary.discount) : "…"} />
        <StatCard index={3} tone="green" icon={<TrendingUp className="size-5" />} label="Doanh thu từ đơn dùng mã" value={summary ? vndShort(summary.revenue) : "…"} />
      </div>

      <TableCard
        table={t}
        columns={cols}
        rowKey={(c) => c.id}
        onRowClick={canWrite ? setEdit : undefined}
        placeholder="Tìm mã…"
        filters={[
          { key: "state", label: "Trạng thái", options: Object.entries(STATE).map(([value, s]) => ({ value, label: s.label })) },
          { key: "type", label: "Loại", options: [{ value: "percent", label: "Phần trăm" }, { value: "fixed", label: "Số tiền" }] },
        ]}
        bulk={canWrite ? (ids, clear) => <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => remove(ids, clear)}>Xoá</Button> : undefined}
      />

      <Drawer open={creating || !!edit} onClose={closeDrawer} title={edit ? `Sửa mã ${edit.code}` : "Tạo mã giảm giá"}>
        {(creating || edit) && <CouponForm key={edit?.id ?? "new"} coupon={edit} onClose={closeDrawer} onSaved={refresh} onDelete={edit ? () => remove([edit.id], closeDrawer) : undefined} />}
      </Drawer>
      <BulkModal open={bulk} onClose={() => setBulk(false)} onSaved={refresh} />
    </div>
  );
}

function CouponForm({ coupon, onClose, onSaved, onDelete }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void; onDelete?: () => void }) {
  const f = useForm({
    code: coupon?.code ?? "",
    type: coupon?.type ?? ("percent" as "percent" | "fixed"),
    value: coupon?.value ?? 10,
    maxUses: coupon?.maxUses ?? (null as number | null),
    minAmount: coupon?.minAmount ?? 0,
    startsAt: toLocal(coupon?.startsAt ?? null),
    endsAt: toLocal(coupon?.endsAt ?? null),
    active: coupon?.active ?? true,
  });
  const v = f.values;
  const [gen, setGen] = useState(false);
  const random = async () => {
    setGen(true);
    try {
      const r = await api<{ code: string }>("/admin/coupons/random-code", { query: { length: 8 } });
      f.set("code", r.code);
    } catch (e) {
      toast.error(e);
    } finally {
      setGen(false);
    }
  };
  const save = async () => {
    try {
      const body = { ...v, startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null, endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null };
      await f.submit(() => (coupon ? api(`/admin/coupons/${coupon.id}`, { method: "PATCH", body }) : api("/admin/coupons", { body })));
      toast.success(coupon ? "Đã cập nhật mã" : "Đã tạo mã giảm giá");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <div className="space-y-4">
      <Field label="Mã giảm giá" required error={f.errors.code} hint="Chữ in hoa, số, dấu - hoặc _">
        <div className="flex gap-2">
          <Input value={v.code} onChange={(e) => f.set("code", e.target.value.toUpperCase())} placeholder="SAKURA20" className="font-mono uppercase" />
          <Button type="button" variant="soft" icon={<Dices className="size-4" />} loading={gen} onClick={random}>
            Ngẫu nhiên
          </Button>
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Loại giảm giá">
          <Select value={v.type} onChange={(e) => f.set("type", e.target.value as "percent" | "fixed")} options={[{ value: "percent", label: "Phần trăm (%)" }, { value: "fixed", label: "Số tiền cố định (đ)" }]} />
        </Field>
        <Field label={v.type === "percent" ? "Phần trăm giảm" : "Số tiền giảm (đ)"} required error={f.errors.value}>
          <Input type="number" min={1} max={v.type === "percent" ? 100 : undefined} step={v.type === "percent" ? 1 : 1000} value={v.value ?? ""} onChange={f.input("value")} />
        </Field>
        <Field label="Giới hạn lượt dùng" hint="Để trống = không giới hạn" error={f.errors.maxUses}>
          <Input type="number" min={1} value={v.maxUses ?? ""} onChange={f.input("maxUses")} placeholder="∞" />
        </Field>
        <Field label="Đơn tối thiểu (đ)" error={f.errors.minAmount}>
          <Input type="number" min={0} step={1000} value={v.minAmount ?? 0} onChange={f.input("minAmount")} />
        </Field>
        <Field label="Bắt đầu" error={f.errors.startsAt}>
          <Input type="datetime-local" value={v.startsAt} onChange={f.input("startsAt")} />
        </Field>
        <Field label="Kết thúc" error={f.errors.endsAt}>
          <Input type="datetime-local" value={v.endsAt} onChange={f.input("endsAt")} />
        </Field>
      </div>
      <Switch checked={v.active} onChange={(x) => f.set("active", x)} label="Kích hoạt mã" />
      {coupon && (
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-ink/[.03] p-3 text-center text-xs">
          <div>
            <p className="text-muted">Đơn đã dùng</p>
            <p className="text-base font-bold">{num(coupon.orders)}</p>
          </div>
          <div>
            <p className="text-muted">Đã giảm</p>
            <p className="text-base font-bold">{vndShort(coupon.discountTotal)}</p>
          </div>
          <div>
            <p className="text-muted">Doanh thu</p>
            <p className="text-base font-bold text-brand-600">{vndShort(coupon.revenue)}</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-ink/5 pt-4">
        {onDelete ? (
          <Button variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} onClick={onDelete}>
            Xoá
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button loading={f.submitting} onClick={save}>
            {coupon ? "Lưu thay đổi" : "Tạo mã"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BulkModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const f = useForm({ count: 20, prefix: "NH", length: 6, type: "percent" as "percent" | "fixed", value: 10, maxUses: 1 as number | null, minAmount: 0, endsAt: "" });
  const [created, setCreated] = useState<string[]>([]);
  const v = f.values;
  const save = async () => {
    try {
      const r = await f.submit((vals) =>
        api<{ items: { code: string }[]; count: number }>("/admin/coupons/generate", { body: { ...vals, endsAt: vals.endsAt ? new Date(vals.endsAt).toISOString() : null, active: true } }),
      );
      if (r) {
        setCreated(r.items.map((x) => x.code));
        toast.success(`Đã tạo ${r.count} mã giảm giá`);
        onSaved();
      }
    } catch (e) {
      toast.error(e);
    }
  };
  const close = () => {
    setCreated([]);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Tạo mã ngẫu nhiên hàng loạt"
      description="Phù hợp cho mã dùng một lần gửi qua email, đối tác hoặc sự kiện."
      footer={
        created.length ? (
          <>
            <Button variant="outline" icon={<Copy className="size-4" />} onClick={() => (navigator.clipboard?.writeText(created.join("\n")), toast.info("Đã sao chép danh sách mã"))}>
              Sao chép tất cả
            </Button>
            <Button onClick={close}>Xong</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Huỷ
            </Button>
            <Button loading={f.submitting} onClick={save}>
              Tạo {v.count || 0} mã
            </Button>
          </>
        )
      }
    >
      {created.length ? (
        <div className="grid max-h-80 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
          {created.map((c) => (
            <span key={c} className="rounded-md bg-brand-50 px-2 py-1 text-center font-mono text-xs font-bold text-brand-600">
              {c}
            </span>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Số lượng" required error={f.errors.count}>
            <Input type="number" min={1} max={500} value={v.count ?? ""} onChange={f.input("count")} />
          </Field>
          <Field label="Tiền tố" error={f.errors.prefix}>
            <Input value={v.prefix} onChange={(e) => f.set("prefix", e.target.value.toUpperCase())} className="font-mono" />
          </Field>
          <Field label="Độ dài phần ngẫu nhiên" error={f.errors.length}>
            <Input type="number" min={4} max={16} value={v.length ?? ""} onChange={f.input("length")} />
          </Field>
          <Field label="Loại">
            <Select value={v.type} onChange={(e) => f.set("type", e.target.value as "percent" | "fixed")} options={[{ value: "percent", label: "Phần trăm" }, { value: "fixed", label: "Số tiền" }]} />
          </Field>
          <Field label="Giá trị" required error={f.errors.value}>
            <Input type="number" min={1} value={v.value ?? ""} onChange={f.input("value")} />
          </Field>
          <Field label="Lượt dùng / mã" hint="Trống = không giới hạn">
            <Input type="number" min={1} value={v.maxUses ?? ""} onChange={f.input("maxUses")} />
          </Field>
          <Field label="Đơn tối thiểu (đ)">
            <Input type="number" min={0} step={1000} value={v.minAmount ?? 0} onChange={f.input("minAmount")} />
          </Field>
          <Field label="Hết hạn" className="sm:col-span-2">
            <Input type="datetime-local" value={v.endsAt} onChange={f.input("endsAt")} />
          </Field>
          <p className="text-xs text-muted sm:col-span-3">
            Ví dụ: <span className="font-mono font-bold text-brand-600">{(v.prefix || "") + "X".repeat(Math.max(4, Math.min(16, Number(v.length) || 6)))}</span> · giảm {valueText(v)}
          </p>
        </div>
      )}
    </Modal>
  );
}
