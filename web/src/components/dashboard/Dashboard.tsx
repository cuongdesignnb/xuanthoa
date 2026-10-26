"use client";

import { motion } from "motion/react";
import { PageBanner } from "../site";
import Sidebar from "./Sidebar";
import { CurrentCourse, StatCards } from "./Stats";
import WeeklyPlan from "./Plan";
import ProgressCharts from "./Charts";
import { Achievements, RecentLessons, SavedVocab, SuggestedExercises } from "./Lists";
import { useApi } from "@/lib/hooks";
import { callName, type DashboardData } from "./types";

function Greeting({ name }: { name?: string }) {
  return (
    <div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-jp text-sm text-ink/80">
        こんにちは！
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-extrabold tracking-tight sm:text-[2.4rem]"
      >
        Xin chào{name ? `, ${callName(name)}` : ""}!
        <motion.span
          animate={{ rotate: [0, 18, -8, 18, 0] }}
          transition={{ duration: 1.6, delay: 0.8, repeat: Infinity, repeatDelay: 3 }}
          className="inline-block origin-[70%_80%]"
          aria-hidden
        >
          👋
        </motion.span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-2 text-base text-ink/75 sm:text-lg"
      >
        Cùng nhau tiến bộ mỗi ngày, chinh phục tiếng Nhật nhé!
      </motion.p>
    </div>
  );
}

function Quote() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.35 }}
      className="max-w-sm rounded-2xl border border-white bg-white/80 px-5 py-4 shadow-lg shadow-brand-500/5 backdrop-blur"
    >
      <p className="font-jp text-sm">小さな一歩が、大きな未来をつくる。</p>
      <p className="mt-2 text-xs italic leading-relaxed text-muted">
        “Những bước nhỏ hôm nay
        <br />
        sẽ tạo nên một tương lai lớn.”
      </p>
    </motion.div>
  );
}

function Skel({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl border border-ink/5 bg-white/80 ${className}`} />;
}

export default function Dashboard() {
  const { data, error, reload } = useApi<DashboardData>("/me/dashboard", { dedupeMs: 5_000 });
  return (
    <>
      <PageBanner compact aside={<Quote />}>
        <Greeting name={data?.user.name} />
      </PageBanner>

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-6 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)]">
          <div className="min-w-0 lg:self-start lg:sticky lg:top-24">
            {data ? <Sidebar user={data.user} /> : <Skel className="h-72" />}
          </div>

          {error && !data ? (
            <div className="grid min-h-[320px] place-items-center rounded-2xl border border-ink/5 bg-white p-6 text-center">
              <div>
                <p className="font-semibold">Không tải được dữ liệu học tập</p>
                <p className="mt-1 text-sm text-muted">{error.message}</p>
                <button onClick={() => reload()} className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                  Thử lại
                </button>
              </div>
            </div>
          ) : !data ? (
            <div className="min-w-0 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skel key={i} className="h-28" />
                ))}
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
                <Skel className="h-72" />
                <Skel className="h-72" />
                <Skel className="h-64" />
                <Skel className="h-64" />
              </div>
            </div>
          ) : (
            <div className="min-w-0 space-y-5">
              <StatCards data={data} />
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)] [&>*]:min-w-0">
                <CurrentCourse data={data} />
                <WeeklyPlan initial={data.plan} />
                <ProgressCharts chart={data.chart} skills={data.skills} />
                <RecentLessons items={data.recentLessons} />
                <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
                  <SavedVocab items={data.savedVocab.items} />
                  <SuggestedExercises items={data.suggested} level={data.user.level} />
                </div>
                <Achievements items={data.achievements} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
