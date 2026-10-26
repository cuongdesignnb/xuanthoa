"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, CreditCard, Loader2, ReceiptText, RotateCcw, Sparkles, X } from "lucide-react";
import { Breadcrumb, Card, LevelBadge, PageBanner } from "@/components/site";
import { api, fmtDate, vnd } from "@/lib/api";
import { useApi } from "@/lib/hooks";

type MyOrder = {
  id: string;
  code: string;
  itemName: string;
  billing: string;
  amount: number;
  discount: number;
  couponCode: string | null;
  paymentMethod: string;
  status: "pending" | "paid" | "refund_requested" | "refunded" | "cancelled";
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  planId: string | null;
  courseId: string | null;
  courseSlug: string | null;
  courseLevel: string | null;
};

const STATUS: Record<MyOrder["status"], { label: string; cls: string }> = {
  pending: { label: "Chờ thanh toán", cls: "bg-amber-50 text-amber-600" },
  paid: { label: "Đã thanh toán", cls: "bg-emerald-50 text-emerald-600" },
  refund_requested: { label: "Đang xử lý hoàn tiền", cls: "bg-orange-50 text-orange-600" },
  refunded: { label: "Đã hoàn tiền", cls: "bg-violet-50 text-violet-600" },
  cancelled: { label: "Đã huỷ", cls: "bg-ink/5 text-ink/60" },
};
const METHOD: Record<string, string> = { vnpay: "VNPAY", momo: "MoMo", bank: "Chuyển khoản", card: "Thẻ" };

const TABS = [
  { v: "", l: "Tất cả" },
  { v: "paid", l: "Đã thanh toán" },
  { v: "pending", l: "Chờ thanh toán" },
  { v: "refund", l: "Hoàn tiền" },
];

export default function MyOrders() {
  const { data, loading, error, reload } = useApi<{ items: MyOrder[] }>("/me/orders", { dedupeMs: 0 });
  const [tab, setTab] = useState("");
  const [refund, setRefund] = useState<MyOrder | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const items = (data?.items ?? []).filter((o) =>
    !tab ? true : tab === "refund" ? o.status === "refund_requested" || o.status === "refunded" : o.status === tab,
  );
  const spent = (data?.items ?? []).filter((o) => o.status === "paid").reduce((s, o) => s + o.amount - o.discount, 0);

  const pay = async (o: MyOrder) => {
    setBusy(o.id);
    try {
      await api(`/me/orders/${o.id}/pay`, { method: "POST" });
      await reload();
    } finally {
      setBusy(null);
    }
  };
  const cancel = async (o: MyOrder) => {
    setBusy(o.id);
    try {
      await api(`/me/orders/${o.id}/cancel`, { method: "POST" });
      await reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageBanner compact script={null}>
        <Breadcrumb items={[{ label: "Tài khoản", href: "/dashboard" }, { label: "Đơn hàng của tôi" }]} />
        <h1 className="text-3xl font-extrabold tracking-tight">
          Đơn hàng <span className="text-brand-500">của tôi</span>
        </h1>
        <p className="mt-2 text-sm text-muted">Theo dõi lịch sử thanh toán, trạng thái kích hoạt và gửi yêu cầu hoàn tiền.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Stat icon={<ReceiptText className="size-4" />} label="Tổng đơn" value={String(data?.items.length ?? "—")} />
          <Stat icon={<CreditCard className="size-4" />} label="Đã chi" value={data ? vnd(spent) : "—"} />
        </div>
      </PageBanner>

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t.v ? "bg-brand-500 text-white shadow" : "bg-white text-muted ring-1 ring-ink/10 hover:text-ink"}`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-ink/[.04]" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-sm">
            <p className="font-semibold">{error.message}</p>
            <button onClick={reload} className="mt-3 rounded-lg border border-brand-300 px-4 py-1.5 text-xs font-semibold text-brand-500">
              Thử lại
            </button>
          </Card>
        ) : !items.length ? (
          <Card className="p-10 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
              <ReceiptText className="size-7" />
            </div>
            <p className="font-bold">Chưa có đơn hàng nào</p>
            <p className="mt-1 text-sm text-muted">Chọn một gói học hoặc khóa học để bắt đầu hành trình tiếng Nhật.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/#bang-gia" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                Xem bảng giá
              </Link>
              <Link href="/khoa-hoc" className="rounded-lg border-2 border-brand-300 px-4 py-2 text-sm font-semibold text-brand-500">
                Khóa học
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
                    {o.planId ? <Sparkles className="size-6" /> : <BookOpen className="size-6" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{o.itemName}</p>
                      {o.courseLevel && <LevelBadge level={o.courseLevel} />}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      <span className="font-mono">{o.code}</span> · {fmtDate(o.createdAt, true)} · {METHOD[o.paymentMethod] ?? o.paymentMethod}
                      {o.couponCode && ` · Mã ${o.couponCode}`}
                    </p>
                    {o.note && (o.status === "refund_requested" || o.status === "refunded") && <p className="mt-1 text-xs italic text-ink/60">“{o.note}”</p>}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <div className="text-right">
                      <p className="text-lg font-extrabold">{vnd(o.amount - o.discount)}</p>
                      {o.discount > 0 && <p className="text-[11px] text-muted line-through">{vnd(o.amount)}</p>}
                    </div>
                    <div className="flex gap-2">
                      {o.status === "pending" && (
                        <>
                          <button onClick={() => cancel(o)} disabled={busy === o.id} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-ink/5">
                            Huỷ
                          </button>
                          <button
                            onClick={() => pay(o)}
                            disabled={busy === o.id}
                            className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                          >
                            {busy === o.id && <Loader2 className="size-3 animate-spin" />} Thanh toán
                          </button>
                        </>
                      )}
                      {o.status === "paid" && o.courseSlug && (
                        <Link href={`/khoa-hoc/${o.courseSlug}`} className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100">
                          Vào học
                        </Link>
                      )}
                      {o.status === "paid" && (
                        <button onClick={() => setRefund(o)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-ink/5">
                          <RotateCcw className="size-3" /> Hoàn tiền
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <RefundDialog order={refund} onClose={() => setRefund(null)} onDone={reload} />
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/80 px-3 py-2 shadow-sm ring-1 ring-ink/5">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-500">{icon}</span>
      <div>
        <p className="text-[11px] text-muted">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function RefundDialog({ order, onClose, onDone }: { order: MyOrder | null; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!order) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/me/orders/${order.id}/refund-request`, { body: { note } });
      setNote("");
      onClose();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AnimatePresence>
      {order && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <button onClick={onClose} aria-label="Đóng" className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-ink/50 hover:bg-ink/5">
              <X className="size-4" />
            </button>
            <h3 className="text-lg font-bold">Yêu cầu hoàn tiền</h3>
            <p className="mt-1 text-sm text-muted">
              Đơn <b className="text-ink">{order.code}</b> – {order.itemName} ({vnd(order.amount - order.discount)})
            </p>
            <label className="mt-4 block text-xs font-semibold text-ink/70">Lý do hoàn tiền</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Cho chúng mình biết lý do để hỗ trợ bạn tốt hơn…"
              className="mt-1.5 w-full rounded-lg border border-ink/10 p-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            />
            {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
            <p className="mt-2 text-[11px] text-muted">Yêu cầu sẽ được xử lý trong 1–3 ngày làm việc. Khóa học sẽ bị khoá sau khi hoàn tiền.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:bg-ink/5">
                Đóng
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" />} Gửi yêu cầu
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
