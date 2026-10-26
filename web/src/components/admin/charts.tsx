"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { cx } from "./ui";

/* ------------------------------------------------------------------ */
/* Sparkline (đường xu hướng nhỏ trong StatCard)                       */
/* ------------------------------------------------------------------ */

export function Sparkline({ data, color = "#e5383b", className }: { data: number[]; color?: string; className?: string }) {
  const id = useId();
  if (data.length < 2) return <div className={className} />;
  const w = 120;
  const h = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 4 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cx("h-10 w-28", className)} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="3" fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Biểu đồ cột (+ đường tăng trưởng tuỳ chọn)                          */
/* ------------------------------------------------------------------ */

export type BarDatum = { label: string; value: number; line?: number };

/**
 * Biểu đồ cột gradient đỏ–hồng như ảnh tham chiếu. Hover hiện tooltip.
 * `line` (tuỳ chọn) vẽ đường tăng trưởng phía trên.
 */
export function BarChart({
  data,
  height = 200,
  format = (v) => v.toLocaleString("vi-VN"),
  tooltip,
  highlightLast = true,
  legend,
}: {
  data: BarDatum[];
  height?: number;
  format?: (v: number) => string;
  tooltip?: (d: BarDatum, i: number) => React.ReactNode;
  highlightLast?: boolean;
  legend?: { bar: string; line?: string };
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.line ?? 0))) * 1.12;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  const W = 100;
  const bw = W / data.length;
  const hasLine = data.some((d) => d.line !== undefined);
  const linePts = data.map((d, i) => [i * bw + bw / 2, 100 - ((d.line ?? 0) / max) * 100]);
  const active = hover ?? (highlightLast ? data.length - 1 : null);

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between pb-6 text-right text-[10px] text-muted" style={{ height }}>
          {[...ticks].reverse().map((t, i) => (
            <span key={i}>{format(t)}</span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height }}>
          <div className="absolute inset-x-0 top-0 bottom-6">
            {ticks.map((_, i) => (
              <div key={i} className="absolute inset-x-0 border-t border-dashed border-ink/[.07]" style={{ top: `${(i / 4) * 100}%` }} />
            ))}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <defs>
                <linearGradient id={`${id}b`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#f25c63" />
                  <stop offset="1" stopColor="#ffd0d3" />
                </linearGradient>
                <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#e5383b" />
                  <stop offset="1" stopColor="#f86b6e" />
                </linearGradient>
              </defs>
              {data.map((d, i) => {
                const h = (d.value / max) * 100;
                return (
                  <motion.rect
                    key={i}
                    x={i * bw + bw * 0.22}
                    width={bw * 0.56}
                    rx={0.8}
                    initial={{ y: 100, height: 0 }}
                    animate={{ y: 100 - h, height: h }}
                    transition={{ duration: 0.8, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    fill={`url(#${id}${i === active ? "a" : "b"})`}
                    opacity={hover !== null && hover !== i ? 0.55 : 1}
                  />
                );
              })}
              {hasLine && (
                <motion.polyline
                  points={linePts.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke="#e5383b"
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                  style={{ strokeWidth: 2 }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                />
              )}
            </svg>
            {hasLine &&
              linePts.map(([x, y], i) => (
                <span key={i} className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500 shadow" style={{ left: `${x}%`, top: `${y}%` }} />
              ))}
            <div className="absolute inset-0 flex">
              {data.map((_, i) => (
                <div key={i} className="h-full flex-1" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              ))}
            </div>
            {active !== null && data[active] && (
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-ink/5 bg-white px-2.5 py-1.5 text-center text-[11px] shadow-lg"
                style={{
                  left: `${Math.min(92, Math.max(8, (active + 0.5) * bw))}%`,
                  top: `${Math.max(0, 100 - (data[active].value / max) * 100 - 30)}%`,
                }}
              >
                {tooltip ? tooltip(data[active], active) : (
                  <>
                    <p className="text-muted">{data[active].label}</p>
                    <p className="font-bold text-brand-600">{format(data[active].value)}</p>
                  </>
                )}
              </motion.div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex">
            {data.map((d, i) => (
              <span key={i} className={cx("flex-1 truncate text-center text-[10px]", i === active ? "font-semibold text-brand-600" : "text-muted")}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      {legend && (
        <div className="mt-2 flex justify-center gap-5 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-brand-400" />
            {legend.bar}
          </span>
          {legend.line && (
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-brand-500" />
              {legend.line}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

export const DONUT_COLORS = ["#e5383b", "#f25c63", "#f891a0", "#ffc7cf", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b"];

export function Donut({
  data,
  center,
  size = 180,
  thickness = 30,
}: {
  data: { label: string; value: number; color?: string }[];
  center?: React.ReactNode;
  size?: number;
  thickness?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 50 - thickness / (size / 100) / 2;
  const c = 2 * Math.PI * r;
  const offsets = data.reduce<number[]>((o, d, i) => [...o, (o[i - 1] ?? 0) + (i ? data[i - 1].value / total : 0)], []);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#fdf0f1" strokeWidth={thickness / (size / 100)} />
        {data.map((d, i) => {
          const dash = (d.value / total) * c;
          const off = offsets[i] * c;
          return (
            <motion.circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={d.color ?? DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={(thickness / (size / 100)) * (hover === i ? 1.15 : 1)}
              strokeDasharray={`${dash} ${c - dash}`}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: -off }}
              transition={{ duration: 1, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        {hover !== null ? (
          <div>
            <p className="text-lg font-extrabold">{Math.round((data[hover].value / total) * 100)}%</p>
            <p className="text-[11px] text-muted">{data[hover].label}</p>
          </div>
        ) : (
          center
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thanh tiến độ & vòng tiến độ                                         */
/* ------------------------------------------------------------------ */

export function ProgressBar({ value, tone = "green", className }: { value: number; tone?: "green" | "amber" | "red" | "brand"; className?: string }) {
  const color = { green: "bg-emerald-500", amber: "bg-amber-400", red: "bg-red-500", brand: "bg-brand-500" }[tone];
  return (
    <div className={cx("h-1.5 overflow-hidden rounded-full bg-ink/[.06]", className)}>
      <motion.div className={cx("h-full rounded-full", color)} initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, value)}%` }} viewport={{ once: true }} transition={{ duration: 0.9 }} />
    </div>
  );
}

export function Ring({ value, size = 64, color = "#10b981", children }: { value: number; size?: number; color?: string; children?: React.ReactNode }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#eef0f3" strokeWidth="10" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: 1.2 }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold">{children ?? `${value}%`}</div>
    </div>
  );
}
