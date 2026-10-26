"use client";

import { Suspense, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { motion } from "motion/react";
import { ArrowRight, ChevronDown, ChevronRight, Home } from "lucide-react";
import Header from "./Header";
import { Logo } from "./ui";
import { Petals } from "./Hero";

/* ------------------------------------------------------------------ */
/* Khung trang: header + nội dung + dải CTA + footer gọn               */
/* ------------------------------------------------------------------ */

/** `user`: trang yêu cầu đăng nhập — chưa đăng nhập thì chuyển tới /dang-nhap?next=… */
export function PageShell({
  children,
  user = false,
  cta = true,
}: {
  children: React.ReactNode;
  user?: boolean;
  cta?: boolean;
}) {
  return (
    <>
      {/* Header/RequireAuth đọc usePathname → đặt trong Suspense để không chặn prerender route động. */}
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main className="relative min-h-screen overflow-x-clip">
        <SakuraCorners />
        {user ? (
          <Suspense>
            <RequireAuth>{children}</RequireAuth>
          </Suspense>
        ) : (
          children
        )}
      </main>
      {cta && <CtaStrip />}
      <SiteFooter />
    </>
  );
}

function HeaderFallback() {
  return (
    <div className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:h-[72px]">
        <Logo />
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    // Giữ cả query string (vd ?plan=) khi quay lại sau đăng nhập.
    if (!loading && !user) router.replace(`/dang-nhap?next=${encodeURIComponent(path + window.location.search)}`);
  }, [loading, user, router, path]);
  if (!user)
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24">
        <div className="size-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
      </div>
    );
  return <>{children}</>;
}

/** Cành hoa anh đào ở 2 góc trên + 2 góc dưới như trong ảnh tham chiếu. */
export function SakuraCorners() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 hidden h-64 overflow-hidden lg:block" aria-hidden>
      <SakuraBranch className="absolute -left-6 top-0 w-48 opacity-90" />
      <SakuraBranch className="absolute -right-6 top-0 w-48 -scale-x-100 opacity-90" />
    </div>
  );
}

export function SakuraBranch({ className = "" }: { className?: string }) {
  const blossoms = [
    [30, 22, 9],
    [58, 14, 7],
    [80, 40, 10],
    [44, 52, 8],
    [104, 26, 6],
    [20, 70, 7],
    [70, 76, 9],
    [120, 58, 7],
    [96, 92, 6],
    [40, 100, 8],
  ];
  return (
    <svg viewBox="0 0 160 140" className={className}>
      <path
        d="M-4 6 C 30 20, 60 30, 90 52 S 130 80, 150 70 M40 26 C 50 50, 44 70, 30 96 M80 46 C 90 70, 84 84, 96 110"
        stroke="#7b4a3a"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        opacity=".55"
      />
      {blossoms.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy={-r * 0.55} rx={r * 0.45} ry={r * 0.6} fill="#ffc2cb" transform={`rotate(${a + i * 9})`} />
          ))}
          <circle r={r * 0.22} fill="#f07a8a" />
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Banner đầu trang con: ảnh Phú Sĩ + chùa bên phải, chữ viết tay      */
/* ------------------------------------------------------------------ */

