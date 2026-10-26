"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, Check, ChevronRight, Mic, PhoneOff, Star, Video, Award, Route, Clock } from "lucide-react";
import { avatar } from "./ui";
import { num } from "@/lib/api";
import { useHomeData } from "./home-data";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease },
});

const float = (d = 0, y = 10) => ({
  animate: { y: [0, -y, 0] },
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay: d },
});

// PRNG cố định (mulberry32): cánh hoa trông ngẫu nhiên nhưng server và client giống nhau.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Petals({ count = 18 }: { count?: number }) {
  const petals = useMemo(() => {
    const r = rng(count * 7919);
    return Array.from({ length: count }, () => ({
      left: r() * 100,
      size: 8 + r() * 10,
      dur: 9 + r() * 10,
      delay: -r() * 18,
      drift: (r() - 0.3) * 260,
      spin: 360 + r() * 540,
    }));
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {petals.map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="petal"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        >
          <path d="M10 1 C 15 5, 19 10, 10 19 C 1 10, 5 5, 10 1 Z" fill="#ffb7c0" opacity=".85" />
          <path d="M10 1 L10 8" stroke="#ff8f9b" strokeWidth="1" />
        </svg>
      ))}
    </div>
  );
}

export default function Hero() {
  const { data: home } = useHomeData();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#fff8f7] to-white pt-24 lg:pt-28">
      {/* Fuji backdrop */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] md:block">
        <Image
          src="https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1600&q=80"
          alt=""
          fill
          priority
          sizes="60vw"
          className="object-cover object-[50%_60%] opacity-60 [mask-image:linear-gradient(to_right,transparent,black_35%,black_80%,transparent),linear-gradient(to_bottom,black_60%,transparent)] [mask-composite:intersect] saturate-[.8] hue-rotate-[-12deg]"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-brand-100/70 via-brand-50/30 to-transparent mix-blend-multiply" />
      </div>
      <Petals />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-20">
        {/* Copy */}
        <div className="relative z-10">
          <motion.span
            {...fadeUp(0.1)}
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-500"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-brand-500" />
            Học tiếng Nhật online
          </motion.span>

          <motion.h1
            {...fadeUp(0.2)}
            className="mt-5 text-[2.2rem] font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.1rem]"
          >
            Học tiếng Nhật online <br className="hidden sm:block" />
            bài bản, <span className="brush-underline relative z-0">dễ hiểu</span>, có lộ trình rõ ràng
          </motion.h1>

          <motion.p {...fadeUp(0.32)} className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Chương trình được thiết kế dành riêng cho người Việt, giúp bạn nắm vững nền tảng, tự tin giao tiếp và
            chinh phục các kỳ thi JLPT.
          </motion.p>

          <motion.div {...fadeUp(0.44)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <motion.a
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              href="/khoa-hoc"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-xl shadow-brand-500/30 transition-colors hover:bg-brand-600"
            >
              Bắt đầu học miễn phí
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </motion.a>
            <motion.a
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              href="#khoa-hoc"
              className="inline-flex items-center justify-center rounded-xl border-2 border-brand-300 bg-white px-6 py-3 font-semibold text-brand-500 transition-colors hover:bg-brand-50"
            >
              Làm bài kiểm tra đầu vào
            </motion.a>
          </motion.div>

          <motion.ul
            {...fadeUp(0.56)}
            className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-ink/80 sm:flex sm:flex-wrap"
          >
            <li className="flex items-center gap-2">
              <span className="flex -space-x-2">
                {(home?.studentAvatars ?? []).map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.name} src={s.avatarUrl || avatar(s.name)} alt="" className="size-6 rounded-full ring-2 ring-white" />
                ))}
              </span>
              <b>{home ? `${num(home.stats.students)}+` : "…"}</b> học viên
            </li>
            <li className="flex items-center gap-1.5">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <b>{home ? `${home.stats.avgRating.toLocaleString("vi-VN")}/5` : "…"}</b> đánh giá
            </li>
            <li className="flex items-center gap-1.5">
              <Award className="size-4 text-brand-500" /> Giảng viên chất lượng
            </li>
            <li className="flex items-center gap-1.5">
              <Route className="size-4 text-brand-500" /> Lộ trình rõ ràng
            </li>
          </motion.ul>
        </div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease }}
          className="relative mx-auto w-full max-w-[560px] pt-6 lg:pt-2"
        >
          <span className="absolute -bottom-14 right-2 z-10 hidden rotate-[-6deg] text-right font-script text-2xl leading-snug text-brand-700 xl:block">
            Tiếng Nhật
            <br />
            mở ra thế giới
            <br />
            mới cho bạn
          </span>

          {/* Laptop */}
          <div className="relative mx-auto w-[88%]">
            <div className="rounded-[18px] border-[10px] border-[#2b2b36] bg-[#2b2b36] shadow-2xl shadow-ink/30">
              <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-gradient-to-br from-[#ffe9e6] via-[#fff3ef] to-[#ffd9dc]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,#fff_0,transparent_55%)]" />
                <span className="absolute bottom-0 right-6 font-jp text-[110px] leading-none text-brand-500/10">
                  日本
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar("Ayaka", "transparent")}
                  alt="Giáo viên đang dạy trực tuyến"
                  className="absolute bottom-0 left-1/2 h-[92%] -translate-x-1/2"
                />
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white">
                  <span className="size-1.5 animate-pulse rounded-full bg-red-400" /> LIVE · 24:15
                </div>
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-white/90 text-ink shadow">
                    <Mic className="size-4" />
                  </span>
                  <span className="grid size-8 place-items-center rounded-full bg-white/90 text-ink shadow">
                    <Video className="size-4" />
                  </span>
                  <span className="grid size-8 place-items-center rounded-full bg-brand-500 text-white shadow">
                    <PhoneOff className="size-4" />
                  </span>
                </div>
              </div>
            </div>
            <div className="mx-auto h-3 w-[112%] -translate-x-[5.3%] rounded-b-2xl bg-gradient-to-b from-[#d9d9e0] to-[#a9a9b4]" />
          </div>

          {/* Floating cards */}
          <motion.div
            {...float(0)}
            className="absolute left-[10%] top-[8%] rounded-2xl rounded-bl-none bg-white px-4 py-2 text-center shadow-xl sm:left-[14%]"
          >
            <p className="font-jp text-sm font-bold">こんにちは！</p>
            <p className="text-[10px] text-muted">Xin chào!</p>
          </motion.div>

          <motion.div
            {...float(1, 12)}
            className="absolute -left-1 top-[40%] w-20 rounded-2xl bg-white p-2.5 text-center shadow-xl sm:-left-4 sm:w-24"
          >
            <p className="font-jp text-4xl font-bold sm:text-5xl">桜</p>
            <p className="font-jp text-[10px] text-muted">さくら</p>
            <p className="text-xs font-semibold">Sakura</p>
            <p className="text-[10px] text-muted">Hoa anh đào</p>
          </motion.div>

          <motion.div
            {...float(0.5, 8)}
            className="absolute -top-2 right-0 w-40 rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur sm:right-2 sm:w-44"
          >
            <p className="text-[10px] text-muted">Bài học hôm nay</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
              <Clock className="size-3.5 text-brand-500" /> Ngữ pháp N4
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "60%" }}
                  transition={{ delay: 1.2, duration: 1.2, ease }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                />
              </div>
              <span className="text-[10px] font-semibold">3/5</span>
            </div>
          </motion.div>

          <motion.div
            {...float(1.5, 10)}
            className="absolute -right-1 bottom-[14%] hidden w-40 rounded-2xl bg-white p-3 shadow-xl sm:block sm:-right-3"
          >
            {[
              ["Từ vựng", true],
              ["Ngữ pháp", true],
              ["Luyện nghe", false],
              ["Luyện nói", false],
            ].map(([t, done], i) => (
              <motion.div
                key={t as string}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.12 }}
                className="flex items-center gap-2 py-1 text-xs"
              >
                <span
                  className={`grid size-4 place-items-center rounded border ${
                    done ? "border-emerald-500 bg-emerald-500 text-white" : "border-ink/20"
                  }`}
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span className="flex-1 font-medium">{t as string}</span>
                <ChevronRight className="size-3 text-muted" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
