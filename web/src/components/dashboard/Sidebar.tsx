"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bookmark,
  Camera,
  Check,
  ClipboardList,
  Crown,
  Home,
  PenLine,
  Settings,
} from "lucide-react";
import { avatar } from "../ui";
import type { DashboardData } from "./types";

const MENU = [
  { label: "Tổng quan", icon: Home, href: "/dashboard" },
  { label: "Khóa học của tôi", icon: BookOpen, href: "/khoa-hoc" },
  { label: "Bài tập", icon: ClipboardList, href: "/bai-tap" },
  { label: "Từ vựng đã lưu", icon: Bookmark, href: "#tu-vung" },
  { label: "Chứng chỉ", icon: Award, href: "#thanh-tich" },
  { label: "Cài đặt", icon: Settings, href: "/tai-khoan" },
];

const PERKS = ["Truy cập toàn bộ khóa học", "Bài tập nâng cao & đề thi thử", "Học cùng giáo viên Nhật Bản"];

const ROLE: Record<string, string> = { student: "Học viên", teacher: "Giáo viên", staff: "Nhân sự", admin: "Quản trị viên" };

export default function Sidebar({ user }: { user: DashboardData["user"] }) {
  const [active, setActive] = useState(0);

  return (
    <aside className="min-w-0 rounded-2xl border border-ink/5 bg-white/90 p-4 shadow-sm backdrop-blur lg:p-5">
      {/* Hồ sơ */}
      <div className="flex items-center gap-4 lg:flex-col lg:gap-0">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="relative shrink-0"
        >
          <div className="rounded-full bg-gradient-to-br from-brand-200 via-brand-100 to-white p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatarUrl || avatar(user.name)}
              alt={user.name}
              className="size-16 rounded-full bg-brand-50 object-cover lg:size-28"
            />
          </div>
          <Link
            href="/tai-khoan"
            aria-label="Đổi ảnh đại diện"
            className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-full bg-white text-ink shadow ring-1 ring-ink/10 transition hover:text-brand-500 lg:bottom-2 lg:right-2"
          >
            <Camera className="size-3.5" />
          </Link>
        </motion.div>
        <div className="min-w-0 lg:mt-3 lg:text-center">
          <div className="flex items-center gap-2 lg:justify-center">
            <p className="truncate text-lg font-bold">{user.name}</p>
            <Link href="/tai-khoan" aria-label="Sửa hồ sơ" className="text-ink/60 transition hover:text-brand-500">
              <PenLine className="size-4" />
            </Link>
          </div>
          <p className="flex items-center gap-1 text-xs text-muted lg:justify-center">
            <Crown className="size-3.5 fill-brand-500 text-brand-500" /> {ROLE[user.role] ?? "Học viên"}
            {user.level && <span className="ml-1 rounded bg-brand-50 px-1.5 text-[10px] font-bold text-brand-500">{user.level}</span>}
          </p>
        </div>
      </div>

      {/* Menu: hàng ngang cuộn trên mobile, dọc trên desktop */}
      <nav className="no-scrollbar -mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 lg:mx-0 lg:mt-6 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {MENU.map((m, i) => {
          const Icon = m.icon;
          const on = active === i;
          return (
            <Link
              key={m.label}
              href={m.href}
              onClick={() => setActive(i)}
              className={`relative flex shrink-0 snap-start items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition lg:py-3 ${
                on ? "font-semibold text-brand-500" : "text-ink/80 hover:bg-brand-50/60 hover:text-brand-500"
              }`}
            >
              {on && (
                <motion.span
                  layoutId="dash-menu"
                  className="absolute inset-0 rounded-xl bg-brand-100/70"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`relative size-[18px] ${on ? "fill-brand-500/20" : ""}`} />
              <span className="relative whitespace-nowrap">{m.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Premium */}
      <motion.div
        whileHover={{ y: -3 }}
        className="relative mt-8 hidden overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-[#fff1ec] to-[#ffe9e2] p-4 lg:block"
      >
        <div className="flex items-start gap-2.5">
          <motion.span
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2 }}
            className="text-3xl leading-none"
            aria-hidden
          >
            👑
          </motion.span>
          <p className="text-sm font-bold leading-snug text-brand-600">
            Nâng cấp lên
            <br />
            Nihongo+ Premium
          </p>
        </div>
        <ul className="mt-3 space-y-2 text-xs text-ink/75">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Check className="size-3.5 shrink-0 text-brand-500" strokeWidth={3} />
              {p}
            </li>
          ))}
        </ul>
        <motion.div whileTap={{ scale: 0.96 }}>
        <Link
          href="/khoa-hoc"
          className="group mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-600"
        >
          Nâng cấp ngay
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
        </motion.div>
      </motion.div>
    </aside>
  );
}
