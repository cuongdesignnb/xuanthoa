"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Kiểu tóc nữ của bộ notionists (chọn tay từ bảng variant01–63).
const FEMALE_HAIR = [2, 4, 8, 10, 23, 28, 36, 37, 39, 41, 45, 46, 47, 48, 57, 58, 59]
  .map((n) => `variant${String(n).padStart(2, "0")}`)
  .join(",");

// Tên/seed của nhân vật nữ trên site (so khớp sau khi bỏ dấu).
const FEMALE_NAME =
  /minh[\s-]?anh|hana|sakura|ayaka|\bmai\b|mai-|ha-le|thu ha|nakamura|rina|trang|linh|thao|thu|phuong|yuki|aiko|\bhan\b|lan\b|ngoc|huong|mio|mei|rin\b|saki|\bco\b/i;

const isFemale = (seed: string) =>
  FEMALE_NAME.test(seed.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d"));

/**
 * Avatar minh họa DiceBear. Mặc định tắt kính và râu (tránh kính râm / râu ngẫu nhiên);
 * tên nữ tự dùng kiểu tóc nữ. `glasses` bật lại kính, `female` ép giới tính.
 */
export const avatar = (
  seed: string,
  bg = "ffe3e3",
  { glasses = false, female = isFemale(seed) }: { glasses?: boolean; female?: boolean } = {},
) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&beardProbability=0${
    glasses ? "" : "&glassesProbability=0"
  }${female ? `&hair=${FEMALE_HAIR}` : ""}`;

export function Reveal({
  delay = 0,
  y = 24,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  );
}

export function SectionHeading({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href?: string;
}) {
  return (
    <Reveal className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {href && (
        <a
          href={href}
          className="group hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-500 sm:flex"
        >
          Xem tất cả
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </a>
      )}
    </Reveal>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Nihongo+ trang chủ">
      <svg viewBox="0 0 56 32" className="h-8 w-14" aria-hidden>
        <circle cx="34" cy="11" r="9" fill="#e5383b" />
        <path d="M2 30 L20 10 L26 16 L30 12 L54 30 Z" fill={light ? "#fff" : "#1d1d2b"} />
        <path d="M15.5 15 L20 10 L24.5 15 L22 14 L20 16 L18 14 Z" fill={light ? "#1d1d2b" : "#fff"} />
      </svg>
      <span className="leading-tight">
        <span className={`block text-xl font-extrabold ${light ? "text-white" : "text-ink"}`}>
          Nihongo<span className="text-brand-500">+</span>
        </span>
        <span className={`block text-[10px] ${light ? "text-white/70" : "text-muted"}`}>
          Học tiếng Nhật, mở rộng tương lai
        </span>
      </span>
    </Link>
  );
}
