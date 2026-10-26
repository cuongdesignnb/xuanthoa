"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Ban, CheckCircle2, Clock, Download, Receipt, RotateCcw, Undo2, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Drawer, ErrorState, Input, Skeleton, StatusBadge, Tabs, Textarea, toast, useConfirm, Level } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, StatCard } from "@/components/admin/page";
import { api, fmtDate, num, vnd, vndShort } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { METHOD_OPTIONS, MethodChip, TYPE_OPTIONS, TYPE_TONE, downloadCsv } from "./shared";

export type AdminOrder = {
  id: string;
  code: string;
  itemName: string;
  billing: string;
  amount: number;
  discount: number;
  total: number;
  couponCode: string | null;
  paymentMethod: string;
  status: "pending" | "paid" | "refund_requested" | "refunded" | "cancelled";
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  planId: string | null;
  courseId: string | null;
  type: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
};

type Summary = {
  revenue: number;
  amount: number;
  discount: number;
  count: number;
  paid: number;
  pending: number;
  pendingAmount: number;
  refundRequested: number;
  refunded: number;
  refundedAmount: number;
  cancelled: number;
};

const STATUS_TABS = [
  { value: "", label: "Tất cả", key: "count" },
  { value: "pending", label: "Chờ thanh toán", key: "pending" },
  { value: "paid", label: "Đã thanh toán", key: "paid" },
  { value: "refund_requested", label: "Yêu cầu hoàn tiền", key: "refundRequested" },
  { value: "refunded", label: "Đã hoàn tiền", key: "refunded" },
  { value: "cancelled", label: "Đã huỷ", key: "cancelled" },
] as const;

