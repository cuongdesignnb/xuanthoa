"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, BookOpenCheck, CalendarClock, CircleCheck, Crown, Landmark, Quote, Star } from "lucide-react";
import { Reveal, avatar } from "../ui";
import { teacherAvatar, badgeLabel, type Review, type Teacher, type TeacherFull } from "./types";
import { ProfileModal, TrialModal } from "./TeacherModals";
import { num } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { JapanFlag } from "./TeacherFinder";

function Torii({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 110" className={className} aria-hidden>
      <path d="M2 14 Q60 0 118 14 L114 24 Q60 12 6 24 Z" fill="#c8282c" />
      <rect x="2" y="10" width="116" height="5" rx="2" fill="#2b1a1a" />
      <rect x="14" y="34" width="92" height="7" fill="#c8282c" />
      <rect x="55" y="22" width="10" height="14" fill="#c8282c" />
      <rect x="24" y="22" width="9" height="88" fill="#d63a2f" />
      <rect x="87" y="22" width="9" height="88" fill="#d63a2f" />
      <rect x="21" y="102" width="15" height="8" fill="#2b1a1a" />
      <rect x="84" y="102" width="15" height="8" fill="#2b1a1a" />
    </svg>
  );
}

export function FeaturedTeacher() {
  const { data, loading } = useApi<{ items: TeacherFull[] }>("/public/teachers/featured?limit=1");
  const [profile, setProfile] = useState<string | null>(null);
  const [booking, setBooking] = useState<Teacher | null>(null);
  const t = data?.items[0];
  if (loading)
    return (
      <section className="mx-auto mt-6 max-w-[1400px] px-4 sm:px-6">
        <div className="h-[190px] animate-pulse rounded-2xl bg-brand-50" />
      </section>
    );
  if (!t) return null;
  const FEAT_STATS = [
    { icon: <Star className="size-5 fill-amber-400 text-amber-400" />, v: `${t.rating}/5`, l: `${num(t.reviewCount)}+ đánh giá`, red: true },
    { icon: <CalendarClock className="size-5 text-brand-500" />, v: `${t.yearsExp} năm`, l: "kinh nghiệm giảng dạy", red: true },
    ...(t.skills.length ? [{ icon: <BookOpenCheck className="size-5 text-brand-500" />, v: t.skills.slice(0, -1).join(", ") + (t.skills.length > 1 ? "," : ""), l: t.skills[t.skills.length - 1] }] : []),
    ...(t.education ? [{ icon: <Landmark className="size-5 text-brand-500" />, v: t.education.split("·")[0].trim(), l: t.education.split("·").slice(1).join("·").trim() }] : []),
  ];
  const FEAT_POINTS = t.highlights;
  return (
    <section className="mx-auto mt-6 max-w-[1400px] px-4 sm:px-6">
      <Reveal className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-50 via-[#fff6f4] to-brand-50 ring-1 ring-brand-100">
        <Torii className="pointer-events-none absolute -right-2 bottom-0 hidden h-[78%] opacity-90 xl:block" />
        <div className="relative grid gap-6 p-4 sm:p-5 lg:grid-cols-[230px_minmax(0,1fr)_200px] xl:grid-cols-[230px_minmax(0,1fr)_220px_260px] xl:pr-40 [&>*]:min-w-0">
          {/* Ảnh */}
          <div className="relative mx-auto h-[150px] w-full max-w-[260px] overflow-hidden rounded-xl bg-[#fde3e7] lg:h-auto lg:min-h-[150px]">
            <Image
              src="https://images.unsplash.com/photo-1522383225653-ed111181a951?w=500&q=70"
              alt=""
              fill
              sizes="260px"
              className="object-cover opacity-60"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={teacherAvatar(t)}
              alt={t.name}
              className={t.avatarUrl ? "absolute inset-0 size-full object-cover" : "absolute -bottom-6 left-1/2 h-[125%] -translate-x-1/2"}
            />
          </div>
          {/* Thông tin */}
          <div className="self-center">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-500">
              <Crown className="size-4 fill-amber-400 text-amber-500" /> Giáo viên tiêu biểu
            </p>
            <h3 className="mt-2 flex flex-wrap items-center gap-2.5 text-2xl font-extrabold">
              {t.name} {t.native && <JapanFlag className="h-3.5 w-5" />}
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand-500">{badgeLabel(t)}</span>
            </h3>
            {t.title && <p className="mt-1 text-sm text-muted">{t.title}</p>}
            {(t.quote || t.bio) && (
              <blockquote className="relative mt-4 pl-5 text-[12px] italic leading-relaxed text-ink/70">
                <Quote className="absolute left-0 top-0 size-3.5 -scale-x-100 fill-brand-300 text-brand-300" />
                {t.quote || t.bio}
              </blockquote>
            )}
          </div>
          {/* Chỉ số */}
          <ul className="grid grid-cols-2 gap-3 self-center sm:grid-cols-4 lg:grid-cols-1 lg:border-l lg:border-ink/10 lg:pl-5">
            {FEAT_STATS.map((s) => (
              <li key={s.v} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{s.icon}</span>
                <span className="leading-tight">
                  <span className={`block text-[12px] font-bold ${s.red ? "text-brand-500" : "text-ink"}`}>{s.v}</span>
                  <span className="block text-[10.5px] text-muted">{s.l}</span>
                </span>
              </li>
            ))}
          </ul>
          {/* Điểm nổi bật */}
          <div className="self-center lg:col-span-3 xl:col-span-1">
            <ul className="space-y-2.5">
              {FEAT_POINTS.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-2.5 text-[12px]"
                >
                  <CircleCheck className="size-4 shrink-0 fill-emerald-500 text-white" />
                  {p}
                </motion.li>
              ))}
            </ul>
            <motion.button
              onClick={() => setProfile(t.slug)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/30"
            >
              Xem hồ sơ chi tiết <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </div>
        </div>
      </Reveal>
      <ProfileModal
        slug={profile}
        onClose={() => setProfile(null)}
        onBook={(x) => {
          setProfile(null);
          setBooking(x);
        }}
      />
      <TrialModal teacher={booking} open={!!booking} onClose={() => setBooking(null)} />
    </section>
  );
}

