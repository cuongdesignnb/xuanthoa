"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, Check, Package, Pencil, Plus, Trash2, Users, Wallet } from "lucide-react";
import { Badge, Button, Card, Checkbox, Drawer, EmptyState, ErrorState, Field, IconButton, Input, Skeleton, Switch, TagInput, Textarea, toast, useConfirm, cx } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/table";
import { PageHeader, StatCard, useForm } from "@/components/admin/page";
import { api, num, vnd, vndShort } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

type AdminPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  levels: string[];
  highlighted: boolean;
  active: boolean;
  order: number;
  orders: number;
  revenue: number;
  subscribers: number;
};

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const levelText = (lv: string[]) => (!lv.length ? "Tất cả cấp độ" : lv.length > 1 ? `${lv[0]} – ${lv[lv.length - 1]}` : lv[0]);

export default function PlansAdmin() {
  const { data, loading, error, reload } = useApi<{ items: AdminPlan[] }>("/admin/plans", { dedupeMs: 0 });
  const [yearly, setYearly] = useState(false);
  const [edit, setEdit] = useState<AdminPlan | "new" | null>(null);
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("plans.write");
  const plans = data?.items ?? [];

  const refresh = () => {
    invalidate("/admin/plans");
    invalidate("/public/plans");
    reload();
  };

  const move = async (i: number, d: number) => {
    const ids = plans.map((p) => p.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await api("/admin/plans/reorder", { body: { ids } });
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const patch = async (p: AdminPlan, body: Partial<AdminPlan>, msg: string) => {
    try {
      await api(`/admin/plans/${p.id}`, { method: "PATCH", body });
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (p: AdminPlan) => {
    if (!(await confirm({ title: `Xoá gói “${p.name}”?`, message: p.orders ? `Gói đã có ${num(p.orders)} đơn hàng. Đơn cũ vẫn được giữ lại nhưng mất liên kết gói — nên tắt “Đang bán” thay vì xoá.` : "Thao tác không thể hoàn tác.", danger: true, confirmText: "Xoá gói" }))) return;
    try {
      await api(`/admin/plans/${p.id}`, { method: "DELETE" });
      toast.success("Đã xoá gói học");
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const totals = plans.reduce((s, p) => ({ revenue: s.revenue + p.revenue, orders: s.orders + p.orders, subs: s.subs + p.subscribers }), { revenue: 0, orders: 0, subs: 0 });

  const cols: Column<AdminPlan>[] = [
    {
      key: "order",
      header: "#",
      cell: (p, i) => (
        <div className="flex items-center gap-0.5">
          <IconButton label="Lên" disabled={!canWrite || i === 0} onClick={(e) => (e.stopPropagation(), move(i, -1))}>
            <ArrowUp className="size-3.5" />
          </IconButton>
          <IconButton label="Xuống" disabled={!canWrite || i === plans.length - 1} onClick={(e) => (e.stopPropagation(), move(i, 1))}>
            <ArrowDown className="size-3.5" />
          </IconButton>
        </div>
      ),
    },
    {
      key: "name",
      header: "Gói học",
      cell: (p) => (
        <div>
          <p className="flex items-center gap-1.5 font-semibold">
            {p.name}
            {p.highlighted && <Badge tone="pink">Phổ biến</Badge>}
          </p>
          <p className="font-mono text-[11px] text-muted">{p.code}</p>
        </div>
      ),
    },
    { key: "levels", header: "Cấp độ", cell: (p) => <span className="text-xs">{levelText(p.levels)}</span> },
    { key: "priceMonthly", header: "Giá tháng", cell: (p) => <span className="whitespace-nowrap font-semibold">{vnd(p.priceMonthly)}</span> },
    { key: "priceYearly", header: "Giá năm (/tháng)", cell: (p) => <span className="whitespace-nowrap">{vnd(p.priceYearly)}</span> },
    { key: "orders", header: "Đơn đã TT", hideOnMobile: true, cell: (p) => num(p.orders) },
    { key: "subscribers", header: "Học viên (12 th)", hideOnMobile: true, cell: (p) => num(p.subscribers) },
    { key: "revenue", header: "Doanh thu", cell: (p) => <span className="whitespace-nowrap font-bold text-brand-600">{vndShort(p.revenue)}</span> },
    {
      key: "active",
      header: "Đang bán",
      cell: (p) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch checked={p.active} disabled={!canWrite} onChange={(v) => patch(p, { active: v }, v ? `Đã mở bán gói ${p.name}` : `Đã ngừng bán gói ${p.name}`)} />
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (p) =>
        canWrite && (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <IconButton label="Sửa" onClick={() => setEdit(p)}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton label="Xoá" className="hover:text-red-600" onClick={() => remove(p)}>
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gói học / Subscription"
        subtitle="Cấu hình bảng giá hiển thị ở trang chủ và quyền truy cập khóa học theo gói."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Gói học" }]}
        actions={
          canWrite && (
            <Button icon={<Plus className="size-4" />} onClick={() => setEdit("new")}>
              Thêm gói
            </Button>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard index={0} icon={<Wallet className="size-5" />} label="Doanh thu Subscription (toàn thời gian)" value={data ? vndShort(totals.revenue) : "…"} />
        <StatCard index={1} tone="violet" icon={<Package className="size-5" />} label="Đơn gói đã thanh toán" value={data ? num(totals.orders) : "…"} />
        <StatCard index={2} tone="green" icon={<Users className="size-5" />} label="Học viên mua gói (12 tháng)" value={data ? num(totals.subs) : "…"} />
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <Card className="mb-5 p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">Xem trước bảng giá</h3>
                <p className="text-xs text-muted">Hiển thị đúng như trên trang chủ (chỉ các gói đang bán). Bấm vào thẻ để chỉnh sửa.</p>
              </div>
              <div className="flex rounded-full border border-ink/10 bg-white p-1 text-xs font-semibold">
                {["Theo tháng", "Theo năm"].map((l, i) => (
                  <button key={l} onClick={() => setYearly(i === 1)} className={cx("rounded-full px-3 py-1.5 transition", yearly === (i === 1) ? "bg-brand-500 text-white" : "text-muted")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-72" />
                ))}
              </div>
            ) : !plans.length ? (
              <EmptyState title="Chưa có gói học" description="Tạo gói đầu tiên để hiển thị bảng giá." />
            ) : (
              <div className="grid gap-4 py-2 md:grid-cols-3">
                {plans.map((p) => {
                  const price = yearly ? p.priceYearly : p.priceMonthly;
                  return (
                    <motion.button
                      key={p.id}
                      layout
                      type="button"
                      whileHover={{ y: -4 }}
                      onClick={() => canWrite && setEdit(p)}
                      className={cx(
                        "relative flex flex-col rounded-2xl bg-white p-4 text-left transition",
                        p.highlighted ? "border-2 border-brand-500 shadow-xl shadow-brand-500/15" : "border border-ink/10 shadow-sm",
                        !p.active && "opacity-50 grayscale",
                      )}
                    >
                      {p.highlighted && <span className="absolute -top-3 right-4 rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">Phổ biến nhất</span>}
                      {!p.active && <span className="absolute -top-3 left-4 rounded-full bg-ink px-2.5 py-0.5 text-[10px] font-bold text-white">Ngừng bán</span>}
                      <h3 className="font-bold">{p.name}</h3>
                      <p className="text-[11px] text-muted">{p.description}</p>
                      <p className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold">{vnd(price)}</span>
                        <span className="text-xs text-muted">/ tháng</span>
                      </p>
                      {yearly && <p className="text-[10px] text-emerald-600">Thanh toán {vnd(price * 12)}/năm</p>}
                      <ul className="mt-3 flex-1 space-y-2">
                        {p.features.map((f) => (
                          <li key={f} className="flex gap-1.5 text-xs text-ink/80">
                            <Check className="mt-px size-3.5 shrink-0 text-brand-500" strokeWidth={3} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center justify-between border-t border-ink/5 pt-3 text-[11px] text-muted">
                        <span>{levelText(p.levels)}</span>
                        <span>
                          {num(p.orders)} đơn · <b className="text-brand-600">{vndShort(p.revenue)}</b>
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <DataTable rows={plans} loading={loading} columns={cols} rowKey={(p) => p.id} onRowClick={canWrite ? (p) => setEdit(p) : undefined} />
          </Card>
        </>
      )}

      <PlanDrawer plan={edit} onClose={() => setEdit(null)} onSaved={refresh} nextOrder={plans.length} />
    </div>
  );
}

function PlanDrawer({ plan, onClose, onSaved, nextOrder }: { plan: AdminPlan | "new" | null; onClose: () => void; onSaved: () => void; nextOrder: number }) {
  return (
    <Drawer open={!!plan} onClose={onClose} title={plan === "new" ? "Thêm gói học" : plan ? `Sửa gói ${plan.name}` : ""}>
      {plan && <PlanForm key={plan === "new" ? "new" : plan.id} plan={plan === "new" ? null : plan} onClose={onClose} onSaved={onSaved} nextOrder={nextOrder} />}
    </Drawer>
  );
}

function PlanForm({ plan, onClose, onSaved, nextOrder }: { plan: AdminPlan | null; onClose: () => void; onSaved: () => void; nextOrder: number }) {
  const f = useForm({
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    priceMonthly: plan?.priceMonthly ?? 0,
    priceYearly: plan?.priceYearly ?? 0,
    features: plan?.features ?? [],
    levels: plan?.levels ?? [],
    highlighted: plan?.highlighted ?? false,
    active: plan?.active ?? true,
  });
  const v = f.values;
  const save = async () => {
    try {
      await f.submit((vals) =>
        plan ? api(`/admin/plans/${plan.id}`, { method: "PATCH", body: vals }) : api("/admin/plans", { body: { ...vals, order: nextOrder } }),
      );
      toast.success(plan ? "Đã cập nhật gói học" : "Đã tạo gói học");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };
  const save20 = v.priceMonthly ? Math.round((1 - v.priceYearly / v.priceMonthly) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên gói" required error={f.errors.name}>
          <Input value={v.name} onChange={f.input("name")} placeholder="Nâng cao" />
        </Field>
        <Field label="Mã gói" required error={f.errors.code} hint="Dùng trong đường dẫn thanh toán">
          <Input value={v.code} onChange={f.input("code")} placeholder="nang-cao" className="font-mono" />
        </Field>
      </div>
      <Field label="Mô tả ngắn" error={f.errors.description}>
        <Textarea rows={2} value={v.description} onChange={f.input("description")} placeholder="Dành cho người học nghiêm túc" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Giá theo tháng (đ)" required error={f.errors.priceMonthly}>
          <Input type="number" min={0} step={1000} value={v.priceMonthly} onChange={f.input("priceMonthly")} />
        </Field>
        <Field
          label="Giá mỗi tháng khi trả theo năm (đ)"
          required
          error={f.errors.priceYearly}
          hint={
            <span className="flex items-center justify-between gap-2">
              <span>{save20 > 0 ? `Tiết kiệm ${save20}% · ${vnd(v.priceYearly * 12)}/năm` : `${vnd(v.priceYearly * 12)}/năm`}</span>
              <button type="button" className="font-semibold text-brand-500" onClick={() => f.set("priceYearly", Math.round((v.priceMonthly * 0.8) / 1000) * 1000)}>
                Giảm 20%
              </button>
            </span>
          }
        >
          <Input type="number" min={0} step={1000} value={v.priceYearly} onChange={f.input("priceYearly")} />
        </Field>
      </div>
      <Field label="Quyền lợi" hint="Nhấn Enter để thêm từng dòng" error={f.errors.features}>
        <TagInput value={v.features} onChange={(x) => f.set("features", x)} placeholder="Truy cập toàn bộ khóa học N5 – N3" />
      </Field>
      <Field label="Cấp độ khóa học được mở khoá" hint="Không chọn = mở tất cả khóa học">
        <div className="flex flex-wrap gap-3">
          {LEVELS.map((lv) => (
            <Checkbox key={lv} label={lv} checked={v.levels.includes(lv)} onChange={(c) => f.set("levels", c ? LEVELS.filter((x) => x === lv || v.levels.includes(x)) : v.levels.filter((x) => x !== lv))} />
          ))}
        </div>
      </Field>
      <div className="flex flex-wrap gap-6 rounded-xl bg-ink/[.03] p-3">
        <Switch checked={v.highlighted} onChange={(x) => f.set("highlighted", x)} label="Đánh dấu “Phổ biến nhất”" />
        <Switch checked={v.active} onChange={(x) => f.set("active", x)} label="Đang bán" />
      </div>
      <div className="flex justify-end gap-2 border-t border-ink/5 pt-4">
        <Button variant="ghost" onClick={onClose}>
          Huỷ
        </Button>
        <Button loading={f.submitting} onClick={save}>
          {plan ? "Lưu thay đổi" : "Tạo gói"}
        </Button>
      </div>
    </div>
  );
}