export default function OrdersAdmin() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTable<AdminOrder>("/admin/orders", { filters: sp.get("status") ? { status: sp.get("status")! } : {} });
  const summary = (t.data as unknown as { summary?: Summary } | undefined)?.summary;
  const plans = useApi<{ value: string; label: string }[]>("/admin/options/plans");
  const courses = useApi<{ value: string; label: string }[]>("/admin/options/courses");
  const openId = sp.get("id");
  const setOpen = (id: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (id) p.set("id", id);
    else p.delete("id");
    router.replace(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };
  const f = t.state.filters;

  // Tổng cho tab "Tất cả" = mọi trạng thái khớp bộ lọc còn lại
  const allCount = summary ? summary.paid + summary.pending + summary.refundRequested + summary.refunded + summary.cancelled : undefined;

  const cols: Column<AdminOrder>[] = [
    { key: "code", header: "Mã đơn", sortable: true, cell: (o) => <span className="font-mono text-xs font-semibold">{o.code}</span> },
    {
      key: "user",
      header: "Học viên",
      cell: (o) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar src={o.userAvatar} name={o.userName} size={32} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{o.userName}</p>
            <p className="truncate text-[11px] text-muted">{o.userEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "item",
      header: "Sản phẩm",
      cell: (o) => (
        <div className="min-w-0 max-w-[220px]">
          <p className="truncate font-medium">{o.itemName}</p>
          <Badge tone={TYPE_TONE[o.type] ?? "gray"} className="mt-0.5">
            {o.type}
          </Badge>
        </div>
      ),
    },
    { key: "amount", header: "Giá", sortable: true, hideOnMobile: true, cell: (o) => <span className="whitespace-nowrap text-muted">{vnd(o.amount)}</span> },
    {
      key: "discount",
      header: "Giảm",
      hideOnMobile: true,
      cell: (o) =>
        o.discount ? (
          <span className="whitespace-nowrap text-emerald-600" title={o.couponCode ?? undefined}>
            −{vnd(o.discount)}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: "total", header: "Thành tiền", sortable: true, cell: (o) => <span className="whitespace-nowrap font-bold">{vnd(o.total)}</span> },
    { key: "method", header: "Phương thức", hideOnMobile: true, cell: (o) => <MethodChip method={o.paymentMethod} /> },
    { key: "status", header: "Trạng thái", sortable: true, cell: (o) => <StatusBadge status={o.status} label={o.status === "paid" ? "Đã thanh toán" : undefined} /> },
    { key: "createdAt", header: "Ngày đặt", sortable: true, cell: (o) => <span className="whitespace-nowrap text-xs text-muted">{fmtDate(o.createdAt, true)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Đơn hàng"
        subtitle="Quản lý đơn hàng, thanh toán và yêu cầu hoàn tiền."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Đơn hàng" }]}
        actions={
          <Button variant="outline" icon={<Download className="size-4" />} onClick={() => downloadCsv("/admin/orders/export.csv", { ...f, q: t.state.q })}>
            Xuất CSV
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} icon={<Wallet className="size-5" />} label="Doanh thu (theo bộ lọc)" value={summary ? vndShort(summary.revenue) : "…"} sub={summary ? `Giảm giá ${vndShort(summary.discount)} · ${num(summary.count)} đơn` : undefined} />
        <StatCard index={1} tone="green" icon={<CheckCircle2 className="size-5" />} label="Đã thanh toán" value={summary ? num(summary.paid) : "…"} sub="Đơn đã kích hoạt" />
        <StatCard index={2} tone="amber" icon={<Clock className="size-5" />} label="Chờ thanh toán" value={summary ? num(summary.pending) : "…"} sub={summary ? `Giá trị ${vnd(summary.pendingAmount)}` : undefined} />
        <button className="text-left" onClick={() => t.setFilter("status", "refund_requested")}>
          <StatCard index={3} tone="pink" icon={<RotateCcw className="size-5" />} label="Yêu cầu hoàn tiền" value={summary ? num(summary.refundRequested) : "…"} sub={summary ? `Đã hoàn ${num(summary.refunded)} đơn · ${vndShort(summary.refundedAmount)}` : undefined} />
        </button>
      </div>

      <Tabs
        className="mb-3"
        value={f.status ?? ""}
        onChange={(v) => t.setFilter("status", v)}
        tabs={STATUS_TABS.map((s) => ({
          value: s.value,
          label: s.label,
          count: summary ? (s.key === "count" ? allCount : (summary[s.key as keyof Summary] as number)) : undefined,
        }))}
      />

      <TableCard
        table={t}
        columns={cols}
        rowKey={(o) => o.id}
        onRowClick={(o) => setOpen(o.id)}
        placeholder="Tìm mã đơn, tên, email…"
        filters={[
          { key: "method", label: "Phương thức", options: METHOD_OPTIONS },
          { key: "type", label: "Loại", options: TYPE_OPTIONS },
          { key: "planId", label: "Gói học", options: plans.data ?? [] },
          { key: "courseId", label: "Khóa học", options: courses.data ?? [] },
        ]}
        actions={
          <div className="flex items-center gap-1.5">
            <Input type="date" aria-label="Từ ngày" className="h-10 w-[140px] text-xs" value={f.from ?? ""} onChange={(e) => t.setFilter("from", e.target.value)} />
            <span className="text-xs text-muted">–</span>
            <Input type="date" aria-label="Đến ngày" className="h-10 w-[140px] text-xs" value={f.to ?? ""} onChange={(e) => t.setFilter("to", e.target.value)} />
          </div>
        }
        empty={<div className="py-12 text-center text-sm text-muted">Không có đơn hàng phù hợp bộ lọc.</div>}
      />

      <OrderDrawer id={openId} onClose={() => setOpen(null)} />
    </div>
  );
}

type OrderDetail = AdminOrder & {
  userPhone: string | null;
  userLevel: string | null;
  userCreatedAt: string;
  planName: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  courseLevel: string | null;
  history: { id: string; code: string; itemName: string; total: number; status: string; createdAt: string }[];
  customer: { orders: number; spent: number };
  unlockedCourses: number;
};

export function OrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, loading, error, reload } = useApi<OrderDetail>(id ? `/admin/orders/${id}` : null, { dedupeMs: 0 });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("orders.write");

  const act = async (action: string, msg: string, opts?: { confirm?: string; danger?: boolean }) => {
    if (!data) return;
    if (opts?.confirm && !(await confirm({ title: opts.confirm, message: `Đơn ${data.code} – ${data.itemName}`, danger: opts.danger }))) return;
    setBusy(action);
    try {
      await api(`/admin/orders/${data.id}/${action}`, { method: "POST", body: note ? { note } : {} });
      toast.success(msg);
      setNote("");
      invalidate("/admin/orders");
      invalidate("/admin/dashboard");
      reload();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };

  const o = data;
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={o ? <span className="font-mono">{o.code}</span> : "Chi tiết đơn hàng"}
      footer={
        o && canWrite ? (
          <div className="flex w-full flex-wrap justify-end gap-2">
            {o.status === "pending" && (
              <>
                <Button variant="ghost" icon={<Ban className="size-4" />} loading={busy === "cancel"} onClick={() => act("cancel", "Đã huỷ đơn hàng", { confirm: "Huỷ đơn hàng này?", danger: true })}>
                  Huỷ đơn
                </Button>
                <Button icon={<CheckCircle2 className="size-4" />} loading={busy === "mark-paid"} onClick={() => act("mark-paid", "Đã xác nhận thanh toán & kích hoạt", { confirm: "Xác nhận đã nhận tiền cho đơn này?" })}>
                  Xác nhận đã thanh toán
                </Button>
              </>
            )}
            {o.status === "refund_requested" && (
              <>
                <Button variant="ghost" icon={<Undo2 className="size-4" />} loading={busy === "refund-reject"} onClick={() => act("refund-reject", "Đã từ chối yêu cầu hoàn tiền")}>
                  Từ chối
                </Button>
                <Button variant="danger" icon={<RotateCcw className="size-4" />} loading={busy === "refund-approve"} onClick={() => act("refund-approve", "Đã duyệt hoàn tiền", { confirm: "Duyệt hoàn tiền và khoá quyền truy cập?", danger: true })}>
                  Duyệt hoàn tiền
                </Button>
              </>
            )}
            {o.status === "paid" && (
              <Button variant="outline" icon={<RotateCcw className="size-4" />} loading={busy === "refund-approve"} onClick={() => act("refund-approve", "Đã hoàn tiền đơn hàng", { confirm: "Hoàn tiền đơn này và khoá quyền truy cập?", danger: true })}>
                Hoàn tiền
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {loading || (!o && !error) ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : o ? (
        <div className="space-y-5 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-50 to-white p-4">
            <div>
              <p className="text-xs text-muted">Thành tiền</p>
              <p className="text-2xl font-extrabold text-brand-600">{vnd(o.total)}</p>
            </div>
            <StatusBadge status={o.status} label={o.status === "paid" ? "Đã thanh toán" : undefined} />
          </div>

          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Học viên</h4>
            <div className="flex items-center gap-3 rounded-xl border border-ink/5 p-3">
              <Avatar src={o.userAvatar} name={o.userName} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{o.userName}</p>
                <p className="truncate text-xs text-muted">
                  {o.userEmail}
                  {o.userPhone && ` · ${o.userPhone}`}
                </p>
                <p className="text-[11px] text-muted">
                  Tham gia {fmtDate(o.userCreatedAt)} · {num(o.customer.orders)} đơn · đã chi {vnd(o.customer.spent)}
                </p>
              </div>
              <Level level={o.userLevel} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Đơn hàng</h4>
            <dl className="divide-y divide-ink/5 rounded-xl border border-ink/5">
              {[
                ["Sản phẩm", <span key="i" className="font-semibold">{o.itemName}</span>],
                ["Loại", <Badge key="t" tone={TYPE_TONE[o.type] ?? "gray"}>{o.type}</Badge>],
                o.courseTitle ? ["Khóa học", <span key="c" className="flex items-center justify-end gap-1.5">{o.courseLevel && <Level level={o.courseLevel} />}{o.courseTitle}</span>] : null,
                o.planName ? ["Gói học", `${o.planName} · ${o.billing === "year" ? "theo năm" : "theo tháng"}`] : null,
                ["Khóa học được mở", `${o.unlockedCourses} khóa`],
                ["Giá", vnd(o.amount)],
                ["Giảm giá", o.discount ? `−${vnd(o.discount)}${o.couponCode ? ` (${o.couponCode})` : ""}` : "—"],
                ["Phương thức", <MethodChip key="m" method={o.paymentMethod} />],
                ["Ngày đặt", fmtDate(o.createdAt, true)],
                ["Ngày thanh toán", fmtDate(o.paidAt, true)],
              ]
                .filter(Boolean)
                .map((row) => {
                  const [k, v] = row as [string, React.ReactNode];
                  return (
                    <div key={k} className="flex items-center justify-between gap-4 px-3 py-2">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  );
                })}
            </dl>
          </section>

          {o.note && (
            <section className={o.status === "refund_requested" ? "rounded-xl bg-orange-50 p-3" : "rounded-xl bg-ink/[.03] p-3"}>
              <p className="text-xs font-bold text-muted">{o.status === "refund_requested" ? "Lý do yêu cầu hoàn tiền" : "Ghi chú"}</p>
              <p className="mt-1 italic">“{o.note}”</p>
            </section>
          )}

          {canWrite && ["pending", "paid", "refund_requested"].includes(o.status) && (
            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Ghi chú xử lý (tuỳ chọn)</h4>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú sẽ được lưu cùng thao tác…" />
            </section>
          )}

          {o.history.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                <Receipt className="size-3.5" /> Đơn khác của học viên
              </h4>
              <ul className="divide-y divide-ink/5 rounded-xl border border-ink/5">
                {o.history.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{h.itemName}</p>
                      <p className="text-[11px] text-muted">
                        <span className="font-mono">{h.code}</span> · {fmtDate(h.createdAt)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-semibold">{vnd(h.total)}</span>
                    <StatusBadge status={h.status} label={h.status === "paid" ? "Đã TT" : undefined} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}
