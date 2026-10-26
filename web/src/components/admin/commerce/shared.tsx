"use client";

import { Building2, CreditCard, QrCode, Wallet } from "lucide-react";
import { Input, Tabs, cx, type Tone } from "@/components/admin/ui";
import { qs } from "@/lib/api";

export const METHOD: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  vnpay: { label: "VNPAY", icon: <QrCode className="size-3.5" />, cls: "bg-sky-50 text-sky-600" },
  momo: { label: "MoMo", icon: <Wallet className="size-3.5" />, cls: "bg-pink-50 text-pink-600" },
  bank: { label: "Chuyển khoản", icon: <Building2 className="size-3.5" />, cls: "bg-emerald-50 text-emerald-600" },
  card: { label: "Thẻ", icon: <CreditCard className="size-3.5" />, cls: "bg-violet-50 text-violet-600" },
};

export const METHOD_OPTIONS = Object.entries(METHOD).map(([value, m]) => ({ value, label: m.label }));

export const TYPE_TONE: Record<string, Tone> = { "Khóa học": "pink", Subscription: "violet", Workshop: "blue", "Tài liệu": "amber" };
export const TYPE_OPTIONS = ["Khóa học", "Subscription", "Workshop", "Tài liệu"].map((v) => ({ value: v, label: v }));

export function MethodChip({ method }: { method: string }) {
  const m = METHOD[method] ?? { label: method, icon: null, cls: "bg-ink/5 text-ink/60" };
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold", m.cls)}>
      {m.icon}
      {m.label}
    </span>
  );
}

/** Tải tệp CSV từ API (cookie đi kèm vì cùng origin). */
export function downloadCsv(path: string, query?: Record<string, string | number | undefined | null>) {
  const a = document.createElement("a");
  a.href = `/api${path}${qs(query)}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export type RangeValue = { range: string; from?: string; to?: string };

export const RANGES = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
  { value: "12m", label: "12 tháng" },
  { value: "ytd", label: "Từ đầu năm" },
  { value: "custom", label: "Tuỳ chọn" },
];

/** Chọn khoảng thời gian: tab nhanh + 2 ô ngày khi "Tuỳ chọn". */
export function RangePicker({ value, onChange, ranges = RANGES }: { value: RangeValue; onChange: (v: RangeValue) => void; ranges?: typeof RANGES }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs size="sm" tabs={ranges} value={value.range} onChange={(range) => onChange(range === "custom" ? { ...value, range } : { range })} />
      {value.range === "custom" && (
        <div className="flex items-center gap-1.5">
          <Input type="date" className="h-8 w-[140px] text-xs" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label="Từ ngày" />
          <span className="text-xs text-muted">–</span>
          <Input type="date" className="h-8 w-[140px] text-xs" value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label="Đến ngày" />
        </div>
      )}
    </div>
  );
}

export const rangeQuery = (v: RangeValue) => (v.range === "custom" ? { range: "custom", from: v.from, to: v.to } : { range: v.range });

export const pctFmt = (n: number) => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
