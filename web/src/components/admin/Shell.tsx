"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Command,
  ExternalLink,
  FileText,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Search,
  Sparkles,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi, useDebounced } from "@/lib/hooks";
import { Logo } from "@/components/ui";
import { SakuraBranch, Pagoda } from "@/components/site";
import { ADMIN_NAV, ADMIN_NAV_SYSTEM, navFor, type NavItem } from "./nav";
import { Avatar, Badge, Dropdown, Spinner, cx } from "./ui";

type SearchHit = { type: string; id: string; title: string; subtitle?: string; href: string };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, isStaff, can, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  // Drawer mobile gắn với đường dẫn lúc mở → tự đóng khi chuyển trang.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const mobileOpen = openAt === path;
  const setMobileOpen = (v: boolean) => setOpenAt(v ? path : null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isStaff)) router.replace(`/admin/dang-nhap?next=${encodeURIComponent(path)}`);
  }, [loading, user, isStaff, router, path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = navFor(path);
  const allowed = can(current?.perm ?? "dashboard.read");

  if (!user || !isStaff)
    return (
      <div className="grid min-h-screen place-items-center bg-[#fffafa]">
        <Spinner className="size-8" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#fffafa]">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] border-r border-ink/[.06] bg-white lg:block">
        <Sidebar can={can} path={path} />
      </aside>

      {/* Sidebar mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[272px] bg-white shadow-2xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 z-10 grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-500" aria-label="Đóng menu">
                <X className="size-4" />
              </button>
              <Sidebar can={can} path={path} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[232px]">
        <Topbar
          title={current?.label ?? "Quản trị"}
          icon={current?.icon}
          onMenu={() => setMobileOpen(true)}
          onSearch={() => setSearchOpen(true)}
          user={user}
          onLogout={async () => {
            await logout();
            router.replace("/admin/dang-nhap");
          }}
        />
        <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-5 sm:px-6">
          {allowed ? (
            children
          ) : (
            <div className="grid place-items-center py-24 text-center">
              <p className="text-4xl">🔒</p>
              <p className="mt-2 font-bold">Bạn chưa được cấp quyền truy cập mục này</p>
              <p className="text-sm text-muted">Liên hệ quản trị viên để được phân quyền.</p>
            </div>
          )}
        </main>
        <AdminFooter />
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Sidebar({ can, path }: { can: (p: string) => boolean; path: string }) {
  const { data: site } = useApi<{ version?: string }>("/public/settings/site");
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <SakuraBranch className="pointer-events-none absolute -left-8 -top-6 w-36 opacity-50" />
      <Link href="/admin" className="relative flex items-center gap-2.5 px-5 pb-4 pt-5">
        <svg viewBox="0 0 56 32" className="h-8 w-12 shrink-0" aria-hidden>
          <circle cx="34" cy="11" r="9" fill="#e5383b" />
          <path d="M2 30 L20 10 L26 16 L30 12 L54 30 Z" fill="#1d1d2b" />
          <path d="M15.5 15 L20 10 L24.5 15 L22 14 L20 16 L18 14 Z" fill="#fff" />
        </svg>
        <span className="min-w-0 leading-tight">
          <span className="flex items-center gap-1.5 text-lg font-extrabold">
            Nihongo<span className="-ml-1.5 text-brand-500">+</span>
            <Badge tone="pink" className="!px-1.5 !text-[10px]">
              Admin
            </Badge>
          </span>
          <span className="block text-[11px] text-muted">Hệ quản trị hệ thống</span>
        </span>
      </Link>
      <nav className="no-scrollbar relative flex-1 overflow-y-auto px-3 pb-40">
        {ADMIN_NAV.filter((n) => can(n.perm)).map((n) => (
          <NavLink key={n.href} item={n} path={path} />
        ))}
        <p className="mb-1 mt-5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted">Hỗ trợ & hệ thống</p>
        {ADMIN_NAV_SYSTEM.filter((n) => can(n.perm)).map((n) => (
          <NavLink key={n.href} item={n} path={path} />
        ))}
      </nav>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-brand-50 via-brand-50/70 to-transparent">
        <SakuraBranch className="absolute -bottom-4 -left-4 w-32 rotate-180 opacity-70" />
        <Pagoda className="absolute bottom-3 right-6 h-16 opacity-50" />
      </div>
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl border border-ink/5 bg-white/90 p-2.5 shadow-sm backdrop-blur">
        <div className="scale-75 origin-left">
          <Logo />
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted">
          v{site?.version ?? "2.5.0"}
          <span className="size-2 rounded-full bg-emerald-500" />
        </span>
      </div>
    </div>
  );
}

function NavLink({ item, path }: { item: NavItem; path: string }) {
  const active = item.href === "/admin" ? path === "/admin" : path === item.href || path.startsWith(item.href + "/");
  const [open, setOpen] = useState(active);
  const Icon = item.icon;
  return (
    <div>
      <div className="relative">
        <Link
          href={item.href}
          className={cx(
            "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
            active ? "text-brand-600" : "text-ink/75 hover:bg-ink/[.03] hover:text-ink",
          )}
        >
          {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-brand-50" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <Icon className="relative size-[18px] shrink-0" />
          <span className="relative flex-1 truncate">{item.label}</span>
        </Link>
        {item.children && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Thu gọn" : "Mở rộng"}
            className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink/40 hover:bg-ink/5"
          >
            <ChevronRight className={cx("size-3.5 transition-transform", open && "rotate-90")} />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {item.children && open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="ml-[22px] border-l border-ink/[.07] py-1 pl-3">
              {item.children.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className={cx("block rounded-lg px-2 py-1.5 text-[12.5px] transition", path === c.href ? "font-semibold text-brand-600" : "text-muted hover:text-ink")}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Topbar({
  title,
  icon: Icon,
  onMenu,
  onSearch,
  user,
  onLogout,
}: {
  title: string;
  icon?: NavItem["icon"];
  onMenu: () => void;
  onSearch: () => void;
  user: { name: string; avatarUrl: string | null; role: string };
  onLogout: () => void;
}) {
  const router = useRouter();
  const canSettings = useAuth().can("settings.read");
  const { data: todo } = useApi<{ total: number }>("/admin/dashboard/todo-count");
  return (
    <header className="sticky top-0 z-30 border-b border-ink/[.06] bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <button onClick={onMenu} className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-500 lg:hidden" aria-label="Mở menu">
          <Menu className="size-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && <Icon className="hidden size-5 text-brand-500 sm:block" />}
          <h1 className="truncate text-lg font-extrabold">{title}</h1>
        </div>

        <button
          onClick={onSearch}
          className="ml-auto hidden h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 text-sm text-muted transition hover:border-brand-200 md:flex"
        >
          <Search className="size-4" />
          <span className="flex-1 truncate text-left">Tìm kiếm học viên, khóa học, đơn hàng…</span>
          <kbd className="flex items-center gap-0.5 rounded-md bg-ink/5 px-1.5 py-0.5 text-[10px] font-semibold">
            <Command className="size-3" />K
          </kbd>
        </button>
        <button onClick={onSearch} className="ml-auto grid size-9 place-items-center rounded-lg text-ink/70 md:hidden" aria-label="Tìm kiếm">
          <Search className="size-5" />
        </button>

        <Link href="/admin#can-xu-ly" className="relative grid size-10 place-items-center rounded-full text-ink/70 transition hover:bg-brand-50 hover:text-brand-500" aria-label="Việc cần xử lý">
          <Bell className="size-5" />
          {!!todo?.total && (
            <span className="absolute right-0.5 top-0.5 grid min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">
              {todo.total > 99 ? "99+" : todo.total}
            </span>
          )}
        </Link>

        <Dropdown
          trigger={
            <button className="hidden h-10 items-center gap-1.5 rounded-lg bg-brand-500 pl-3 pr-2 text-sm font-semibold text-white shadow-md shadow-brand-500/25 sm:flex">
              <Plus className="size-4" /> Tạo mới <span className="ml-1 h-5 w-px bg-white/30" />
              <ChevronDown className="size-4" />
            </button>
          }
          items={[
            { label: "Khóa học", icon: <BookOpen className="size-4" />, onClick: () => router.push("/admin/khoa-hoc/moi") },
            { label: "Bài học", icon: <FileText className="size-4" />, onClick: () => router.push("/admin/bai-hoc?new=1") },
            { label: "Bài tập", icon: <ClipboardList className="size-4" />, onClick: () => router.push("/admin/bai-tap?new=1") },
            { label: "Đề thi bằng AI", icon: <Sparkles className="size-4" />, onClick: () => router.push("/admin/de-thi/ai") },
            { label: "Bài viết blog", icon: <FileText className="size-4" />, onClick: () => router.push("/admin/blog?new=1") },
            { label: "Thông báo", icon: <Megaphone className="size-4" />, onClick: () => router.push("/admin/thong-bao?new=1") },
            { label: "Mã giảm giá", icon: <Tag className="size-4" />, onClick: () => router.push("/admin/ma-giam-gia?new=1") },
          ]}
        />

        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-brand-50">
              <Avatar src={user.avatarUrl} name={user.name} size={36} />
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-sm font-semibold">{user.name}</span>
                <span className="block text-[11px] text-muted">{user.role === "admin" ? "Quản trị viên" : user.role === "teacher" ? "Giáo viên" : "Nhân sự"}</span>
              </span>
              <Badge tone="green" dot className="hidden xl:inline-flex">
                {user.role === "admin" ? "Admin" : "Staff"}
              </Badge>
            </button>
          }
          items={[
            { label: "Hồ sơ của tôi", icon: <UserRound className="size-4" />, onClick: () => router.push(canSettings ? "/admin/cai-dat?tab=profile" : "/tai-khoan") },
            { label: "Xem trang học viên", icon: <ExternalLink className="size-4" />, onClick: () => window.open("/", "_blank") },
            "divider",
            { label: "Đăng xuất", icon: <LogOut className="size-4" />, onClick: onLogout, danger: true },
          ]}
        />
      </div>
    </header>
  );
}

function AdminFooter() {
  const { data: site } = useApi<{ version?: string; adminEmail?: string; hotline?: string }>("/public/settings/site");
  return (
    <footer className="border-t border-ink/[.06] px-4 py-3 text-[11px] text-muted sm:px-6">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Nihongo+. Hệ quản trị nội bộ. Phiên bản v{site?.version ?? "2.5.0"}</span>
        <span className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Hệ thống hoạt động bình thường
          </span>
          <span>Email: {site?.adminEmail ?? "admin@nihongo.vn"}</span>
          <span>Hotline: {site?.hotline ?? "1900 6868"}</span>
        </span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Tìm kiếm toàn cục (⌘K)                                              */
/* ------------------------------------------------------------------ */

function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const router = useRouter();
  const { data, loading } = useApi<{ items: SearchHit[] }>(open && dq.trim().length >= 2 ? `/admin/search?q=${encodeURIComponent(dq.trim())}` : null);
  const groups = useMemo(() => {
    const g: Record<string, SearchHit[]> = {};
    for (const h of data?.items ?? []) (g[h.type] ??= []).push(h);
    return g;
  }, [data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-ink/5 px-4">
              <Search className="size-5 text-muted" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm học viên, khóa học, bài viết, đơn hàng…" className="h-14 flex-1 bg-transparent outline-none" />
              {loading && <Spinner className="size-4" />}
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {dq.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-sm text-muted">Nhập ít nhất 2 ký tự để tìm kiếm</p>
              ) : !loading && !data?.items.length ? (
                <p className="px-3 py-6 text-center text-sm text-muted">Không tìm thấy kết quả cho “{dq}”</p>
              ) : (
                Object.entries(groups).map(([type, hits]) => (
                  <div key={type} className="mb-2">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">{type}</p>
                    {hits.map((h) => (
                      <button
                        key={h.type + h.id}
                        onClick={() => {
                          router.push(h.href);
                          onClose();
                          setQ("");
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-brand-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{h.title}</span>
                          {h.subtitle && <span className="block truncate text-xs text-muted">{h.subtitle}</span>}
                        </span>
                        <ChevronRight className="size-4 text-muted" />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
