"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { Reveal, SectionHeading } from "./ui";
import { useApi } from "@/lib/hooks";
import { vnd } from "@/lib/api";

export type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  /** Giá mỗi tháng khi trả theo năm. */
  priceYearly: number;
  features: string[];
  levels: string[];
  highlighted: boolean;
  order: number;
};

/** Bảng giá gói học (trang chủ) — dữ liệu từ /api/public/plans. */
export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const { data, loading, error } = useApi<{ items: Plan[] }>("/public/plans");
  const plans = data?.items ?? [];
  const maxSave = plans.reduce((m, p) => Math.max(m, p.priceMonthly ? Math.round((1 - p.priceYearly / p.priceMonthly) * 100) : 0), 0);

  return (
    <div id="bang-gia" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeading
          title="Gói học linh hoạt, phù hợp với mọi nhu cầu"
          subtitle="Lựa chọn gói học phù hợp để bắt đầu hành trình chinh phục tiếng Nhật."
        />
        <div className="relative mb-5 flex rounded-full border border-ink/10 bg-white p-1 text-xs font-semibold">
          {["Học theo tháng", "Học theo năm"].map((l, i) => (
            <button
              key={l}
              onClick={() => setYearly(i === 1)}
              className={`relative z-10 rounded-full px-3 py-1.5 transition-colors ${yearly === (i === 1) ? "text-white" : "text-muted"}`}
            >
              {yearly === (i === 1) && (
                <motion.span
                  layoutId="billing-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-brand-500"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {l}
            </button>
          ))}
          {maxSave > 0 && (
            <span className="absolute -right-2 -top-3 rounded-full bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold text-brand-600">
              Tiết kiệm {maxSave}%
            </span>
          )}
        </div>
      </div>

      {error && !plans.length ? (
        <p className="rounded-2xl border border-ink/10 bg-white p-6 text-center text-sm text-muted">Không tải được bảng giá. Vui lòng thử lại sau.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-3">
          {loading && !plans.length
            ? [0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl border border-ink/5 bg-white" />)
            : plans.map((p, i) => {
                const price = yearly ? p.priceYearly : p.priceMonthly;
                return (
                  <Reveal key={p.id} delay={i * 0.1}>
                    <motion.div
                      whileHover={{ y: -6 }}
                      className={`relative flex h-full flex-col rounded-2xl bg-white p-4 ${
                        p.highlighted ? "border-2 border-brand-500 shadow-xl shadow-brand-500/15 sm:-my-2 sm:py-6" : "border border-ink/10 shadow-sm"
                      }`}
                    >
                      {p.highlighted && (
                        <span className="absolute -top-3 right-4 rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                          Phổ biến nhất
                        </span>
                      )}
                      <h3 className="font-bold">{p.name}</h3>
                      <p className="text-[11px] text-muted">{p.description}</p>
                      <p className="mt-3 flex items-baseline gap-1">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={price}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="text-2xl font-extrabold"
                          >
                            {vnd(price)}
                          </motion.span>
                        </AnimatePresence>
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
                      <motion.div whileTap={{ scale: 0.96 }} className="mt-5">
                        <Link
                          href={`/thanh-toan?plan=${p.code}&billing=${yearly ? "year" : "month"}`}
                          className={`block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                            p.highlighted
                              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600"
                              : "border-2 border-brand-300 text-brand-500 hover:bg-brand-50"
                          }`}
                        >
                          Bắt đầu ngay
                        </Link>
                      </motion.div>
                    </motion.div>
                  </Reveal>
                );
              })}
        </div>
      )}
    </div>
  );
}
