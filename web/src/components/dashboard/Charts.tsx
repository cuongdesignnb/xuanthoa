"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import type { ChartBar, DashboardData } from "./types";

type Bar = { l: string; s: string; v: number; n: number };
type Series = { unit: string; max: number; bars: Bar[]; hi: number };

/** Làm tròn trục Y lên số "đẹp" chia hết cho 4 vạch. */
function niceMax(v: number) {
  if (v <= 0) return 4;
  const step = [1, 2, 2.5, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 500].find((x) => x * 4 >= v) ?? Math.ceil(v / 400) * 100;
  return step * 4;
}

function toSeries(bars: ChartBar[], unit: "phút" | "giờ", hi: number): Series {
  const conv = (m: number) => (unit === "giờ" ? Math.round((m / 60) * 10) / 10 : m);
  const mapped = bars.map((b) => ({ l: b.label, s: b.sub, v: conv(b.minutes), n: b.lessons }));
  return { unit, max: niceMax(Math.max(...mapped.map((x) => x.v), 0)), bars: mapped, hi };
}

const TABS = ["Theo tuần", "Theo tháng", "Theo kỹ năng"];

function BarChart({ chart }: { chart: DashboardData["chart"] }) {
  const [tab, setTab] = useState(TABS[0]);
  const [hover, setHover] = useState<number | null>(null);
  const skillHi = chart.skill.reduce((m, b, i, arr) => (b.minutes > arr[m].minutes ? i : m), 0);
  const DATA: Record<string, Series> = {
    "Theo tuần": toSeries(chart.week, "phút", chart.week.length - 1),
    "Theo tháng": toSeries(chart.month, "giờ", chart.month.length - 1),
    "Theo kỹ năng": toSeries(chart.skill, "phút", skillHi),
  };
  const d = DATA[tab];
  const shown = hover ?? d.hi;
  const ticks = [4, 3, 2, 1, 0].map((i) => (d.max / 4) * i);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="text-base font-bold">Tiến độ học tập</h3>
        <div className="flex rounded-lg bg-ink/[.04] p-0.5 text-[11px]">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setHover(null);
              }}
              className={`relative rounded-md px-3 py-1 transition sm:px-4 ${tab === t ? "font-semibold text-brand-500" : "text-muted hover:text-ink"}`}
            >
              {tab === t && (
                <motion.span layoutId="chart-tab" className="absolute inset-0 rounded-md bg-brand-100/80" />
              )}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex h-[170px] gap-2">
        {/* trục Y */}
        <div className="flex flex-col justify-between pb-8 text-right text-[10px] text-muted">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 whitespace-nowrap leading-none">
              {t} {d.unit}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between">
            {ticks.map((t) => (
              <span key={t} className="border-t border-dashed border-ink/[.07]" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-0 flex items-stretch justify-around">
            {d.bars.map((b, i) => {
              const on = shown === i;
              return (
                <div
                  key={tab + b.l}
                  className="relative flex w-full max-w-12 flex-col items-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setHover(i)}
                >
                  <div className="relative flex w-full flex-1 items-end justify-center pb-0">
                    <AnimatePresence>
                      {on && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.9 }}
                          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-center shadow-lg ring-1 ring-ink/5"
                          style={{ bottom: `calc(${(b.v / d.max) * 100}% + 8px)` }}
                        >
                          <p className="text-[9px] text-muted">
                            {b.l}
                            {b.s && `, ${b.s}`}
                          </p>
                          <p className="text-xs font-bold">
                            {b.v} {d.unit}
                          </p>
                          <p className="text-[9px] text-muted">{b.n} bài học</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(b.v / d.max) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-[58%] max-w-7 cursor-pointer rounded-t-md transition-colors ${
                        on
                          ? "bg-gradient-to-b from-brand-400 to-brand-200"
                          : "bg-gradient-to-b from-brand-300/80 to-brand-100/70 hover:from-brand-400/80"
                      }`}
                    />
                  </div>
                  <div className={`h-8 pt-1.5 text-center text-[10px] leading-tight ${on ? "font-semibold text-brand-500" : "text-muted"}`}>
                    <p className="whitespace-nowrap">{b.l}</p>
                    {b.s && <p>{b.s}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const SKILL_COLOR: Record<string, string> = { grammar: "#f0606a", vocab: "#5b9cf5", listening: "#a275f0", reading: "#3fc380", speaking: "#f5a524" };

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} giờ${min % 60 ? ` ${min % 60} phút` : ""}` : `${min} phút`);

function Donut({ skills }: { skills: DashboardData["skills"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const SKILLS = skills.items.map((s) => ({ l: s.label, v: s.percent, c: SKILL_COLOR[s.skill] ?? "#ccc" }));
  const r = 40;
  const C = 2 * Math.PI * r;
  const gap = 1.2;
  const offsets = SKILLS.map((_, i) => SKILLS.slice(0, i).reduce((a, s) => a + (s.v / 100) * C, 0));
  const center = hover === null ? null : SKILLS[hover];

  return (
    <div className="min-w-0">
      <h3 className="text-base font-bold">Thời gian học theo kỹ năng</h3>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative size-[130px] shrink-0 sm:size-[140px]">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            {SKILLS.map((s, i) => {
              const len = (s.v / 100) * C;
              const off = offsets[i];
              return (
                <motion.circle
                  key={s.l}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={s.c}
                  strokeWidth={hover === i ? 15 : 12}
                  strokeDasharray={`${Math.max(len - gap, 0)} ${C}`}
                  initial={{ strokeDashoffset: -off + len, opacity: 0 }}
                  animate={{ strokeDashoffset: -off, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.15 * i, ease: "easeOut" }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className="cursor-pointer transition-[stroke-width]"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <AnimatePresence mode="wait">
              <motion.div key={center?.l ?? "all"} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <p className="text-[10px] text-muted">{center ? center.l : "Tổng"}</p>
                <p className="text-[13px] font-bold leading-tight">{center ? `${center.v}%` : hm(skills.totalMinutes)}</p>
                <p className="text-[9px] text-muted">7 ngày qua</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2.5">
          {SKILLS.map((s, i) => (
            <li
              key={s.l}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center gap-2 text-[11px] transition ${hover === null || hover === i ? "" : "opacity-40"}`}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.c }} />
              <span className="flex-1 truncate text-ink/75">{s.l}</span>
              <span className="font-semibold">{s.v}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ProgressCharts({ chart, skills }: { chart: DashboardData["chart"]; skills: DashboardData["skills"] }) {
  return (
    <section className="grid min-w-0 gap-6 rounded-2xl border border-ink/5 bg-white p-4 shadow-sm sm:p-5 md:grid-cols-[1.45fr_1fr] md:gap-0 [&>*]:min-w-0">
      <div className="md:border-r md:border-ink/5 md:pr-5">
        <BarChart chart={chart} />
      </div>
      <div className="md:pl-5">
        <Donut skills={skills} />
      </div>
    </section>
  );
}
