"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  ChevronRight,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Map,
  Menu,
  NotebookPen,
  Newspaper,
  PlayCircle,
  Search,
  Tags,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Logo, avatar } from "./ui";
import { useAuth } from "@/lib/auth";
import UserMenu, { NotificationBell } from "./account/UserMenu";

const NAV = [
  { label: "Khóa học", href: "/khoa-hoc", icon: BookOpen },
  { label: "Lộ trình", href: "/khoa-hoc#lo-trinh", icon: Map },
  { label: "Bài tập", href: "/bai-tap", icon: NotebookPen },
  { label: "Chủ đề", href: "/bai-tap#chu-de", icon: Tags },
  { label: "Giáo viên", href: "/giao-vien", icon: Users },
  { label: "Blog", href: "/blog", icon: Newspaper },
];

type IsActive = (href: string) => boolean;

function useActive(): IsActive {
  const path = usePathname();
  return (href) => {
    if (href.includes("#")) return false;
    return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  };
}

/** Hiển thị trạng thái đăng nhập thật (chuông + avatar) hoặc nút Đăng nhập / Học thử. */
export default function Header() {
  const auth = useAuth();
  const me = auth.user;
  const user = !!me;
  const meAvatar = me?.avatarUrl || avatar(me?.name ?? "Minh Anh");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isActive = useActive();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled ? "bg-white/85 shadow-[0_6px_30px_-12px_rgba(229,56,59,.25)] backdrop-blur-lg" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[72px]">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => {
              const active = isActive(n.href);
              return (
                <Link
                  key={n.label}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-brand-500 ${
                    active ? "text-brand-500" : "text-ink/80"
                  }`}
                >
                  {n.label}
                  <span
                    className={`absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded bg-brand-500 transition-transform group-hover:scale-x-100 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              aria-label="Tìm kiếm"
              className="grid size-10 place-items-center rounded-full text-ink/70 transition hover:bg-brand-50 hover:text-brand-500"
            >
              <Search className="size-5" />
            </button>
            {user ? (
              <>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Link
                  href="/dang-nhap"
                  className="hidden rounded-lg border border-ink/10 bg-white px-4 py-2 text-sm font-semibold transition hover:border-brand-300 sm:inline-block"
                >
                  Đăng nhập
                </Link>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="hidden sm:block">
                  <Link
                    href="/khoa-hoc"
                    className="inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30"
                  >
                    Học thử miễn phí
                  </Link>
                </motion.div>
              </>
            )}
            <button
              aria-label="Mở menu"
              onClick={() => setOpen(true)}
              className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-500 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </motion.header>

      <MobileDrawer open={open} onClose={() => setOpen(false)} isActive={isActive} user={user} name={me?.name ?? ""} avatarUrl={meAvatar} streak={me?.streak ?? 0} onLogout={auth.logout} isStaff={auth.isStaff} />
      <MobileBottomBar onMenu={() => setOpen(true)} isActive={isActive} />
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
  isActive,
  user,
  name,
  avatarUrl,
  streak,
  onLogout,
  isStaff,
}: {
  open: boolean;
  onClose: () => void;
  isActive: IsActive;
  user: boolean;
  name: string;
  avatarUrl: string;
  streak: number;
  onLogout: () => Promise<void>;
  isStaff: boolean;
}) {
  const items = user
    ? [
        { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
        ...(isStaff ? [{ label: "Trang quản trị", href: "/admin", icon: LayoutGrid }] : []),
        ...NAV,
      ]
    : NAV;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl lg:hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 to-white px-5 pb-6 pt-5">
              <span className="pointer-events-none absolute -right-4 -top-6 font-jp text-[120px] leading-none text-brand-500/10">
                桜
              </span>
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  aria-label="Đóng menu"
                  onClick={onClose}
                  className="grid size-10 place-items-center rounded-full bg-white text-ink shadow"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                {user ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-11 rounded-full ring-2 ring-brand-100" />
                ) : (
                  <div className="grid size-11 place-items-center rounded-full bg-brand-100 text-brand-500">
                    <UserRound className="size-5" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{user ? name : "Chào bạn mới!"}</p>
                  <p className="text-xs text-muted">{user ? `Chuỗi ${streak} ngày 🔥` : "Đăng nhập để lưu tiến độ học"}</p>
                </div>
                {user ? (
                  <button
                    onClick={async () => {
                      await onLogout();
                      onClose();
                    }}
                    className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-semibold"
                  >
                    Đăng xuất
                  </button>
                ) : (
                  <Link
                    href="/dang-nhap"
                    onClick={onClose}
                    className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            </div>

            <nav className="flex-1 px-3 py-4">
              {items.map((n, i) => (
                <motion.div
                  key={n.label}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                >
                  <Link
                    href={n.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3.5 font-medium transition hover:bg-brand-50 ${
                      isActive(n.href) ? "bg-brand-50 text-brand-500" : ""
                    }`}
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-500">
                      <n.icon className="size-[18px]" />
                    </span>
                    <span className="flex-1">{n.label}</span>
                    <ChevronRight className="size-4 text-muted" />
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="space-y-3 border-t border-ink/5 p-5">
              <Link
                href="/khoa-hoc"
                onClick={onClose}
                className="block rounded-xl bg-brand-500 py-3 text-center font-semibold text-white shadow-lg shadow-brand-500/30"
              >
                Học thử miễn phí
              </Link>
              <p className="text-center text-xs text-muted">Hotline: 1900 6868 · hotro@nihongo.plus</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const BAR = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Khóa học", href: "/khoa-hoc", icon: BookOpen },
  { label: "Học thử", href: "/hoc-thu", icon: PlayCircle, primary: true },
  { label: "Bài tập", href: "/bai-tap", icon: LayoutGrid },
];

function MobileBottomBar({ onMenu, isActive }: { onMenu: () => void; isActive: IsActive }) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.4, type: "spring", damping: 22 }}
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-ink/5 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_10px_40px_-10px_rgba(29,29,43,.35)] backdrop-blur-lg lg:hidden"
      aria-label="Điều hướng nhanh"
    >
      <ul className="grid grid-cols-5 items-end">
        {BAR.map((b) => (
          <li key={b.label}>
            <Link
              href={b.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium active:scale-95 ${
                isActive(b.href) && !b.primary ? "text-brand-500" : "text-ink/70"
              }`}
            >
              {b.primary ? (
                <motion.span
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2.2 }}
                  className="-mt-7 mb-0.5 grid size-12 place-items-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/40 ring-4 ring-white"
                >
                  <b.icon className="size-6" />
                </motion.span>
              ) : (
                <b.icon className="size-5" />
              )}
              <span className={b.primary ? "font-semibold text-brand-500" : ""}>{b.label}</span>
            </Link>
          </li>
        ))}
        <li>
          <button
            onClick={onMenu}
            className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink/70"
          >
            <Menu className="size-5" />
            Menu
          </button>
        </li>
      </ul>
    </motion.nav>
  );
}
