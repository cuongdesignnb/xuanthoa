"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Gift,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { Breadcrumb, Card, LevelBadge, PageBanner } from "@/components/site";
import { api, ApiError, vnd } from "@/lib/api";
import { useApi, useDebounced, invalidate } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { Plan } from "@/components/Pricing";

type CourseInfo = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  level: string | null;
  price: number;
  salePrice: number | null;
  effectivePrice?: number;
  durationHours: number;
  lessonsCount?: number;
  enrolled?: boolean;
  teacher?: { name: string } | null;
};

type Order = {
  id: string;
  code: string;
  itemName: string;
  amount: number;
  discount: number;
  couponCode: string | null;
  paymentMethod: Method;
  status: string;
  courseId: string | null;
  planId: string | null;
};

type Payment = {
  method: Method;
  methodLabel: string;
  total: number;
  content: string;
  expiresInSec: number;
  qr?: string;
  note?: string;
  bank?: { name: string; account: string; holder: string; branch: string };
};

type Method = "vnpay" | "momo" | "bank" | "card";
type CouponState = { status: "idle" | "checking" | "valid" | "invalid"; code?: string; discount?: number; reason?: string };

const METHODS: { value: Method; label: string; desc: string; icon: React.ReactNode; tone: string }[] = [
  { value: "vnpay", label: "VNPAY", desc: "QR ngân hàng, ví VNPAY", icon: <QrCode className="size-5" />, tone: "bg-sky-50 text-sky-600" },
  { value: "momo", label: "Ví MoMo", desc: "Quét mã bằng ứng dụng MoMo", icon: <Wallet className="size-5" />, tone: "bg-pink-50 text-pink-600" },
  { value: "bank", label: "Chuyển khoản", desc: "Chuyển khoản ngân hàng 24/7", icon: <Building2 className="size-5" />, tone: "bg-emerald-50 text-emerald-600" },
  { value: "card", label: "Thẻ quốc tế", desc: "Visa, Mastercard, JCB", icon: <CreditCard className="size-5" />, tone: "bg-violet-50 text-violet-600" },
];

