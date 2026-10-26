"use client";

import { motion } from "motion/react";
import { BookOpen, Heart, Users } from "lucide-react";
import { avatar } from "../ui";
import { num } from "@/lib/api";
import { useApi } from "@/lib/hooks";

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease },
});

type BlogStats = { posts: number; views: number; followers: number; latest: string | null };

/** "Cập nhật hàng tuần / hàng tháng" theo ngày đăng bài mới nhất. */
function freshness(latest: string | null) {
  if (!latest) return "Sắp ra mắt";
  const days = (new Date().getTime() - new Date(latest).getTime()) / 86400000;
  return days <= 7 ? "Hàng tuần" : days <= 31 ? "Hàng tháng" : "Thường xuyên";
}

export function BlogHeroContent() {
  const { data } = useApi<BlogStats>("/public/posts/stats");
  const STATS = [
    { icon: BookOpen, v: data ? num(data.posts) + "+" : "…", l: "Bài viết hữu ích" },
    { icon: Users, v: data ? num(data.followers) + "+" : "…", l: "Học viên đã theo dõi" },
    { icon: Heart, v: "Nội dung cập nhật", l: data ? freshness(data.latest) : "…", small: true },
  ];
  return (
    <div className="pb-6 lg:pb-12">
      <motion.span
        {...fadeUp(0)}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-100/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-600"
      >
        <BookOpen className="size-3.5" /> Blog &amp; Kiến thức
      </motion.span>
      <motion.h1
        {...fadeUp(0.08)}
        className="mt-4 text-[2.4rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.1rem]"
      >
        Blog &amp; Tài nguyên
        <br />
        học tiếng Nhật
      </motion.h1>
      <motion.p {...fadeUp(0.16)} className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink/75">
        Chia sẻ kiến thức, kinh nghiệm và tài liệu hữu ích giúp bạn học tiếng Nhật dễ dàng hơn, hiệu quả hơn mỗi ngày.
      </motion.p>
      <motion.ul {...fadeUp(0.24)} className="mt-6 flex flex-wrap gap-x-6 gap-y-4">
        {STATS.map((s, i) => (
          <li key={s.l} className={`flex items-center gap-3 ${i ? "sm:border-l sm:border-ink/10 sm:pl-6" : ""}`}>
            <span className="grid size-10 place-items-center rounded-full bg-brand-100 text-brand-500">
              <s.icon className="size-5" fill={s.icon === Heart ? "currentColor" : "none"} />
            </span>
            <span className="leading-tight">
              <span className={`block font-bold text-brand-500 ${s.small ? "text-xs" : "text-sm"}`}>{s.v}</span>
              <span className="block text-[11px] text-muted">{s.l}</span>
            </span>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

const BOOKS = [
  { t: "日本語", c: "bg-[#f7f1ea]", w: "w-44" },
  { t: "文法", c: "bg-[#fbf6ef]", w: "w-40" },
  { t: "漢字", c: "bg-[#f4ece2]", w: "w-44" },
  { t: "JLPT", c: "bg-[#fbf6ef]", w: "w-40" },
  { t: "日本の文化", c: "bg-[#f7f1ea]", w: "w-44" },
];

export function BlogHeroAside() {
  return (
    <div className="relative mx-auto h-[300px] max-w-[520px]">
      {/* Nhân vật */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease }}
        className="absolute bottom-0 left-[18%] h-[290px] w-[250px] overflow-hidden rounded-t-full bg-gradient-to-b from-brand-100/80 to-white/0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar("Sakura-reader", "transparent")} alt="Học viên đang đọc blog" className="absolute -bottom-4 left-1/2 w-[270px] -translate-x-1/2" />
      </motion.div>
      {/* Laptop */}
      <div className="absolute bottom-0 left-0 h-16 w-40 -skew-x-6 rounded-t-lg bg-gradient-to-br from-zinc-200 to-zinc-300 shadow-md" />
      {/* Bong bóng thoại */}
      <motion.div
        initial={{ opacity: 0, y: 10, rotate: -12 }}
        animate={{ opacity: 1, y: 0, rotate: -8 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="absolute left-0 top-2 w-40 rounded-2xl bg-white px-4 py-3 shadow-lg"
      >
        <p className="font-jp text-sm font-bold leading-snug">学び続ければ、きっとできる！</p>
        <p className="mt-1 text-[10px] leading-tight text-muted">Cứ tiếp tục học, bạn sẽ làm được thôi!</p>
        <span className="absolute -bottom-2 right-8 size-4 rotate-45 bg-white" />
      </motion.div>
      <svg viewBox="0 0 30 30" className="absolute left-[30%] top-[38%] size-7 text-brand-500" aria-hidden>
        <path d="M4 6 L12 10 M2 16 L11 15 M6 25 L13 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {/* Chồng sách */}
      <div className="absolute bottom-0 right-0 flex flex-col items-end">
        {BOOKS.map((b, i) => (
          <motion.div
            key={b.t}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease }}
            whileHover={{ x: -6 }}
            className={`${b.c} ${b.w} ${i % 2 ? "mr-2" : ""} flex h-[26px] items-center border-y border-l-[6px] border-[#d8cbbb] border-l-brand-400/70 px-4 font-jp text-sm font-bold tracking-[0.2em] text-ink/85 shadow-sm`}
          >
            {b.t}
          </motion.div>
        ))}
      </div>
      {/* Daruma */}
      <motion.div
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-1 -right-8 grid size-12 place-items-center rounded-[45%] bg-brand-500 shadow-lg"
        aria-hidden
      >
        <span className="grid size-7 place-items-center rounded-full bg-[#fde8d8] font-jp text-[10px] font-bold text-brand-600">福</span>
      </motion.div>
    </div>
  );
}
