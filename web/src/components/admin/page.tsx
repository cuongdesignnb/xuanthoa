"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { Card, cx } from "./ui";
import { Sparkline } from "./charts";
import { ApiError } from "@/lib/api";
import { Petals } from "@/components/Hero";
import { Pagoda, SakuraBranch } from "@/components/site";

/* ------------------------------------------------------------------ */
/* Tiêu đề trang                                                       */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
  crumbs,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && (
          <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" />}
                {c.href ? (
                  <Link href={c.href} className="hover:text-brand-500">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-brand-500">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thẻ số liệu                                                         */
/* ------------------------------------------------------------------ */

const ICON_TONE = {
  red: "bg-brand-50 text-brand-500",
  green: "bg-emerald-50 text-emerald-500",
  violet: "bg-violet-50 text-violet-500",
  amber: "bg-amber-50 text-amber-500",
  blue: "bg-sky-50 text-sky-500",
  pink: "bg-pink-50 text-pink-500",
} as const;

export function StatCard({
  icon,
  label,
  value,
  delta,
  sub,
  spark,
  tone = "red",
  href,
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** % so với kỳ trước (âm = giảm). */
  delta?: number;
  sub?: React.ReactNode;
  spark?: number[];
  tone?: keyof typeof ICON_TONE;
  href?: string;
  index?: number;
}) {
  const body = (
    <Card className="group h-full p-4 transition-shadow hover:shadow-lg hover:shadow-brand-500/5">
      <div className="flex gap-3">
        <span className={cx("grid size-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105", ICON_TONE[tone])}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">{label}</p>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight">{value}</p>
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        {delta !== undefined && (
          <span className={cx("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold", delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
            {delta >= 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {spark && <Sparkline data={spark} className="ml-auto" />}
      </div>
      {sub && <p className="mt-1 truncate text-[11px] text-muted">{sub}</p>}
    </Card>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="min-w-0">
      {href ? <Link href={href}>{body}</Link> : body}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Banner đầu trang (Phú Sĩ + chùa + hoa anh đào)                      */
/* ------------------------------------------------------------------ */

export function AdminHero({ children, script }: { children: React.ReactNode; script?: React.ReactNode }) {
  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#fff5f5] via-[#fff0f0] to-[#ffe6e8]">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] md:block">
        <Image
          src="https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=80"
          alt=""
          fill
          sizes="58vw"
          className="object-cover object-[50%_88%] opacity-80 saturate-[.85] hue-rotate-[-10deg] [mask-image:linear-gradient(to_right,transparent,black_35%)]"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-brand-100/40 to-transparent mix-blend-multiply" />
        <Pagoda className="absolute bottom-0 right-[8%] h-[85%] max-h-48 drop-shadow-lg" />
      </div>
      <SakuraBranch className="pointer-events-none absolute -left-6 -top-4 w-40 opacity-80" />
      <Petals count={10} />
      {script && (
        <p className="absolute right-6 top-4 z-10 hidden rotate-[-8deg] text-right font-script text-xl leading-snug text-ink/80 xl:block">{script}</p>
      )}
      <div className="relative z-10 max-w-2xl p-6 sm:p-8">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* useForm: giữ state form + lỗi theo trường từ API                    */
/* ------------------------------------------------------------------ */

/**
 * const f = useForm({ title: "", price: 0 });
 * <Input value={f.values.title} onChange={f.input("title")} />  <Field error={f.errors.title}>
 * await f.submit(async (v) => api("/admin/x", { body: v }))
 */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = useCallback(<K extends keyof T>(k: K, v: T[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: "" } : e));
    setDirty(true);
  }, []);

  const input =
    (k: keyof T) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const t = e.target as HTMLInputElement;
      set(k, (t.type === "number" ? (t.value === "" ? null : Number(t.value)) : t.value) as T[keyof T]);
    };

  const submit = async <R,>(fn: (v: T) => Promise<R>): Promise<R | undefined> => {
    setSubmitting(true);
    setErrors({});
    try {
      const r = await fn(values);
      setDirty(false);
      return r;
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  return { values, setValues, set, input, errors, setErrors, submitting, submit, dirty, reset: (v?: T) => (setValues(v ?? initial), setDirty(false)) };
}
