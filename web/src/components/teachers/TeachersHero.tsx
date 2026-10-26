"use client";

import { motion } from "motion/react";
import { Star, Users } from "lucide-react";
import { avatar } from "../ui";
import { num } from "@/lib/api";
import { useHomeData } from "../home-data";

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease },
});

function ShieldHeart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" fill="currentColor" />
      <path
        d="M12 16.5s-4-2.4-4-5.2A2.2 2.2 0 0 1 12 10a2.2 2.2 0 0 1 4 1.3c0 2.8-4 5.2-4 5.2Z"
        fill="#fff"
      />
    </svg>
  );
}

export function TeachersHeroContent() {
  const { data } = useHomeData();
  const st = data?.stats;
  const STATS = [
    { icon: <Users className="size-6" />, v: st ? `${num(st.teachers)}+` : "…", l: "Giáo viên chất lượng" },
    { icon: <ShieldHeart className="size-6" />, v: st ? `${num(st.students)}+` : "…", l: "Học viên tin tưởng" },
    { icon: <Star className="size-6 fill-current" />, v: st ? `${st.avgRating.toLocaleString("vi-VN")}/5` : "…", l: "Đánh giá từ học viên" },
  ];
  return (
    <div className="pb-6 lg:pb-14">
      <motion.span
        {...fadeUp(0)}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-100/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-600"
      >
        <Users className="size-3.5" /> Đội ngũ giáo viên
      </motion.span>
      <motion.h1
        {...fadeUp(0.08)}
        className="mt-4 text-[2.4rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[2.9rem]"
      >
        Đội ngũ giáo viên
        <br />
        Nihongo<span className="text-brand-500">+</span>
      </motion.h1>
      <motion.p {...fadeUp(0.16)} className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/75">
        Những người đồng hành tận tâm, giàu kinh nghiệm và yêu thích tiếng Nhật, giúp bạn chinh phục mục tiêu của mình.
      </motion.p>
      <motion.ul
        {...fadeUp(0.24)}
        className="mt-6 inline-flex flex-wrap gap-x-6 gap-y-4 rounded-2xl border border-ink/5 bg-white/90 px-5 py-4 shadow-sm backdrop-blur"
      >
        {STATS.map((s, i) => (
          <li key={s.l} className={`flex items-center gap-2.5 ${i ? "sm:border-l sm:border-ink/10 sm:pl-6" : ""}`}>
            <span className="text-brand-500">{s.icon}</span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-brand-500">{s.v}</span>
              <span className="block text-[10.5px] text-muted">{s.l}</span>
            </span>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

const GROUP = [
  { seed: "Ayaka-Sato", size: 220, x: "0%", z: 3, delay: 0.2 },
  { seed: "Minh-Tran-N1", size: 250, x: "22%", z: 2, delay: 0.3 },
  { seed: "Mai-Nguyen", size: 225, x: "45%", z: 3, delay: 0.4 },
  { seed: "Nakamura-Yuki", size: 215, x: "65%", z: 1, delay: 0.5 },
];

/** "Ảnh nhóm" giáo viên dựng từ avatar minh họa. */
export function TeachersHeroAside() {
  return (
    <div className="relative mx-auto h-[290px] w-full max-w-[600px]">
      {GROUP.map((g, i) => (
        <motion.div
          key={g.seed}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: g.delay, ease }}
          className="absolute bottom-0"
          style={{ left: g.x, zIndex: g.z, width: g.size, height: g.size + 30 }}
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
            className="relative size-full overflow-hidden rounded-t-full bg-gradient-to-b from-white/70 to-white/0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar(g.seed, "transparent")} alt="" className="absolute -bottom-3 left-1/2 w-[110%] max-w-none -translate-x-1/2" />
          </motion.div>
        </motion.div>
      ))}
      {/* Sách にほんご */}
      <motion.div
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: 1, rotate: -10 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="absolute bottom-2 left-[12%] z-10 grid h-16 w-20 place-items-center rounded-md bg-[#fbf7f0] font-jp text-lg font-bold text-ink/85 shadow-lg ring-1 ring-ink/10"
      >
        にほんご
      </motion.div>
      {/* Bong bóng thoại */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, rotate: -6 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute -right-20 bottom-4 z-10 hidden w-36 rounded-2xl bg-white px-3.5 py-2.5 shadow-lg xl:block"
      >
        <p className="font-jp text-sm font-bold">もっと話そう！</p>
        <p className="mt-0.5 text-[9.5px] leading-tight text-muted">Hãy cùng nói nhiều hơn bằng tiếng Nhật!</p>
      </motion.div>
    </div>
  );
}
