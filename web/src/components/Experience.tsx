"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Flame,
  Headphones,
  Heart,
  Home,
  Layers,
  LineChart,
  ListChecks,
  MousePointerClick,
  Type,
  ArrowRight,
} from "lucide-react";
import { Reveal, SectionHeading, avatar } from "./ui";
import { useApi } from "@/lib/hooks";
import { useHomeData } from "./home-data";
import { teacherAvatar } from "./teachers/types";

const FEATURES = [
  { t: "Theo dõi tiến độ", d: "Lộ trình cá nhân hóa, hiển thị tiến độ học tập rõ ràng.", icon: BarChart3 },
  { t: "Bài tập tương tác", d: "Đa dạng dạng bài: trắc nghiệm, điền từ, nghe – nói.", icon: MousePointerClick },
  { t: "Flashcard thông minh", d: "Ghi nhớ từ vựng hiệu quả với phương pháp Spaced Repetition.", icon: Layers },
  { t: "Luyện nghe – nói", d: "Video, audio chất lượng cao, nhận diện giọng nói.", icon: Headphones },
  { t: "Chuỗi ngày học tập", d: "Duy trì động lực với hệ thống streak.", icon: CalendarCheck },
];

/** Câu hỏi mẫu trên điện thoại (lấy từ bài "Từ vựng: Động vật" trong DB). */
type HomeSample = { sample: { quizSlug: string; prompt: string; scene: string | null; options: { key: string; text: string }[]; answer: string; total: number } | null };