export function PageBanner({
  children,
  aside,
  script = (
    <>
      Tiếng Nhật
      <br />
      mở ra thế giới
      <br />
      mới cho bạn
    </>
  ),
  className = "",
  compact = false,
}: {
  children: React.ReactNode;
  /** Nội dung minh họa đặt giữa (vd: nhân vật, thẻ nổi). */
  aside?: React.ReactNode;
  script?: React.ReactNode | null;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#fff7f6] to-white pt-20 lg:pt-24 ${className}`}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] md:block">
        <Image
          src="https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1600&q=80"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover object-[50%_88%] opacity-90 saturate-[.85] hue-rotate-[-10deg] [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_30%),linear-gradient(to_bottom,black_80%,transparent)]"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-brand-100/50 via-brand-50/20 to-transparent mix-blend-multiply" />
        <Pagoda className="absolute bottom-2 right-[30%] h-[62%] max-h-52 opacity-95 drop-shadow-lg" />
      </div>
      <Petals count={12} />
      {script && (
        <motion.p
          initial={{ opacity: 0, rotate: -10 }}
          animate={{ opacity: 1, rotate: -8 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="absolute right-6 top-20 z-10 hidden text-right font-script text-2xl leading-snug text-ink/80 xl:right-16 xl:block"
        >
          {script}
        </motion.p>
      )}
      <div
        className={`relative mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] ${
          compact ? "pb-6" : "pb-10"
        }`}
      >
        <div className="relative z-10">{children}</div>
        {aside && <div className="relative z-10 hidden lg:block">{aside}</div>}
      </div>
    </section>
  );
}

/** Chùa 5 tầng cách điệu (thay cho ảnh). */
export function Pagoda({ className = "" }: { className?: string }) {
  const tiers = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 120 200" className={className} aria-hidden>
      <rect x="58" y="0" width="4" height="30" fill="#7a2020" />
      {tiers.map((t) => {
        const y = 30 + t * 30;
        const w = 50 + t * 12;
        return (
          <g key={t}>
            <path
              d={`M${60 - w / 2 - 10} ${y + 12} Q60 ${y - 4} ${60 + w / 2 + 10} ${y + 12} L${60 + w / 2} ${y + 8} L${60 - w / 2} ${y + 8} Z`}
              fill="#3b2a2a"
            />
            <rect x={60 - w / 2 + 6} y={y + 12} width={w - 12} height="18" fill="#d63a2f" />
            <rect x={60 - w / 2 + 10} y={y + 15} width={w - 20} height="3" fill="#f5c3a0" opacity=".7" />
          </g>
        );
      })}
      <rect x="30" y="180" width="60" height="20" fill="#9b2b23" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Breadcrumb                                                          */
/* ------------------------------------------------------------------ */

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <Link href="/" className="transition hover:text-brand-500" aria-label="Trang chủ">
        <Home className="size-3.5" />
      </Link>
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <ChevronRight className="size-3" />
          {it.href && i < items.length - 1 ? (
            <Link href={it.href} className="transition hover:text-brand-500">
              {it.label}
            </Link>
          ) : (
            <span className="font-medium text-brand-500">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Dải CTA đỏ + footer 1 hàng như cuối mỗi màn hình tham chiếu         */
/* ------------------------------------------------------------------ */

export function CtaStrip({
  title = "Sẵn sàng chinh phục tiếng Nhật cùng Nihongo+?",
  text = "Hãy bắt đầu hành trình học tập hiệu quả, bài bản và đầy cảm hứng ngay hôm nay!",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="relative mt-12 overflow-hidden bg-gradient-to-r from-brand-100 via-brand-500 to-brand-100">
      <div className="absolute inset-0 bg-gradient-to-r from-[#ffd6d9] via-brand-500 to-[#ffd6d9] opacity-90" />
      <Petals count={8} />
      <svg
        viewBox="0 0 300 80"
        preserveAspectRatio="xMinYMax meet"
        className="pointer-events-none absolute bottom-0 left-0 h-full w-1/3 opacity-60"
        aria-hidden
      >
        <path d="M0 80 L0 60 Q40 52 80 58 L80 80 Z" fill="#b8323a" />
        <g fill="#8c1f26">
          <rect x="40" y="18" width="6" height="40" />
          <path d="M20 20 Q43 10 66 20 L62 26 L24 26 Z" />
          <rect x="22" y="32" width="42" height="4" />
          <rect x="120" y="30" width="30" height="4" />
          <rect x="124" y="34" width="22" height="10" />
          <rect x="116" y="44" width="38" height="4" />
          <rect x="122" y="48" width="26" height="32" />
          <path d="M200 80 L250 40 L262 48 L300 80 Z" opacity=".5" />
        </g>
      </svg>
      <svg
        viewBox="0 0 300 80"
        preserveAspectRatio="xMaxYMax meet"
        className="pointer-events-none absolute bottom-0 right-0 h-full w-1/3 -scale-x-100 opacity-60"
        aria-hidden
      >
        <path d="M0 80 L70 30 L84 40 L160 80 Z" fill="#fff" opacity=".7" />
        <path d="M58 39 L70 30 L82 39 L76 37 L70 42 L64 37 Z" fill="#fff" />
      </svg>
      <div className="relative mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 px-4 py-5 text-center text-white sm:flex-row sm:gap-10 sm:text-left">
        <div>
          <p className="text-lg font-bold">{title}</p>
          <p className="text-xs text-white/85">{text}</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href="/khoa-hoc"
            className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-brand-500 shadow-lg"
          >
            Học thử miễn phí
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

const FOOT_LINKS = ["Về chúng tôi", "Điều khoản sử dụng", "Chính sách bảo mật", "Liên hệ", "Blog", "Câu hỏi thường gặp"];

export const SOCIAL = [
  { n: "Facebook", p: "M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6Z" },
  {
    n: "YouTube",
    p: "M22 12s0-3.3-.4-4.8a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.7 2 12 2 12s0 3.3.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.5.4-4.8.4-4.8ZM10 15V9l5.2 3L10 15Z",
  },
  {
    n: "Instagram",
    p: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2c-2.7 0-3 0-4.1.1C5 2.2 3.2 4 3.1 6.9 3 8 3 8.3 3 12s0 4 .1 5.1c.1 2.9 1.9 4.7 4.8 4.8 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c2.9-.1 4.7-1.9 4.8-4.8.1-1.1.1-1.4.1-5.1s0-4-.1-5.1C20.8 4 19 2.2 16.1 2.1 15 2 14.7 2 12 2Z",
  },
  {
    n: "TikTok",
    p: "M16.5 3c.4 2.2 1.8 3.6 4 3.9v3.2c-1.5 0-2.9-.4-4-1.2v6.3A6 6 0 1 1 10.8 9v3.3a2.8 2.8 0 1 0 2.4 2.8V3h3.3Z",
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 bg-white pb-28 lg:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:justify-between">
        <div className="scale-90">
          <Logo />
        </div>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted">
          {FOOT_LINKS.map((l) => (
            <li key={l}>
              <Link href={l === "Blog" ? "/blog" : "#"} className="transition hover:text-brand-500">
                {l}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          {SOCIAL.map((s) => (
            <motion.a key={s.n} whileHover={{ y: -2 }} href="#" aria-label={s.n} className="text-ink/70 hover:text-brand-500">
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d={s.p} />
              </svg>
            </motion.a>
          ))}
          <button className="ml-2 flex items-center gap-1 rounded-md border border-ink/10 px-2 py-1 text-xs">
            Tiếng Việt <ChevronDown className="size-3" />
          </button>
        </div>
        <p className="text-[11px] text-muted">© 2026 Nihongo+. Tất cả quyền được bảo lưu.</p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Card & badge dùng chung                                             */
/* ------------------------------------------------------------------ */

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-ink/5 bg-white shadow-sm ${className}`} {...props} />;
}

export const LEVEL_TONE: Record<string, string> = {
  N5: "bg-rose-100 text-rose-500",
  N4: "bg-amber-100 text-amber-600",
  N3: "bg-emerald-100 text-emerald-600",
  N2: "bg-sky-100 text-sky-600",
  N1: "bg-violet-100 text-violet-600",
};

export function LevelBadge({ level, className = "" }: { level: string; className?: string }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${LEVEL_TONE[level] ?? "bg-brand-100 text-brand-600"} ${className}`}>
      {level}
    </span>
  );
}