export default function Checkout() {
  const sp = useSearchParams();
  const planCode = sp.get("plan");
  const courseSlug = sp.get("course");
  const [billing, setBilling] = useState<"month" | "year">(sp.get("billing") === "year" ? "year" : "month");
  const [method, setMethod] = useState<Method>("vnpay");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });
  const [step, setStep] = useState<"form" | "gateway" | "success">("form");
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [result, setResult] = useState<{ enrolled: number; courseCount: number; course: { slug: string; title: string } | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const plans = useApi<{ items: Plan[] }>(planCode ? "/public/plans" : null);
  const course = useApi<CourseInfo>(courseSlug ? `/public/courses/${encodeURIComponent(courseSlug)}` : null);
  const plan = plans.data?.items.find((p) => p.code === planCode) ?? null;

  const amount = plan ? (billing === "year" ? plan.priceYearly * 12 : plan.priceMonthly) : course.data ? (course.data.effectivePrice ?? course.data.salePrice ?? course.data.price) : 0;
  const listAmount = plan ? (billing === "year" ? plan.priceMonthly * 12 : plan.priceMonthly) : course.data?.price ?? 0;
  const discount = coupon.status === "valid" ? (coupon.discount ?? 0) : 0;
  const total = Math.max(0, amount - discount);
  const itemRef = plan ? { planId: plan.code, billing } : courseSlug ? { courseSlug } : null;
  const itemKey = plan ? `${plan.code}:${billing}` : (courseSlug ?? "");

  // Kiểm tra mã giảm giá tự động (debounce) — chạy lại khi đổi gói/chu kỳ.
  const debouncedCode = useDebounced(couponInput.trim(), 500);
  useEffect(() => {
    if (!debouncedCode || debouncedCode.length < 3 || !itemRef || !amount) return;
    let alive = true;
    const t = setTimeout(() => alive && setCoupon({ status: "checking" }), 0);
    api<{ valid: boolean; code?: string; discount: number; reason?: string }>("/public/coupons/validate", {
      body: { code: debouncedCode, amount, ...itemRef },
    })
      .then((r) => alive && setCoupon(r.valid ? { status: "valid", code: r.code, discount: r.discount } : { status: "invalid", reason: r.reason }))
      .catch((e: ApiError) => alive && setCoupon({ status: "invalid", reason: e.message }));
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCode, itemKey, amount]);

  const loginHref = `/dang-nhap?next=${encodeURIComponent(`${pathname}?${sp.toString()}`)}`;

  const submit = async () => {
    if (!user) return router.push(loginHref);
    if (!itemRef) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api<{ order: Order; payment: Payment }>("/me/checkout", {
        body: { ...itemRef, couponCode: coupon.status === "valid" ? coupon.code : null, paymentMethod: method },
      });
      setOrder(r.order);
      setPayment(r.payment);
      setStep("gateway");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const loading = (planCode && plans.loading) || (courseSlug && course.loading);
  const notFound = !loading && !plan && !course.data;

  return (
    <>
      <PageBanner compact script={<>Một bước nhỏ,<br />mở ra hành trình<br />chinh phục tiếng Nhật</>}>
        <Breadcrumb items={[{ label: plan ? "Bảng giá" : "Khóa học", href: plan ? "/#bang-gia" : "/khoa-hoc" }, { label: "Thanh toán" }]} />
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {step === "success" ? (
            <>
              Thanh toán <span className="text-brand-500">thành công!</span>
            </>
          ) : (
            <>
              Hoàn tất <span className="text-brand-500">đăng ký</span>
            </>
          )}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">Thanh toán an toàn qua VNPAY, MoMo, chuyển khoản hoặc thẻ quốc tế. Kích hoạt khóa học ngay sau khi thanh toán.</p>
        <Steps step={step} />
      </PageBanner>

      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="h-96 animate-pulse rounded-2xl bg-ink/[.04]" />
            <div className="h-80 animate-pulse rounded-2xl bg-ink/[.04]" />
          </div>
        ) : notFound ? (
          <Card className="mx-auto max-w-lg p-8 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
              <Gift className="size-7" />
            </div>
            <h2 className="text-lg font-bold">Chưa chọn gói học hoặc khóa học</h2>
            <p className="mt-1 text-sm text-muted">
              {course.error ? "Không tìm thấy khóa học bạn chọn hoặc dữ liệu tạm thời chưa sẵn sàng." : "Hãy chọn một gói học phù hợp để tiếp tục."}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href="/#bang-gia" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                Xem bảng giá
              </Link>
              <Link href="/khoa-hoc" className="rounded-lg border-2 border-brand-300 px-4 py-2 text-sm font-semibold text-brand-500 hover:bg-brand-50">
                Khám phá khóa học
              </Link>
            </div>
          </Card>
        ) : (
          <AnimatePresence mode="wait">
            {step === "form" && (
              <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
                <div className="space-y-5">
                  {plan && (
                    <Card className="p-5">
                      <h2 className="font-bold">Chu kỳ thanh toán</h2>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {(["month", "year"] as const).map((b) => {
                          const per = b === "year" ? plan.priceYearly : plan.priceMonthly;
                          const save = plan.priceMonthly ? Math.round((1 - plan.priceYearly / plan.priceMonthly) * 100) : 0;
                          return (
                            <button
                              key={b}
                              onClick={() => setBilling(b)}
                              className={`relative rounded-xl border-2 p-4 text-left transition ${billing === b ? "border-brand-500 bg-brand-50/50" : "border-ink/10 hover:border-brand-200"}`}
                            >
                              {b === "year" && save > 0 && (
                                <span className="absolute -top-2.5 right-3 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">Tiết kiệm {save}%</span>
                              )}
                              <p className="text-sm font-semibold">{b === "year" ? "Theo năm" : "Theo tháng"}</p>
                              <p className="mt-1 text-xl font-extrabold">
                                {vnd(per)}
                                <span className="text-xs font-medium text-muted"> / tháng</span>
                              </p>
                              <p className="text-[11px] text-muted">{b === "year" ? `Thanh toán ${vnd(per * 12)} mỗi năm` : "Gia hạn hàng tháng, huỷ bất cứ lúc nào"}</p>
                              {billing === b && <CheckCircle2 className="absolute bottom-3 right-3 size-5 text-brand-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  <Card className="p-5">
                    <h2 className="font-bold">Phương thức thanh toán</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {METHODS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => setMethod(m.value)}
                          className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition ${method === m.value ? "border-brand-500 bg-brand-50/50" : "border-ink/10 hover:border-brand-200"}`}
                        >
                          <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${m.tone}`}>{m.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold">{m.label}</span>
                            <span className="block text-[11px] text-muted">{m.desc}</span>
                          </span>
                          <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${method === m.value ? "border-brand-500 bg-brand-500 text-white" : "border-ink/20"}`}>
                            {method === m.value && <Check className="size-3" strokeWidth={3.5} />}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                      <ShieldCheck className="size-3.5 text-emerald-500" /> Giao dịch được mã hoá SSL 256-bit. Nihongo+ không lưu thông tin thẻ của bạn.
                    </p>
                  </Card>

                  <Card className="p-5">
                    <h2 className="font-bold">Thông tin học viên</h2>
                    {user ? (
                      <div className="mt-3 flex items-center gap-3 rounded-xl bg-ink/[.03] p-3">
                        <div className="grid size-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-600">{user.name.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{user.name}</p>
                          <p className="truncate text-xs text-muted">{user.email}</p>
                        </div>
                        <BadgeCheck className="ml-auto size-5 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4 text-sm">
                        <span>Đăng nhập để hoàn tất thanh toán và nhận khóa học vào tài khoản.</span>
                        <Link href={loginHref} className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600">
                          Đăng nhập
                        </Link>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Tóm tắt đơn hàng */}
                <Card className="p-5 lg:sticky lg:top-24">
                  <h2 className="font-bold">Tóm tắt đơn hàng</h2>
                  <div className="mt-3 flex gap-3 rounded-xl bg-gradient-to-br from-brand-50 to-white p-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/30">
                      {plan ? <Sparkles className="size-6" /> : <BookOpen className="size-6" />}
                    </span>
                    <div className="min-w-0">
                      {plan ? (
                        <>
                          <p className="font-bold">Gói {plan.name}</p>
                          <p className="text-xs text-muted">{billing === "year" ? "Thanh toán theo năm (12 tháng)" : "Thanh toán theo tháng"}</p>
                        </>
                      ) : (
                        course.data && (
                          <>
                            <p className="line-clamp-2 font-bold">{course.data.title}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                              {course.data.level && <LevelBadge level={course.data.level} />}
                              {course.data.teacher?.name && <span>{course.data.teacher.name}</span>}
                            </p>
                          </>
                        )
                      )}
                    </div>
                  </div>
                  {plan && (
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex gap-1.5 text-xs text-ink/80">
                          <Check className="mt-px size-3.5 shrink-0 text-brand-500" strokeWidth={3} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {course.data && (
                    <p className="mt-3 flex gap-4 text-xs text-muted">
                      {!!course.data.lessonsCount && <span>{course.data.lessonsCount} bài học</span>}
                      {!!course.data.durationHours && <span>{course.data.durationHours} giờ học</span>}
                      <span>Truy cập trọn đời</span>
                    </p>
                  )}
                  {course.data?.enrolled && (
                    <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      Bạn đã sở hữu khóa học này.{" "}
                      <Link href={`/khoa-hoc/${course.data.slug}`} className="underline">
                        Vào học ngay
                      </Link>
                    </p>
                  )}

                  {/* Mã giảm giá */}
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-ink/70">Mã giảm giá</label>
                    <div className="relative mt-1.5">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
                      <input
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCoupon({ status: "idle" });
                        }}
                        placeholder="Nhập mã, vd WELCOME10"
                        className={`h-10 w-full rounded-lg border bg-white pl-9 pr-9 text-sm uppercase outline-none transition placeholder:normal-case placeholder:text-ink/35 focus:ring-4 focus:ring-brand-100 ${
                          coupon.status === "invalid" ? "border-red-300" : coupon.status === "valid" ? "border-emerald-400" : "border-ink/10 focus:border-brand-300"
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {coupon.status === "checking" && <Loader2 className="size-4 animate-spin text-brand-500" />}
                        {coupon.status === "valid" && <CheckCircle2 className="size-4 text-emerald-500" />}
                        {coupon.status === "invalid" && (
                          <button aria-label="Xoá mã" onClick={() => (setCouponInput(""), setCoupon({ status: "idle" }))}>
                            <X className="size-4 text-red-400" />
                          </button>
                        )}
                      </span>
                    </div>
                    {coupon.status === "valid" && <p className="mt-1 text-xs text-emerald-600">Đã áp dụng mã {coupon.code}: giảm {vnd(coupon.discount)}</p>}
                    {coupon.status === "invalid" && <p className="mt-1 text-xs text-red-500">{coupon.reason}</p>}
                  </div>

                  <dl className="mt-4 space-y-2 border-t border-dashed border-ink/10 pt-4 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted">Giá gốc</dt>
                      <dd className={listAmount > amount ? "text-muted line-through" : "font-semibold"}>{vnd(listAmount)}</dd>
                    </div>
                    {listAmount > amount && (
                      <div className="flex justify-between">
                        <dt className="text-muted">{plan ? "Ưu đãi gói năm" : "Giá khuyến mãi"}</dt>
                        <dd className="font-semibold">{vnd(amount)}</dd>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <dt>Mã giảm giá</dt>
                        <dd className="font-semibold">−{vnd(discount)}</dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between border-t border-ink/5 pt-3">
                      <dt className="font-bold">Tổng thanh toán</dt>
                      <dd className="text-2xl font-extrabold text-brand-500">{vnd(total)}</dd>
                    </div>
                  </dl>

                  {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={submitting || !!course.data?.enrolled}
                    onClick={submit}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                    {user ? `Thanh toán ${vnd(total)}` : "Đăng nhập để thanh toán"}
                  </motion.button>
                  <p className="mt-2 text-center text-[11px] text-muted">Hoàn tiền trong 7 ngày nếu chưa học quá 20% nội dung.</p>
                </Card>
              </motion.div>
            )}

            {step === "gateway" && order && payment && (
              <Gateway
                key="gateway"
                order={order}
                payment={payment}
                onPaid={(r) => {
                  setResult(r);
                  setStep("success");
                  invalidate("/me");
                  invalidate("/public/courses");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onCancel={() => {
                  setStep("form");
                  setOrder(null);
                  setPayment(null);
                }}
              />
            )}

            {step === "success" && order && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl">
                <Card className="relative overflow-hidden p-8 text-center">
                  <Confetti />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                    className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-500"
                  >
                    <CheckCircle2 className="size-11" />
                  </motion.div>
                  <h2 className="mt-4 text-2xl font-extrabold">Cảm ơn bạn! 🎉</h2>
                  <p className="mt-1 text-sm text-muted">
                    Đơn hàng <b className="text-ink">{order.code}</b> đã được thanh toán thành công.
                    {result?.course
                      ? ` Khóa học “${result.course.title}” đã được kích hoạt.`
                      : result?.courseCount
                        ? ` ${result.courseCount} khóa học thuộc gói đã được mở khoá.`
                        : " Quyền lợi của bạn đã được kích hoạt."}
                  </p>
                  <div className="mt-5 rounded-xl bg-ink/[.03] p-4 text-left text-sm">
                    <Row label="Sản phẩm" value={order.itemName} />
                    <Row label="Phương thức" value={METHODS.find((m) => m.value === order.paymentMethod)?.label ?? order.paymentMethod} />
                    <Row label="Đã thanh toán" value={<b className="text-brand-500">{vnd(order.amount - order.discount)}</b>} />
                  </div>
                  <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                    {result?.course ? (
                      <Link href={`/khoa-hoc/${result.course.slug}`} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
                        Vào học ngay
                      </Link>
                    ) : (
                      <Link href="/khoa-hoc" className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
                        Khám phá khóa học
                      </Link>
                    )}
                    <Link href="/dashboard" className="rounded-lg border-2 border-brand-300 px-5 py-2.5 text-sm font-semibold text-brand-500 hover:bg-brand-50">
                      Tới bảng điều khiển
                    </Link>
                  </div>
                  <Link href="/tai-khoan/don-hang" className="mt-4 inline-block text-xs font-semibold text-muted hover:text-brand-500">
                    Xem lịch sử đơn hàng →
                  </Link>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Steps({ step }: { step: "form" | "gateway" | "success" }) {
  const idx = { form: 0, gateway: 1, success: 2 }[step];
  return (
    <ol className="mt-5 flex max-w-md items-center gap-2 text-xs font-semibold">
      {["Thông tin đơn hàng", "Thanh toán", "Hoàn tất"].map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] ${i <= idx ? "bg-brand-500 text-white" : "bg-white text-muted ring-1 ring-ink/10"}`}>
            {i < idx ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className={`hidden sm:inline ${i <= idx ? "text-ink" : "text-muted"}`}>{s}</span>
          {i < 2 && <span className={`h-0.5 flex-1 rounded ${i < idx ? "bg-brand-500" : "bg-ink/10"}`} />}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Cổng thanh toán giả lập                                             */
/* ------------------------------------------------------------------ */

function Gateway({
  order,
  payment,
  onPaid,
  onCancel,
}: {
  order: Order;
  payment: Payment;
  onPaid: (r: { enrolled: number; courseCount: number; course: { slug: string; title: string } | null }) => void;
  onCancel: () => void;
}) {
  const [deadline] = useState(() => Date.now() + payment.expiresInSec * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((deadline - now) / 1000));
  const expired = left === 0;
  const meta = METHODS.find((m) => m.value === payment.method)!;

  const pay = async () => {
    setPaying(true);
    setErr(null);
    try {
      // mô phỏng thời gian cổng thanh toán xử lý
      await new Promise((r) => setTimeout(r, 900));
      const r = await api<{ enrolled: number; courseCount: number; course: { slug: string; title: string } | null }>(`/me/orders/${order.id}/pay`, { method: "POST" });
      onPaid(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  const cancel = async () => {
    try {
      await api(`/me/orders/${order.id}/cancel`, { method: "POST" });
    } catch {
      /* đơn có thể đã huỷ */
    }
    onCancel();
  };

  const copy = (k: string, v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 bg-ink px-5 py-3 text-white">
          <span className="flex items-center gap-2 text-sm font-bold">
            <span className={`grid size-8 place-items-center rounded-lg ${meta.tone}`}>{meta.icon}</span>
            Cổng thanh toán {payment.methodLabel}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Môi trường thử nghiệm</span>
        </div>
        <div className="p-6">
          {payment.method === "bank" && payment.bank ? (
            <div className="space-y-2.5 text-sm">
              <p className="text-muted">Chuyển khoản theo thông tin dưới đây. Đơn hàng sẽ được kích hoạt ngay khi nhận được tiền.</p>
              {[
                ["Ngân hàng", `${payment.bank.name} – ${payment.bank.branch}`],
                ["Số tài khoản", payment.bank.account],
                ["Chủ tài khoản", payment.bank.holder],
                ["Số tiền", vnd(payment.total)],
                ["Nội dung", payment.content],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-lg bg-ink/[.03] px-3 py-2.5">
                  <span className="text-muted">{k}</span>
                  <span className="flex items-center gap-2 text-right font-semibold">
                    {v}
                    {k !== "Ngân hàng" && (
                      <button onClick={() => copy(k, v)} aria-label={`Sao chép ${k}`} className="text-ink/40 hover:text-brand-500">
                        {copied === k ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : payment.method === "card" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">{payment.note}</p>
              <div className="relative aspect-[1.6] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-ink p-5 text-white shadow-xl">
                <div className="flex justify-between">
                  <span className="text-sm font-bold">Nihongo+ Pay</span>
                  <CreditCard className="size-6 opacity-80" />
                </div>
                <p className="mt-8 font-mono text-lg tracking-[.2em]">•••• •••• •••• ••••</p>
                <div className="mt-4 flex justify-between text-[11px] opacity-80">
                  <span>{order.code}</span>
                  <span>{vnd(payment.total)}</span>
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <Smartphone className="size-3.5" /> Xác thực 3-D Secure qua OTP sẽ được gửi tới điện thoại của bạn.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="relative rounded-2xl border-4 border-brand-100 bg-white p-3">
                <FakeQr value={payment.qr ?? payment.content} />
                {expired && <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/90 text-sm font-semibold text-red-500">Mã đã hết hạn</div>}
              </div>
              <div className="text-sm">
                <p className="font-semibold">{payment.note}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
                  <li>Mở ứng dụng {payment.methodLabel} hoặc ngân hàng</li>
                  <li>Chọn “Quét mã QR” và quét mã bên cạnh</li>
                  <li>Kiểm tra số tiền và xác nhận thanh toán</li>
                </ol>
                <p className="mt-3 text-xs text-muted">
                  Nội dung: <b className="text-ink">{payment.content}</b>
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-amber-700">
              <Clock className="size-4" /> {expired ? "Đơn thanh toán đã hết hạn" : "Mã thanh toán hết hạn sau"}
            </span>
            <span className="font-mono text-lg font-bold text-amber-700">
              {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
            </span>
          </div>
          {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={pay}
              disabled={paying || expired}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 disabled:opacity-60"
            >
              {paying ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {paying ? "Đang xác nhận giao dịch…" : "Xác nhận đã thanh toán"}
            </motion.button>
            <button onClick={cancel} className="flex items-center justify-center gap-1.5 rounded-xl border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/70 hover:bg-ink/5">
              <ArrowLeft className="size-4" /> Đổi phương thức
            </button>
          </div>
        </div>
      </Card>

      <Card className="h-fit p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Đơn hàng</p>
        <p className="mt-1 font-mono text-lg font-bold">{order.code}</p>
        <div className="mt-3 space-y-1 border-t border-dashed border-ink/10 pt-3 text-sm">
          <Row label="Sản phẩm" value={order.itemName} />
          <Row label="Giá" value={vnd(order.amount)} />
          {order.discount > 0 && <Row label={`Mã ${order.couponCode}`} value={<span className="text-emerald-600">−{vnd(order.discount)}</span>} />}
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-ink/5 pt-3">
          <span className="font-bold">Cần thanh toán</span>
          <span className="text-xl font-extrabold text-brand-500">{vnd(payment.total)}</span>
        </div>
        <p className="mt-4 flex gap-2 rounded-lg bg-sky-50 p-3 text-[11px] text-sky-700">
          <ShieldCheck className="size-4 shrink-0" /> Đây là cổng thanh toán mô phỏng. Bấm “Xác nhận đã thanh toán” để giả lập giao dịch thành công.
        </p>
      </Card>
    </motion.div>
  );
}

/** Mã QR minh hoạ (sinh tất định từ chuỗi — không phải QR thật). */
function FakeQr({ value, size = 168 }: { value: string; size?: number }) {
  const cells = useMemo(() => {
    const n = 25;
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    const out: boolean[] = [];
    for (let i = 0; i < n * n; i++) {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      out.push((h >>> 0) % 100 < 48);
    }
    return { n, out };
  }, [value]);
  const { n, out } = cells;
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" aria-label="Mã QR thanh toán">
      {out.map((on, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        return on && !finder(x, y) ? <rect key={i} x={x} y={y} width={1} height={1} fill="#1d1d2b" /> : null;
      })}
      {[
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={7} height={7} fill="#1d1d2b" />
          <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill="#e5383b" />
        </g>
      ))}
    </svg>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <motion.span
          key={i}
          className="absolute top-0 block size-2 rounded-sm"
          style={{ left: `${(i * 53) % 100}%`, background: ["#e5383b", "#f891a0", "#f59e0b", "#10b981", "#8b5cf6"][i % 5] }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 160, opacity: 0, rotate: 360 }}
          transition={{ duration: 1.6 + (i % 5) * 0.2, delay: (i % 6) * 0.1, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