export default function Experience() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const { data: home } = useHomeData();

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), 3200);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section className="relative bg-gradient-to-b from-white via-brand-50/60 to-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 [&>*]:min-w-0 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
        <div>
          <SectionHeading
            title="Trải nghiệm học tập hiệu quả và thú vị"
            subtitle="Hệ thống bài học tương tác giúp bạn học sâu, nhớ lâu và ứng dụng được ngay."
          />
          <div className="grid gap-6 md:grid-cols-[0.75fr_1.5fr]">
            <ul
              className="space-y-1"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              {FEATURES.map((f, i) => (
                <Reveal key={f.t} delay={i * 0.06}>
                  <button
                    onClick={() => setActive(i)}
                    className={`relative flex w-full gap-3 rounded-xl p-3 text-left transition-colors ${
                      active === i ? "bg-white shadow-md shadow-ink/5" : "hover:bg-white/60"
                    }`}
                  >
                    {active === i && (
                      <motion.span
                        layoutId="feature-bar"
                        className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand-500"
                      />
                    )}
                    <f.icon
                      className={`mt-0.5 size-5 shrink-0 transition-colors ${
                        active === i ? "text-brand-500" : "text-ink/60"
                      }`}
                    />
                    <span>
                      <span
                        className={`block text-sm font-semibold ${active === i ? "text-brand-500" : ""}`}
                      >
                        {f.t}
                      </span>
                      <span className="block text-xs leading-relaxed text-muted">{f.d}</span>
                    </span>
                  </button>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={0.15} className="relative pb-6 md:pr-16">
              <Dashboard active={active} />
              <Phone />
            </Reveal>
          </div>
        </div>

        <div id="giao-vien" className="scroll-mt-24">
          <SectionHeading
            title="Đội ngũ giáo viên"
            subtitle="Giáo viên giàu kinh nghiệm, tận tâm đồng hành cùng bạn."
            href="/giao-vien"
          />
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
            {!home &&
              [0, 1, 2].map((i) => (
                <div key={i} className="aspect-[4/5.4] w-[62%] shrink-0 animate-pulse rounded-2xl bg-ink/[.05] sm:w-auto" />
              ))}
            {home?.teachers.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.1} className="w-[62%] shrink-0 snap-start sm:w-auto">
                <motion.a
                  href="/giao-vien"
                  whileHover={{ y: -6 }}
                  className="group block h-full overflow-hidden rounded-2xl border border-ink/5 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/5"
                >
                  <div className="relative aspect-[4/3.4] overflow-hidden" style={{ background: `#${t.avatarBg ?? "ffe3e3"}` }}>
                    <svg viewBox="0 0 100 60" className="absolute inset-x-0 bottom-0 w-full opacity-40" aria-hidden>
                      <path d="M0 60 L30 25 L40 33 L55 15 L100 60 Z" fill="#fff" />
                    </svg>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={teacherAvatar(t)}
                      alt={t.name}
                      className={`absolute left-1/2 -translate-x-1/2 transition-transform duration-500 group-hover:scale-105 ${t.avatarUrl ? "inset-y-0 h-full object-cover" : "bottom-0 h-[95%]"}`}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="flex items-center gap-1.5 text-sm font-bold">
                      {t.name}
                      {t.native && <span className="inline-block size-2.5 rounded-full bg-brand-500 ring-2 ring-brand-100" title="Nhật Bản" />}
                    </h3>
                    {t.levelRange && (
                      <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-500">
                        {t.levelRange}
                      </span>
                    )}
                    <p className="mt-2 text-[11px] font-medium text-ink/80">
                      {t.native ? "Giáo viên người Nhật" : `${t.yearsExp}+ năm kinh nghiệm`}
                    </p>
                    <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted">{t.bio}</p>
                  </div>
                </motion.a>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const LESSON_ICONS = [
  { icon: Type, c: "bg-emerald-100 text-emerald-600" },
  { icon: Headphones, c: "bg-violet-100 text-violet-500" },
  { icon: BookOpen, c: "bg-amber-100 text-amber-600" },
];

type Highlight = { id: string; slug: string; title: string; level: string | null; courseTitle: string; completion: number };

function Dashboard({ active }: { active: number }) {
  const { data } = useApi<{ items: Highlight[] }>("/public/lessons/highlights?limit=3");
  const lessons = (data?.items ?? []).map((l, i) => ({
    t: l.title,
    s: l.courseTitle,
    p: l.completion,
    href: `/hoc/${l.slug}`,
    ...LESSON_ICONS[i % LESSON_ICONS.length],
  }));
  return (
    <div className="flex overflow-hidden rounded-2xl border border-ink/5 bg-white text-[11px] shadow-xl shadow-ink/5">
      <aside className="hidden w-28 shrink-0 border-r xl:block border-ink/5 bg-ink/[0.015] p-3">
        <p className="mb-3 font-extrabold">
          Nihongo<span className="text-brand-500">+</span>
        </p>
        {[
          [Home, "Trang chủ"],
          [BookOpen, "Khóa học"],
          [ListChecks, "Bài tập"],
          [Layers, "Từ vựng"],
          [LineChart, "Thống kê"],
          [Heart, "Yêu thích"],
        ].map(([Icon, label], i) => {
          const I = Icon as typeof Home;
          return (
            <p
              key={label as string}
              className={`mb-1 flex items-center gap-1.5 rounded-md px-1.5 py-1 ${
                i === 0 ? "bg-brand-50 font-semibold text-brand-500" : "text-muted"
              }`}
            >
              <I className="size-3" /> {label as string}
            </p>
          );
        })}
      </aside>
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2 md:pr-10 xl:pr-0">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar("Minh Anh")} alt="" className="size-8 rounded-full" />
            <div>
              <p className="text-xs font-bold">Xin chào, Minh Anh! 👋</p>
              <p className="text-muted">Hôm nay bạn học gì?</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-orange-500">
            <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <Flame className="size-4 fill-orange-400" />
            </motion.span>
            <span className="font-bold">12 ngày</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-ink/5 p-3">
          <div className="flex-1">
            <p className="font-semibold">Lộ trình N4</p>
            <p className="text-muted">Đã hoàn thành 18/36 bài</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/5">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "50%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                  className="h-full rounded-full bg-emerald-500"
                />
              </div>
              <span className="font-semibold text-emerald-600">50%</span>
            </div>
          </div>
          <button className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 font-semibold text-white">
            Tiếp tục <ArrowRight className="size-3" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="font-semibold">Bài học gần đây</p>
          <span className="text-muted">Xem tất cả →</span>
        </div>
        <AnimatePresence mode="popLayout">
          <motion.ul
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-1"
          >
            {lessons.map((l, i) => {
              const L = lessons[(i + active) % lessons.length];
              return (
                <li key={i} className="border-b border-ink/5 last:border-0">
                  <a href={L.href} className="flex items-center gap-2 py-2 hover:text-brand-500">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-md ${L.c}`}>
                      <L.icon className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{L.t}</span>
                      <span className="block truncate text-[10px] text-muted">{L.s}</span>
                    </span>
                    <span className="font-semibold text-emerald-600">{L.p}%</span>
                  </a>
                </li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Phone() {
  const { data } = useApi<HomeSample>("/public/quizzes/home");
  const q = data?.sample;
  const [picked, setPicked] = useState<string | null>(null);
  const choice = picked ?? q?.answer ?? null;
  const correct = !!q && choice === q.answer;
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -bottom-2 -right-1 hidden w-[150px] rotate-[4deg] rounded-[28px] border-[6px] border-ink bg-white p-2.5 text-[10px] shadow-2xl md:block"
    >
      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-ink/80" />
      <div className="h-1 overflow-hidden rounded-full bg-ink/5">
        <div className="h-full rounded-full bg-brand-500" style={{ width: q ? `${Math.max(10, 100 / q.total)}%` : "33%" }} />
      </div>
      {!q ? (
        <div className="mt-2 space-y-1.5">
          <div className="mx-auto h-3 w-20 animate-pulse rounded bg-ink/5" />
          <div className="mx-auto size-16 animate-pulse rounded-xl bg-ink/5" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded-lg bg-ink/5" />
          ))}
        </div>
      ) : (
        <>
          <p className="mt-2 text-center font-jp text-xs font-bold [&_rt]:text-[7px]" dangerouslySetInnerHTML={{ __html: q.prompt }} />
          {q.scene && <div className="mx-auto mt-2 grid size-16 place-items-center rounded-xl bg-amber-50 text-4xl">{q.scene}</div>}
          <div className="mt-2 space-y-1">
            {q.options.map((o) => {
              const isAns = o.key === q.answer;
              return (
                <button
                  key={o.key}
                  onClick={() => setPicked(o.key)}
                  className={`flex w-full items-center gap-1.5 rounded-lg border px-2 py-1 font-jp transition-colors ${
                    choice === o.key ? (isAns ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-brand-300 bg-brand-50 text-brand-600") : "border-ink/10"
                  }`}
                >
                  <span
                    className={`size-2.5 rounded-full border ${choice === o.key ? (isAns ? "border-emerald-500 bg-emerald-500" : "border-brand-500 bg-brand-500") : "border-ink/20"}`}
                  />
                  {o.text}
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            {choice !== null && (
              <motion.div
                key={String(correct)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`mt-2 rounded-lg p-1.5 text-center font-semibold ${correct ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-600"}`}
              >
                <span className="font-jp">{correct ? "正解です！" : "残念！"}</span>
                <span className="block text-[9px] font-normal">{correct ? "Đúng rồi!" : "Thử lại nhé!"}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
