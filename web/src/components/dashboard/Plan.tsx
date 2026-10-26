"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Clock, FileCheck2, Headphones, PlayCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { WeekPlan } from "./types";

const KIND: Record<string, { icon: typeof BookOpen; tone: string }> = {
  review: { icon: BookOpen, tone: "bg-brand-50 text-brand-500" },
  lesson: { icon: PlayCircle, tone: "bg-brand-50 text-brand-500" },
  listening: { icon: Headphones, tone: "bg-violet-50 text-violet-500" },
  exercise: { icon: FileCheck2, tone: "bg-emerald-50 text-emerald-600" },
  reading: { icon: BookOpen, tone: "bg-sky-50 text-sky-500" },
};

const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/");

export default function WeeklyPlan({ initial }: { initial: WeekPlan }) {
  const [week, setWeek] = useState(0);
  const remote = useApi<WeekPlan>(week === 0 ? null : `/me/plan?week=${week}`);
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<Record<number, number>>({});
  const plan = week === 0 ? initial : remote.data;

  const todayIdx = plan ? plan.days.findIndex((d) => d.date === plan.today) : -1;
  const day = picked[week] ?? (todayIdx >= 0 ? todayIdx : 0);
  const key = `${week}:${day}`;
  const date = plan?.days[day]?.date;
  const tasks = (plan?.items ?? []).filter((t) => t.day === date).map((t) => ({ ...t, done: local[t.id] ?? t.done }));

  const toggle = async (id: string, done: boolean) => {
    setLocal((s) => ({ ...s, [id]: done }));
    try {
      await api(`/me/plan-items/${id}`, { method: "PATCH", body: { done } });
    } catch {
      setLocal((s) => ({ ...s, [id]: !done }));
    }
  };

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <section className="min-w-0 rounded-2xl border border-ink/5 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{week === 0 ? "Kế hoạch học tập tuần này" : week < 0 ? "Kế hoạch tuần trước" : "Kế hoạch tuần sau"}</h3>
          <p className="text-xs text-muted">{plan ? `${plan.days[0].short} - ${ddmmyyyy(plan.end)}` : "…"}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setWeek(0);
              setPicked((p) => {
                const n = { ...p };
                delete n[0];
                return n;
              });
            }}
            className="mr-2 rounded-lg border border-brand-100 px-3 py-1.5 text-[11px] font-semibold text-brand-500 transition hover:bg-brand-50"
          >
            Hôm nay
          </button>
          <button aria-label="Tuần trước" onClick={() => setWeek((w) => w - 1)} className="grid size-7 place-items-center rounded-full transition hover:bg-brand-50">
            <ChevronLeft className="size-4" />
          </button>
          <button aria-label="Tuần sau" onClick={() => setWeek((w) => w + 1)} className="grid size-7 place-items-center rounded-full transition hover:bg-brand-50">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {(plan?.days ?? Array.from({ length: 7 }, (_, i) => ({ date: String(i), label: "", short: "", status: "todo" as const }))).map((d, i) => {
          const status = d.status;
          const sel = day === i;
          return (
            <motion.button
              key={d.date}
              whileTap={{ scale: 0.92 }}
              onClick={() => setPicked((p) => ({ ...p, [week]: i }))}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-center transition ${
                sel ? "text-brand-500" : "text-ink hover:bg-brand-50/50"
              }`}
            >
              {sel && <motion.span layoutId="plan-day" className="absolute inset-0 rounded-xl bg-brand-50 ring-1 ring-brand-100" />}
              <span className="relative text-xs font-bold">{d.label || "·"}</span>
              <span className="relative text-[10px] text-muted">{d.short}</span>
              <span className="relative mt-1.5 grid size-5 place-items-center">
                {status === "done" ? (
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                ) : status === "today" ? (
                  <span className="relative grid size-5 place-items-center">
                    <span className="absolute size-4 animate-ping rounded-full bg-brand-400/40" />
                    <span className="size-2 rounded-full bg-brand-500" />
                  </span>
                ) : (
                  <span className="size-[18px] rounded-full border-[1.5px] border-ink/25" />
                )}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.ul
          key={key + (plan ? "" : "-loading")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-3 divide-y divide-ink/5"
        >
          {!plan ? (
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="py-2.5">
                <div className="h-7 animate-pulse rounded-lg bg-ink/[.05]" />
              </li>
            ))
          ) : tasks.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-muted">Chưa có nhiệm vụ cho ngày này.</li>
          ) : (
            tasks.map((t) => {
              const k = KIND[t.kind] ?? KIND.lesson;
              const Icon = k.icon;
              return (
                <li key={t.id}>
                  <button onClick={() => toggle(t.id, !t.done)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${k.tone}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-[13px] transition ${t.done ? "text-muted line-through decoration-ink/30" : ""}`}>{t.title}</span>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                      <Clock className="size-3.5" /> {t.minutes} phút
                    </span>
                    <span
                      className={`ml-2 grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] transition ${
                        t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-ink/25"
                      }`}
                    >
                      <AnimatePresence>
                        {t.done && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Check className="size-3.5" strokeWidth={3.5} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </motion.ul>
      </AnimatePresence>
      <p className="mt-1 text-right text-[11px] text-muted">
        Đã xong <b className="text-emerald-600">{doneCount}</b>/{tasks.length} nhiệm vụ
      </p>
    </section>
  );
}