export function TestimonialsAndAdvice() {
  const [more, setMore] = useState(false);
  const [advice, setAdvice] = useState(false);
  const { data, loading } = useApi<{ items: Review[] }>(`/public/reviews?featured=1&teacher=any&limit=${more ? 9 : 3}`);
  const reviews = data?.items ?? [];
  return (
    <section className="mx-auto mt-6 grid max-w-[1400px] grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_408px] [&>*]:min-w-0">
      <div>
        <Reveal className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Học viên nói gì về giáo viên Nihongo+?</h2>
            <p className="mt-1 text-[12px] text-muted">
              Những chia sẻ chân thật từ học viên đã và đang học cùng các thầy cô tại Nihongo+.
            </p>
          </div>
          <button onClick={() => setMore((m) => !m)} className="group flex items-center gap-1 text-xs font-semibold text-brand-500">
            {more ? "Thu gọn" : "Xem tất cả đánh giá"} <ArrowRight className={`size-3.5 transition-transform group-hover:translate-x-1 ${more ? "-rotate-90" : ""}`} />
          </button>
        </Reveal>
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {loading && !data && [0, 1, 2].map((i) => <div key={i} className="h-28 w-[85%] shrink-0 animate-pulse rounded-xl bg-ink/[.05] sm:w-auto" />)}
          {reviews.map((t, i) => (
            <Reveal
              key={t.id}
              delay={i * 0.08}
              whileHover={{ y: -4 }}
              className="flex w-[85%] shrink-0 snap-center gap-3 rounded-xl border border-ink/5 bg-white p-3 shadow-sm sm:w-auto"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.avatarUrl || avatar(t.authorName, ["ffe4e8", "e0ecff", "fff1d6"][i % 3])} alt="" className="size-14 shrink-0 rounded-full" />
              <div className="min-w-0">
                <p className="text-[11px] leading-relaxed text-ink/75">“{t.content}”</p>
                <div className="mt-1.5 flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className={`size-3.5 ${s < t.rating ? "fill-amber-400 text-amber-400" : "text-ink/15"}`} />
                  ))}
                </div>
                <p className="mt-1 text-[12px] font-bold">{t.authorName}</p>
                <p className="text-[10.5px] text-muted">{t.authorRole}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal
        delay={0.1}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-[#fff3f2] to-brand-100/70 p-5 ring-1 ring-brand-100"
      >
        <div className="relative z-10 max-w-[230px]">
          <h2 className="text-xl font-extrabold leading-tight text-brand-500">Bạn chưa biết chọn giáo viên nào?</h2>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink/70">
            Đội ngũ tư vấn của Nihongo+ sẽ giúp bạn tìm giáo viên phù hợp nhất với mục tiêu và trình độ hiện tại.
          </p>
          <motion.button
            onClick={() => setAdvice(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-xs font-semibold text-white shadow-lg shadow-brand-500/30"
          >
            Nhận tư vấn miễn phí <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="pointer-events-none absolute -bottom-4 right-0 h-[190px] w-[160px] opacity-40 min-[420px]:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar("Hana-advisor", "transparent")} alt="" className="size-full object-contain object-bottom" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -5, 0], rotate: [-6, -3, -6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-24 top-3 hidden rounded-2xl bg-white px-3 py-1.5 font-jp text-[11px] font-bold leading-tight shadow-md min-[420px]:block"
        >
          一緒に
          <br />
          がんばりましょう！
        </motion.div>
      </Reveal>
      <TrialModal teacher={null} open={advice} onClose={() => setAdvice(false)} />
    </section>
  );
}
