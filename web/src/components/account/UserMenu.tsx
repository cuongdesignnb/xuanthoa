"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, LayoutDashboard, LayoutGrid, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { avatar } from "@/components/ui";

export type MeSummary = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  level: string | null;
  streak: number;
  xp: number;
  unreadNotifications: number;
  openTickets: number;
};

/** Số thông báo chưa đọc (dùng chung cho chuông và menu). */
export function useMeSummary(enabled: boolean) {
  return useApi<MeSummary>(enabled ? "/me/summary" : null, { dedupeMs: 30_000 });
}

/** Chuông thông báo ở header — chấm đỏ khi có thông báo chưa đọc. */
export function NotificationBell() {
  const { user } = useAuth();
  const { data } = useMeSummary(!!user);
  const n = data?.unreadNotifications ?? 0;
  return (
    <Link
      href="/tai-khoan?tab=notifications"
      aria-label={n ? `Thông báo (${n} chưa đọc)` : "Thông báo"}
      className="relative grid size-10 place-items-center rounded-full text-ink/70 transition hover:bg-brand-50 hover:text-brand-500"
    >
      <Bell className="size-5" />
      {n > 0 && <span className="absolute right-2.5 top-2 size-2 rounded-full bg-brand-500 ring-2 ring-white" />}
    </Link>
  );
}

/** Avatar + tên + menu thả xuống (desktop). */
export default function UserMenu() {
  const { user, isStaff, logout } = useAuth();
  const { data } = useMeSummary(!!user);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open]);

  if (!user) return null;
  const unread = data?.unreadNotifications ?? 0;
  const items = [
    { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { label: "Hồ sơ", href: "/tai-khoan", icon: UserRound },
    { label: "Thông báo", href: "/tai-khoan?tab=notifications", icon: Bell, count: unread },
    ...(isStaff ? [{ label: "Trang quản trị", href: "/admin", icon: LayoutGrid }] : []),
  ];

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-brand-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatarUrl || avatar(user.name)} alt="" className="size-9 rounded-full object-cover ring-2 ring-brand-100" />
        <span className="text-left leading-tight">
          <span className="block max-w-[140px] truncate text-sm font-semibold">{user.name}</span>
          <span className="block text-[11px] text-muted">
            {user.role === "student" ? "Học viên" : user.role === "teacher" ? "Giáo viên" : "Quản trị"}
          </span>
        </span>
        <ChevronDown className={`size-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-ink/5 bg-white py-1.5 shadow-xl shadow-brand-500/10"
          >
            <div className="border-b border-ink/5 px-4 pb-2.5 pt-1.5">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              {data && user.role === "student" && (
                <p className="mt-1 text-[11px] text-muted">
                  🔥 Chuỗi {data.streak} ngày · {data.xp.toLocaleString("vi-VN")} XP
                </p>
              )}
            </div>
            {items.map((it) => (
              <Link
                key={it.label}
                href={it.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-brand-50 hover:text-brand-500"
              >
                <it.icon className="size-4" />
                <span className="flex-1">{it.label}</span>
                {"count" in it && it.count ? (
                  <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">{it.count > 99 ? "99+" : it.count}</span>
                ) : null}
              </Link>
            ))}
            <div className="my-1 h-px bg-ink/5" />
            <button
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await logout();
                router.push("/");
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="size-4" /> Đăng xuất
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
