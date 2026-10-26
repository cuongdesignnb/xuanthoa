"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  NotebookPen,
  PlayCircle,
  Target,
  Award,
} from "lucide-react";
import { avatar } from "../ui";
import { JpText, callName, lessonLabel, type DashboardData } from "./types";

const card =
  "group relative min-w-0 rounded-2xl border border-ink/5 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg hover:shadow-brand-500/5";

function Ring({ value }: { value: number }) {
  const r = 30;
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="size-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#e8f6ee" strokeWidth="7" />
        <motion.circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="#22b46b"
          strokeWidth="7"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-base font-extrabold">{value}%</span>
    </div>
  );
}

function IconTile({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>{children}</span>;
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export function StatCards({ data }: { data: DashboardData }) {
  const { progress, streak, nextLesson, goal, badges, currentCourse } = data;
  const progressHref = currentCourse ? `/hoc/${currentCourse.lesson.slug}` : "/khoa-hoc";
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 xl:grid-cols-[1.25fr_1fr_1.1fr_1fr_1fr]"
    >
      {/* Tiến độ tổng thể */}
      <motion.div variants={item} className={`${card} w-[78%] shrink-0 snap-start sm:w-auto`}>
        <Link href={progressHref} className="absolute inset-0 z-10 rounded-2xl" aria-label="Xem tiến độ" />
        <div className="flex items-center gap-3">
          <Ring value={progress.percent} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Tiến độ tổng thể</p>
              <ArrowRight className="size-3.5 text-sky-500" />
            </div>
            <p className="mt-1 text-2xl font-extrabold">{progress.percent}%</p>
            <p className="text-[11px] text-muted">
              Đã hoàn thành <b className="text-ink">{progress.completed}/{progress.total}</b> bài học
            </p>
          </div>
        </div>
        <ChevronRight className="absolute bottom-3 right-3 size-5 rounded-full bg-brand-50 p-0.5 text-brand-500 transition group-hover:translate-x-0.5" />
      </motion.div>

      {/* Chuỗi ngày học */}
      <motion.div variants={item} className={`${card} w-[78%] shrink-0 snap-start sm:w-auto`}>
        <div className="flex gap-3">
          <IconTile tone="bg-orange-50">
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <Flame className="size-6 fill-orange-400 text-orange-500" />
            </motion.span>
          </IconTile>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Chuỗi ngày học</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-500">{streak} ngày</p>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              {streak > 0 ? "Hôm nay cũng tuyệt vời!" : "Học 1 bài hôm nay"}
              <br />
              {streak > 0 ? "Giữ vững phong độ nhé!" : "để bắt đầu chuỗi mới nhé!"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bài học sắp tới */}
      <motion.div variants={item} className={`${card} w-[78%] shrink-0 snap-start sm:w-auto`}>
        {nextLesson && <Link href={`/hoc/${nextLesson.slug}`} className="absolute inset-0 z-10 rounded-2xl" aria-label="Mở bài học sắp tới" />}
        <div className="flex gap-3">
          <IconTile tone="bg-brand-50 text-brand-500">
            <CalendarDays className="size-6" />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Bài học sắp tới</p>
            {nextLesson ? (
              <>
                <p className="mt-2 line-clamp-2 text-sm font-semibold">
                  <JpText text={lessonLabel(nextLesson.title, nextLesson.position)} />
                </p>
                <p className="text-[11px] text-muted">{nextLesson.tag}</p>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
                  <Clock className="size-3" /> {nextLesson.when} · {nextLesson.minutes} phút
                </p>
              </>
            ) : (
              <p className="mt-2 text-[12px] leading-snug text-muted">
                {currentCourse ? "Bạn đã hoàn thành tất cả bài học. Tuyệt vời!" : "Đăng ký một khóa học để bắt đầu nhé!"}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="absolute bottom-3 right-3 size-5 rounded-full bg-brand-50 p-0.5 text-brand-500 transition group-hover:translate-x-0.5" />
      </motion.div>

      {/* Mục tiêu JLPT */}
      <motion.div variants={item} className={`${card} w-[78%] shrink-0 snap-start sm:w-auto`}>
        <div className="flex gap-3">
          <IconTile tone="bg-brand-50 text-brand-500">
            <Target className="size-6" />
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Mục tiêu JLPT</p>
              <ChevronRight className="size-4 text-sky-500" />
            </div>
            <p className="mt-1 text-2xl font-extrabold">{goal.level ?? "—"}</p>
            <p className="text-[11px] text-muted">{goal.date ? `Dự kiến: ${goal.date}` : "Chưa đặt thời hạn"}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goal.percent}%` }}
              transition={{ duration: 1.2, delay: 0.4 }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
          <span className="text-[11px] font-bold text-emerald-600">{goal.percent}%</span>
        </div>
      </motion.div>

      {/* Huy hiệu */}
      <motion.div variants={item} className={`${card} w-[78%] shrink-0 snap-start sm:w-auto`}>
        <div className="flex gap-3">
          <IconTile tone="bg-amber-50 text-amber-500">
            <Award className="size-6 fill-amber-200" />
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Huy hiệu đã đạt</p>
              <ChevronRight className="size-4 text-sky-500" />
            </div>
            <p className="mt-1 text-2xl font-extrabold">{badges.earned} huy hiệu</p>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              {badges.earned < badges.total ? "Tiếp tục cố gắng" : "Bạn đã mở khóa"}
              <br />
              {badges.earned < badges.total ? `để mở khóa thêm ${badges.total - badges.earned} huy hiệu!` : "tất cả huy hiệu!"}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

export function CurrentCourse({ data }: { data: DashboardData }) {
  const c = data.currentCourse;
  if (!c)
    return (
      <section className="relative grid min-h-[240px] min-w-0 place-items-center overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-[#fff3f2] via-[#ffe9ea] to-[#ffd9dd] p-6 text-center shadow-sm">
        <div>
          <p className="font-jp text-sm text-brand-500">はじめましょう！</p>
          <h2 className="mt-1 text-xl font-extrabold">Bạn chưa có khóa học nào</h2>
          <p className="mt-1 text-sm text-muted">Chọn một khóa học phù hợp để bắt đầu lộ trình của bạn.</p>
          <Link href="/khoa-hoc" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30">
            Khám phá khóa học <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    );
  const META = [
    { icon: PlayCircle, t: "Video bài giảng", d: `${c.counts.videoMin} phút` },
    { icon: NotebookPen, t: "Bài tập thực hành", d: `${c.counts.exercises} câu` },
    { icon: FileText, t: "Từ vựng liên quan", d: `${c.counts.vocab} từ` },
  ];
  const label = lessonLabel(c.lesson.title, c.lesson.position);
  const short = label.match(/^bài\s*\d+/i)?.[0] ?? `bài ${c.lesson.position}`;
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25 }}
      className="relative min-w-0 overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-[#fff3f2] via-[#ffe9ea] to-[#ffd9dd] p-5 shadow-sm sm:p-6"
    >
      {/* họa tiết cánh hoa */}
      <svg className="pointer-events-none absolute inset-0 size-full opacity-60" aria-hidden>
        {[
          [62, 18],
          [70, 70],
          [88, 30],
          [52, 85],
          [95, 80],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={`${x}%`} cy={`${y}%`} rx="7" ry="4" fill="#ffb3bd" transform={`rotate(${i * 40})`} style={{ transformOrigin: `${x}% ${y}%` }} />
        ))}
      </svg>

      <div className="relative grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-brand-500">
            <span className="font-jp">🎌</span> Khóa học hiện tại
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{c.title}</h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <span className="size-2 rounded-full bg-amber-500" /> {c.percent >= 100 ? "Hoàn thành" : "Đang học"}
            </span>
          </div>
          <p className="mt-2 text-base font-medium">
            <JpText text={label} />
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${c.percent}%` }}
                transition={{ duration: 1.3, delay: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
              />
            </div>
            <span className="text-sm font-bold text-emerald-600">{c.percent}%</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {META.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.t} className="flex min-w-0 items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-500 shadow-sm">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 text-[10px] leading-tight text-muted sm:text-[11px]">
                    {m.t}
                    <br />
                    {m.d}
                  </span>
                </div>
              );
            })}
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="mt-5 sm:max-w-[340px]">
            <Link
              href={`/hoc/${c.lesson.slug}`}
              className="group flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
            >
              Tiếp tục học {short.toLowerCase()}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* Nhân vật + chữ viết tay */}
        <div className="relative hidden min-h-[220px] sm:block">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="absolute -bottom-6 left-0 right-6 top-0"
          >
            <div className="absolute inset-x-4 bottom-0 top-6 rounded-t-[999px] bg-gradient-to-b from-white/70 to-white/10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar("Hana", "transparent")}
              alt="Học viên đang học"
              className="relative mx-auto h-full w-auto object-contain object-bottom drop-shadow-xl"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, rotate: -4 }}
            animate={{ opacity: 1, rotate: -8 }}
            transition={{ delay: 0.9 }}
            className="absolute -right-1 top-6 text-right font-script text-base leading-tight text-ink/80"
          >
            <span className="font-jp text-sm">がんばろう！</span>
            <br />
            Cố gắng lên
            <br />
            {callName(data.user.name)}!
          </motion.p>
        </div>
      </div>
    </motion.section>
  );
}
