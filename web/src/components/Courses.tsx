"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  MessagesSquare,
  BookMarked,
  FileText,
  Languages,
  Users,
  Headphones,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { Reveal, SectionHeading } from "./ui";
import { useApi } from "@/lib/hooks";
import type { Paged } from "@/lib/api";
import type { CourseSummary } from "./courses/types";

/** Màu theo cấp độ (hằng số giao diện). Nội dung thẻ lấy từ khóa học category = "level". */
const LEVEL_STYLE: Record<string, { tone: string; text: string; chip: string; jp: string }> = {
  N5: { tone: "from-rose-50 to-white", text: "text-rose-500", chip: "bg-rose-100 text-rose-500", jp: "初" },
  N4: { tone: "from-amber-50 to-white", text: "text-amber-500", chip: "bg-amber-100 text-amber-600", jp: "基" },
  N3: { tone: "from-emerald-50 to-white", text: "text-emerald-500", chip: "bg-emerald-100 text-emerald-600", jp: "中" },
  N2: { tone: "from-sky-50 to-white", text: "text-sky-500", chip: "bg-sky-100 text-sky-600", jp: "上" },
  N1: { tone: "from-violet-50 to-white", text: "text-violet-500", chip: "bg-violet-100 text-violet-600", jp: "極" },
};
const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1"];

/** Biểu tượng cho thẻ "Bài tập theo chủ đề" (tên icon lưu trong DB). */
const TOPIC_ICONS: Record<string, LucideIcon> = { MessagesSquare, BookMarked, FileText, Languages, Users, Headphones, ClipboardCheck };

type HomeTopics = {
  total: number;
  topics: { title: string; desc: string; icon: string; tone: string; count: number; href: string }[];
};

export default function Courses() {
  const { data, loading } = useApi<Paged<CourseSummary>>("/public/courses?category=level&pageSize=20");
  const { data: home, loading: topicsLoading } = useApi<HomeTopics>("/public/quizzes/home");
  const seen = new Set<string>();
  const levels = (data?.items ?? [])
    .filter((c) => c.level && !seen.has(c.level) && seen.add(c.level))
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level!) - LEVEL_ORDER.indexOf(b.level!))
    .map((c) => ({ ...LEVEL_STYLE[c.level!], code: c.level!, desc: c.subtitle ?? c.title, items: c.outcomes.slice(0, 3), href: `/khoa-hoc/${c.slug}` }));
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-12 [&>*]:min-w-0 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
      <div id="khoa-hoc" className="scroll-mt-24">
        <SectionHeading
          title="Khóa học theo cấp độ"
          subtitle="Lộ trình bài bản từ cơ bản đến nâng cao, phù hợp cho mọi mục tiêu học tập."
        />
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-5 xl:gap-3">
          {loading &&
            LEVEL_ORDER.map((lv) => (
              <div key={lv} className="h-56 w-[72%] shrink-0 animate-pulse rounded-2xl border border-ink/5 bg-ink/[.03] sm:w-auto" />
            ))}
          {levels.map((l, i) => (
            <Reveal key={l.code} delay={i * 0.08} className="w-[72%] shrink-0 snap-start sm:w-auto">
              <motion.a
                href={l.href}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink/5 bg-gradient-to-b ${l.tone} p-4 shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/5`}
              >
                <span className="pointer-events-none absolute -right-2 top-8 font-jp text-7xl font-bold text-ink/[0.04] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  {l.jp}
                </span>
                <p className={`text-3xl font-extrabold ${l.text}`}>{l.code}</p>
                <p className={`mt-0.5 min-h-[2.5em] text-xs font-medium ${l.text}`}>{l.desc}</p>
                <ul className="mt-4 flex-1 space-y-2 border-t border-ink/5 pt-4">
                  {l.items.map((it) => (
                    <li key={it} className="flex gap-1.5 text-xs text-ink/80">
                      <Check className={`mt-px size-3.5 shrink-0 ${l.text}`} strokeWidth={3} />
                      {it}
                    </li>
                  ))}
                </ul>
                <span
                  className={`mt-4 grid size-7 place-items-center self-end rounded-full ${l.chip} transition-transform group-hover:translate-x-1`}
                >
                  <ChevronRight className="size-4" />
                </span>
              </motion.a>
            </Reveal>
          ))}
        </div>
      </div>

      <div id="bai-tap" className="scroll-mt-24">
        <SectionHeading
          title="Bài tập theo chủ đề"
          subtitle="Luyện tập đa dạng chủ đề, bám sát thực tế và kỳ thi JLPT."
          href="/bai-tap"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {topicsLoading && !home
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className={`h-[66px] animate-pulse rounded-2xl bg-ink/[.04] ${i === 6 ? "col-span-2 sm:col-span-1" : ""}`} />
              ))
            : (home?.topics ?? []).map((t, i) => {
                const Icon = TOPIC_ICONS[t.icon] ?? FileText;
                return (
                  <Reveal key={t.title} delay={i * 0.05} className={i === 6 ? "col-span-2 sm:col-span-1" : ""}>
                    <motion.a
                      href={t.href}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="group flex h-full items-center gap-3 rounded-2xl border border-ink/5 bg-white p-3 shadow-sm transition-shadow hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/10"
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.tone} transition-transform group-hover:-rotate-6`}>
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{t.title}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {t.desc}
                          {t.count ? ` · ${t.count} bài` : ""}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
                    </motion.a>
                  </Reveal>
                );
              })}
          <Reveal delay={0.4} className="hidden sm:col-span-2 sm:block">
            <Link
              href="/bai-tap"
              className="group flex h-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 p-4 text-white shadow-lg shadow-brand-500/25"
            >
              <span>
                <span className="block text-sm font-bold">+{home?.total ?? 0} bộ đề luyện tập</span>
                <span className="block text-xs text-white/80">Cập nhật hằng tuần theo cấu trúc JLPT mới</span>
              </span>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
