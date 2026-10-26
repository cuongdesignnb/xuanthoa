"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  ClipboardList,
  Download,
  FileText,
  Infinity as InfinityIcon,
  Laptop,
  Lock,
  Play,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Users,
  FileQuestion,
  Layers,
  Quote,
  SearchX,
} from "lucide-react";
import { Breadcrumb, Card, Pagoda, SakuraBranch } from "../site";
import { Petals } from "../Hero";
import { Reveal, avatar } from "../ui";
import { Torii } from "./art";
import { RichTextView } from "../RichText";
import type { CourseResource } from "./types";
import { api, ApiError, timeAgo, vnd } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { fileSize, fmtK, minutesLabel, mmss, priceOf, teacherAvatar, type CourseDetailData, type LessonRowData } from "./types";

/* ------------------------------------------------------------------ */
/* Hằng số giao diện                                                   */
/* ------------------------------------------------------------------ */

type Kind = "Video" | "Tài liệu" | "Bài tập" | "Mini test";
const KIND_ICON = { Video: PlayCircle, "Tài liệu": FileText, "Bài tập": ClipboardList, "Mini test": FileQuestion } as const;

const MODULE_TONES = [
  { tone: "border-brand-100 bg-brand-50/60", num: "text-brand-500 bg-white" },
  { tone: "border-amber-100 bg-amber-50/50", num: "text-amber-500 bg-white" },
  { tone: "border-emerald-100 bg-emerald-50/50", num: "text-emerald-600 bg-white" },
  { tone: "border-sky-100 bg-sky-50/50", num: "text-sky-600 bg-white" },
  { tone: "border-violet-100 bg-violet-50/50", num: "text-violet-600 bg-white" },
];

const BENEFITS = [
  { t: "Học trọn đời", d: "Truy cập vĩnh viễn", icon: InfinityIcon },
  { t: "Học mọi lúc mọi nơi", d: "Trên web và ứng dụng", icon: Laptop },
  { t: "Tài liệu đầy đủ", d: "PDF, bài tập, flashcard", icon: FileText },
  { t: "Hỗ trợ giải đáp", d: "Cùng giáo viên và cộng đồng", icon: Users },
];

function kindsOf(l: LessonRowData): Kind[] {
  const k: Kind[] = [];
  if (l.hasVideo) k.push("Video");
  if (l.hasDocs) k.push("Tài liệu");
  if (l.hasExercise) k.push("Bài tập");
  if (l.type === "quiz") k.push("Mini test");
  return k;
}

/* ------------------------------------------------------------------ */

export default function CourseDetail({ slug }: { slug: string }) {
  const { data: c, error, loading, reload } = useApi<CourseDetailData>(`/public/courses/${encodeURIComponent(slug)}`);
  const [active, setActive] = useState("tong-quan");

  const tabs = [
    { id: "tong-quan", l: "Tổng quan" },
    { id: "lo-trinh-hoc", l: "Lộ trình học" },
    { id: "tai-lieu", l: "Tài liệu" },
    { id: "danh-gia", l: `Đánh giá (${fmtK(c?.ratingCount ?? 0)})` },
  ];

  useEffect(() => {
    const ids = ["tong-quan", "lo-trinh-hoc", "tai-lieu", "danh-gia"];
    const onScroll = () => {
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 170) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [c]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = id === "tong-quan" ? 0 : el.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (loading) return <DetailSkeleton />;
  if (error || !c)
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 pt-24 text-center">
        <div>
          <SearchX className="mx-auto size-12 text-brand-300" />
          <p className="mt-3 text-lg font-bold">{error?.status === 404 ? "Không tìm thấy khóa học" : "Không tải được khóa học"}</p>
          <p className="mt-1 text-sm text-muted">{error?.status === 404 ? "Khóa học có thể đã bị ẩn hoặc đổi đường dẫn." : error?.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            {error?.status !== 404 && (
              <button onClick={() => reload()} className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-500">
                Thử lại
              </button>
            )}
            <Link href="/khoa-hoc" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
              Xem khóa học khác
            </Link>
          </div>
        </div>
      </div>
    );

  return (
    <>
      <Hero c={c} />

      {/* Tabs dính */}
      <div className="sticky top-16 z-30 border-b border-ink/5 bg-white/90 backdrop-blur lg:top-[72px]">
        <div className="no-scrollbar mx-auto flex max-w-7xl snap-x gap-2 overflow-x-auto px-4 sm:px-6 lg:gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`relative shrink-0 snap-start px-4 py-3.5 text-sm font-medium transition-colors ${
                active === t.id ? "text-brand-500" : "text-ink/80 hover:text-brand-500"
              }`}
            >
              {t.l}
              {active === t.id && <motion.span layoutId="detail-tab" className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-brand-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-10">
          {c.description && (
            <section>
              <h2 className="text-xl font-extrabold sm:text-2xl">Giới thiệu khóa học</h2>
              <RichTextView html={c.description} className="mt-3 text-sm" />
            </section>
          )}
          <Modules c={c} />
          <Materials c={c} />
          <Reviews c={c} />
        </div>
        <aside className="no-scrollbar lg:sticky lg:top-[132px] lg:max-h-[calc(100vh-144px)] lg:self-start lg:overflow-y-auto lg:pb-2">
          <Sidebar c={c} />
        </aside>
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="aspect-[16/10] animate-pulse rounded-2xl bg-brand-50" />
        <div className="space-y-3">
          <div className="h-5 w-40 animate-pulse rounded bg-ink/[.06]" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-ink/[.06]" />
          <div className="h-4 w-full animate-pulse rounded bg-ink/[.06]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-ink/[.06]" />
          <div className="h-12 w-1/2 animate-pulse rounded bg-ink/[.06]" />
        </div>
      </div>
      <div className="mt-10 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/[.04]" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hành động đăng ký / vào học                                         */
/* ------------------------------------------------------------------ */

function useEnroll(c: CourseDetailData) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const learnHref = `/hoc/${c.resumeLesson?.slug ?? c.modules[0]?.lessons[0]?.slug ?? ""}`;
  const checkoutHref = `/thanh-toan?course=${c.slug}`;
  const free = c.effectivePrice === 0;

  const enroll = async () => {
    if (c.canLearn) return router.push(learnHref);
    if (!free) return router.push(checkoutHref);
    if (!user) return router.push(`/dang-nhap?next=${encodeURIComponent(`/khoa-hoc/${c.slug}`)}`);
    setBusy(true);
    setErr(null);
    try {
      await api(`/me/courses/${c.id}/enroll`, { method: "POST" });
      invalidate(`/public/courses/${c.slug}`);
      invalidate("/me/courses");
      router.push(learnHref);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Không đăng ký được, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };
  const label = c.canLearn ? (c.progress && c.progress.completed > 0 ? "Tiếp tục học" : "Vào học") : free ? "Đăng ký miễn phí" : "Đăng ký khóa học";
  return { enroll, busy, err, label, learnHref };
}

/* ------------------------------------------------------------------ */

function Hero({ c }: { c: CourseDetailData }) {
  const { enroll, busy, label, err } = useEnroll(c);
  const t = c.teacher;
  const trialHref = c.firstFreeLesson ? `/hoc/${c.firstFreeLesson.slug}` : null;
  const titleMain = c.title.split(/\s[-–]\s/)[0];
  const lessons = c.modules.reduce((s, m) => s + m.lessons.length, 0);
  const hours = Math.max(1, Math.round(c.totalDurationSec / 3600)) || c.durationHours;

  return (
    <section id="tong-quan" className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#fff7f6] to-white pb-6 pt-20 lg:pt-24">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] md:block">
        <Image
          src="https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1600&q=80"
          alt=""
          fill
          priority
          sizes="45vw"
          className="object-cover object-[50%_88%] opacity-90 saturate-[.8] [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_45%),linear-gradient(to_bottom,black_80%,transparent)]"
        />
        <Pagoda className="absolute right-[18%] top-24 h-40 opacity-80" />
      </div>
      <Petals count={10} />
      <motion.p
        initial={{ opacity: 0, rotate: -12 }}
        animate={{ opacity: 1, rotate: -8 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="absolute right-6 top-20 z-10 hidden text-right font-script text-2xl leading-snug text-ink/80 xl:right-16 xl:block"
      >
        Tiếng Nhật
        <br />
        mở ra thế giới
        <br />
        mới cho bạn
      </motion.p>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <Breadcrumb items={[{ label: "Khóa học", href: "/khoa-hoc" }, { label: c.title }]} />

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr] lg:gap-8 [&>*]:min-w-0">
          <VideoThumb c={c} titleMain={titleMain} trialHref={trialHref} />

          <div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-2 py-1 text-[10px] font-bold uppercase text-brand-600"
            >
              <span className="h-2.5 w-1 rounded-sm bg-brand-500" /> Khóa học tiếng Nhật online
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[2.1rem]"
            >
              {c.title}
            </motion.h1>
            {c.subtitle && c.subtitle !== c.title && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-2 max-w-xl text-sm leading-relaxed text-muted"
              >
                {c.subtitle}
              </motion.p>
            )}

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px] xl:items-end [&>*]:min-w-0">
              <div>
                <div className="grid grid-cols-2 gap-y-3 sm:flex sm:flex-wrap sm:divide-x sm:divide-ink/10">
                  {[
                    { icon: <Star className="size-6 fill-amber-400 text-amber-400" />, a: `${c.rating}/5`, b: `(${fmtK(c.ratingCount)} đánh giá)` },
                    { icon: <BookOpen className="size-6 text-brand-500" />, a: `${lessons} bài học`, b: "Video + bài tập" },
                    { icon: <Clock className="size-6 text-brand-500" />, a: c.weeks ? `${c.weeks} tuần` : `${hours} giờ`, b: `(${c.durationHours || hours} giờ học)` },
                    { icon: <BarChart3 className="size-6 text-brand-500" />, a: c.level ?? "Mọi cấp", b: "Trình độ" },
                  ].map((s, i) => (
                    <motion.div
                      key={s.b}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.06 }}
                      className="flex items-center gap-2 sm:px-4 sm:first:pl-0"
                    >
                      {s.icon}
                      <span className="leading-tight">
                        <b className="block text-sm">{s.a}</b>
                        <span className="text-[11px] text-muted">{s.b}</span>
                      </span>
                    </motion.div>
                  ))}
                </div>
                {t && (
                  <Link href={`/giao-vien?gv=${t.slug}`} className="mt-5 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={teacherAvatar(t, avatar)} alt={t.name} className="size-14 rounded-full border-2 border-white shadow" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                        {t.name}
                        <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">Giáo viên chính</span>
                      </p>
                      <p className="text-[11px] text-muted">{t.yearsExp}+ năm kinh nghiệm giảng dạy tiếng Nhật</p>
                      {t.skills.length > 0 && <p className="text-[11px] text-muted">Chuyên {t.skills.slice(0, 3).join(", ")}</p>}
                    </div>
                  </Link>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {trialHref && !c.canLearn && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href={trialHref}
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-brand-500 bg-white py-3 text-sm font-semibold text-brand-500 transition hover:bg-brand-50"
                    >
                      <Play className="size-4 fill-current" /> Học thử bài đầu
                    </Link>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={trialHref && !c.canLearn ? "" : "sm:col-span-2 xl:col-span-1"}>
                  <button
                    onClick={enroll}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 disabled:opacity-60"
                  >
                    {c.canLearn ? <PlayCircle className="size-4" /> : <ShoppingCart className="size-4" />} {busy ? "Đang xử lý…" : label}
                  </button>
                </motion.div>
                {err && <p className="text-xs text-red-500 sm:col-span-2 xl:col-span-1">{err}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VideoThumb({ c, titleMain, trialHref }: { c: CourseDetailData; titleMain: string; trialHref: string | null }) {
  const cover = c.coverStyle;
  const seed = cover?.seed ?? c.teacher?.avatarSeed ?? "Yuki";
  const big = c.level ?? "";
  const script = titleMain.replace(big, "").trim() || "Tiếng Nhật";
  const tagline = c.subtitle && c.subtitle.length < 40 ? c.subtitle : null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="group relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-[#ffe1e6] via-[#fff3f4] to-[#ffd3da] shadow-xl shadow-brand-500/10"
    >
      {c.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.coverUrl} alt={c.title} className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <SakuraBranch className="absolute -left-4 -top-6 w-40" />
          <SakuraBranch className="absolute -bottom-10 left-1/3 w-32 rotate-180 opacity-80" />
          <svg viewBox="0 0 200 60" className="absolute left-[14%] top-[34%] w-1/2 opacity-60" aria-hidden>
            <path d="M0 60 L80 12 Q100 2 120 12 L200 60 Z" fill="#c9d6ea" />
            <path d="M66 20 L80 12 Q100 2 120 12 L134 20 L118 18 L100 24 L84 18 Z" fill="#fff" />
          </svg>
          <Torii className="absolute bottom-0 left-[4%] w-[30%]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar(seed, "ffd6dc")}
            alt={c.teacher?.name ?? ""}
            className="absolute -bottom-4 right-0 h-[105%] w-auto object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <span className="absolute bottom-6 right-[12%] rotate-6 rounded bg-[#fff7e8] px-3 py-2 font-jp text-[11px] font-bold shadow-md">がんばろう!</span>
          <div className="absolute left-[8%] top-[14%] max-w-[55%] -rotate-6">
            <p className="line-clamp-2 font-script text-3xl font-bold text-brand-600 drop-shadow-[0_2px_0_#fff] sm:text-4xl">{script}</p>
            {big && <p className="text-6xl font-black leading-none text-brand-500 drop-shadow-[0_3px_0_#fff] sm:text-7xl">{big}</p>}
            {tagline && <p className="mt-1 font-script text-base font-bold text-brand-700 sm:text-lg">{tagline}</p>}
          </div>
          <span className="absolute bottom-[18%] left-[38%] -rotate-6 rounded-lg bg-white/95 px-2.5 py-1.5 font-jp text-[11px] font-bold leading-tight shadow">
            一歩ずつ、
            <br />
            きっとできる!
          </span>
        </>
      )}
      {trialHref && (
        <Link href={trialHref} aria-label="Xem bài học thử" className="absolute left-1/2 top-[38%] grid -translate-x-1/2 -translate-y-1/2 place-items-center">
          <motion.span
            className="absolute size-16 rounded-full bg-white/60"
            animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
          <motion.span whileHover={{ scale: 1.12 }} className="relative grid size-16 place-items-center rounded-full bg-white shadow-xl">
            <Play className="ml-1 size-7 fill-brand-500 text-brand-500" />
          </motion.span>
        </Link>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function Modules({ c }: { c: CourseDetailData }) {
  const [open, setOpen] = useState<boolean[]>(() => c.modules.map((_, i) => i === 0));
  const anyOpen = open.some(Boolean);
  const total = c.modules.reduce((s, m) => s + m.lessons.length, 0);
  return (
    <section id="lo-trinh-hoc" className="scroll-mt-36">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">Lộ trình học chi tiết</h2>
          <p className="mt-1 text-xs text-muted">
            {total} bài học trong {c.modules.length} chương, tổng thời lượng {minutesLabel(c.totalDurationSec)}.
          </p>
        </div>
        {c.modules.length > 0 && (
          <button onClick={() => setOpen(c.modules.map(() => !anyOpen))} className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-500">
            {anyOpen ? "Thu gọn tất cả" : "Mở rộng tất cả"}
            {anyOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        )}
      </div>
      {!c.modules.length && <p className="rounded-xl border border-dashed border-ink/10 p-6 text-center text-sm text-muted">Chương trình học đang được cập nhật.</p>}
      <div className="space-y-3">
        {c.modules.map((m, i) => {
          const tone = MODULE_TONES[i % MODULE_TONES.length];
          return (
            <Reveal key={m.id} delay={Math.min(i, 5) * 0.05} y={16}>
              <div className={`overflow-hidden rounded-xl border ${tone.tone}`}>
                <button
                  onClick={() => setOpen((o) => o.map((v, j) => (j === i ? !v : v)))}
                  aria-expanded={open[i]}
                  className="flex w-full items-center gap-4 p-3 text-left sm:p-4"
                >
                  <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-xl font-extrabold shadow-sm ${tone.num}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold sm:text-base">
                      <span className={tone.num.split(" ")[0]}>Module {i + 1}:</span> {m.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted sm:text-xs">
                      {m.lessons.length} bài học • {minutesLabel(m.durationSec)}
                      {c.progress && <> • {m.completed}/{m.lessons.length} hoàn thành</>}
                      {m.description && <span className="hidden sm:inline"> • {m.description}</span>}
                    </span>
                  </span>
                  <motion.span
                    animate={{ rotate: open[i] ? 180 : 0 }}
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-ink/10 bg-white text-ink/70"
                  >
                    <ChevronDown className="size-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open[i] && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <ul className="divide-y divide-ink/5 border-t border-ink/5 bg-white px-3 sm:px-4">
                        {m.lessons.map((l, j) => (
                          <LessonRow key={l.id} l={l} n={j + 1} locked={!c.canLearn && !l.isFree} />
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function LessonRow({ l, n, locked }: { l: LessonRowData; n: number; locked: boolean }) {
  return (
    <li>
      <Link href={`/hoc/${l.slug}`} className="group flex items-center gap-3 py-2.5 text-xs">
        <span
          className={`grid size-6 shrink-0 place-items-center rounded-full transition ${
            l.isFree ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500 group-hover:bg-brand-500 group-hover:text-white"
          }`}
        >
          {locked ? <Lock className="size-3" /> : <Play className="ml-px size-3 fill-current" />}
        </span>
        <span className="w-10 shrink-0 font-semibold">Bài {n}</span>
        <span className="min-w-0 flex-1 truncate group-hover:text-brand-500">
          {l.title}
          {l.isFree && <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">Học thử</span>}
        </span>
        <span className="hidden w-12 shrink-0 text-muted sm:block">{mmss(l.durationSec)}</span>
        <span className="hidden w-64 shrink-0 gap-4 text-muted md:flex">
          {kindsOf(l)
            .slice(0, 3)
            .map((k) => {
              const I = KIND_ICON[k];
              return (
                <span key={k} className="flex w-[4.5rem] items-center gap-1.5">
                  <I className="size-3.5" /> {k}
                </span>
              );
            })}
        </span>
        {l.completed ? (
          <CheckCircle2 className="size-5 shrink-0 fill-emerald-500 text-white" />
        ) : (
          <Circle className="size-5 shrink-0 text-ink/15" />
        )}
      </Link>
    </li>
  );
}

function Reviews({ c }: { c: CourseDetailData }) {
  const items = c.reviews.items;
  return (
    <section id="danh-gia" className="scroll-mt-36">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">Đánh giá từ học viên</h2>
          <p className="mt-1 text-xs text-muted">
            {fmtK(c.studentCount)} học viên đã và đang học · điểm trung bình {c.reviews.count ? c.reviews.avg : c.rating}/5
          </p>
        </div>
      </div>
      {!items.length && <p className="rounded-xl border border-dashed border-ink/10 p-6 text-center text-sm text-muted">Chưa có đánh giá nào cho khóa học này.</p>}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {items.map((r, i) => (
          <Reveal key={r.id} delay={Math.min(i, 5) * 0.08} className="w-[80%] shrink-0 snap-start md:w-auto">
            <motion.div whileHover={{ y: -4 }} className="relative h-full rounded-2xl border border-ink/5 bg-white p-4 shadow-sm">
              <Quote className="absolute right-4 top-4 size-6 fill-brand-100 text-brand-100" />
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.avatarUrl || avatar(r.authorName, ["fde68a", "bfdbfe", "fbcfe8"][i % 3])} alt="" className="size-11 rounded-full" />
                <div>
                  <p className="text-sm font-bold">{r.authorName}</p>
                  <p className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, k) => (
                      <Star key={k} className={`size-3 ${k < r.rating ? "fill-amber-400 text-amber-400" : "text-ink/15"}`} />
                    ))}
                    <span className="ml-1.5 text-[10px] text-muted">{timeAgo(r.createdAt)}</span>
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink/80">“{r.content}”</p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ResourceRow({ m, i }: { m: CourseResource; i: number }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-ink/5 bg-white p-3 shadow-sm transition hover:border-brand-200">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500">
        {i % 2 ? <Layers className="size-5" /> : <FileText className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{m.title}</span>
        <span className="block text-[11px] text-muted">
          {m.fileType} • {fileSize(m.sizeBytes)}
          {m.isFree && <span className="ml-1 font-semibold text-emerald-600">• Miễn phí</span>}
        </span>
      </span>
      {m.fileUrl ? (
        <a
          href={m.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="grid size-8 place-items-center rounded-full text-muted transition group-hover:bg-brand-500 group-hover:text-white"
          title="Tải về"
          aria-label={`Tải ${m.title}`}
        >
          <Download className="size-4" />
        </a>
      ) : (
        <span className="grid size-8 place-items-center rounded-full text-muted" title="Tải về sau khi đăng ký">
          <Lock className="size-4" />
        </span>
      )}
    </div>
  );
}

function Materials({ c }: { c: CourseDetailData }) {
  const groups = c.lessonResources ?? [];
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? groups : groups.slice(0, 4);
  const total = c.resources.length + groups.reduce((s, g) => s + g.items.length, 0);
  const locked = !c.canLearn && total > 0;
  return (
    <section id="tai-lieu" className="scroll-mt-36">
      <h2 className="text-xl font-extrabold sm:text-2xl">Tài liệu khóa học</h2>
      <p className="mt-1 text-xs text-muted">
        {total
          ? `${total} tài liệu (PDF, bài tập, flashcard). ${locked ? "Tài liệu miễn phí tải ngay; phần còn lại mở sau khi đăng ký." : "Có thể tải về học offline."}`
          : "Khóa học chưa có tài liệu đính kèm."}
      </p>

      {!total && (
        <div className="mt-4 rounded-xl border border-dashed border-ink/10 bg-white/60 p-6 text-center text-sm text-muted">
          <FileText className="mx-auto mb-2 size-6 text-brand-300" />
          Tài liệu sẽ được giáo viên cập nhật trong quá trình học.
        </div>
      )}

      {c.resources.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Tài liệu chung</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {c.resources.map((m, i) => (
              <Reveal key={m.id} delay={i * 0.05} y={12}>
                <ResourceRow m={m} i={i} />
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Theo bài học</p>
          <div className="space-y-3">
            {shown.map((g) => (
              <div key={g.lessonId} className="rounded-2xl border border-ink/5 bg-white/70 p-3">
                <Link href={`/hoc/${g.lessonSlug}`} className="mb-2 flex items-center gap-2 text-sm font-semibold hover:text-brand-500">
                  <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-500">Bài {g.lessonNumber}</span>
                  <span className="truncate">{g.lessonTitle}</span>
                </Link>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.items.map((m, i) => (
                    <ResourceRow key={m.id} m={m} i={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {groups.length > 4 && (
            <button onClick={() => setShowAll((x) => !x)} className="mt-3 text-sm font-semibold text-brand-500 hover:underline">
              {showAll ? "Thu gọn" : `Xem thêm tài liệu của ${groups.length - 4} bài`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function TargetArt() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 sm:w-20" aria-hidden>
      {[30, 22, 14, 6].map((r, i) => (
        <circle key={r} cx="36" cy="44" r={r} fill={i % 2 ? "#fff" : "#f8a5ad"} stroke="#f07a8a" strokeWidth="1.5" />
      ))}
      <path d="M36 44 L70 10" stroke="#a16207" strokeWidth="3" strokeLinecap="round" />
      <path d="M64 6 L76 4 L74 16 Z" fill="#f59e0b" />
    </svg>
  );
}

function Sidebar({ c }: { c: CourseDetailData }) {
  const p = c.progress;
  return (
    <div className="space-y-4">
      {p && c.canLearn && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="font-bold">Tiến độ học tập</p>
            <Link href="/dashboard" className="group flex items-center gap-1 text-xs font-medium text-brand-500">
              Xem chi tiết <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-2xl font-extrabold text-emerald-500">{p.percent}%</span>
            <span className="text-xs text-muted">
              Đã hoàn thành {p.completed}/{p.total} bài học
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/5">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${p.percent}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            />
          </div>
        </Card>
      )}

      {c.outcomes.length > 0 && (
        <Card className="relative overflow-hidden p-4">
          <p className="font-bold">Bạn sẽ học được gì?</p>
          <div className="mt-3 flex gap-2">
            <ul className="flex-1 space-y-2.5 pr-16">
              {c.outcomes.map((o, i) => (
                <motion.li
                  key={o}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-2 text-xs text-ink/80"
                >
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-2.5" strokeWidth={4} />
                  </span>
                  {o}
                </motion.li>
              ))}
            </ul>
            <motion.div className="absolute right-3 top-10" animate={{ rotate: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
              <TargetArt />
            </motion.div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <p className="font-bold">Lợi ích khóa học</p>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
          {BENEFITS.map((b) => (
            <motion.div key={b.t} whileHover={{ y: -2 }} className="flex items-start gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
                <b.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold">{b.t}</span>
                <span className="block text-[11px] leading-snug text-muted">{b.d}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </Card>

      <PriceCard c={c} />
    </div>
  );
}

function PriceCard({ c }: { c: CourseDetailData }) {
  const { enroll, busy, label, err } = useEnroll(c);
  const [now, setNow] = useState<number | null>(null);
  const end = c.saleEndsAt ? new Date(c.saleEndsAt).getTime() : null;

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = end ? window.setInterval(tick, 1000) : undefined;
    return () => {
      window.clearTimeout(first);
      if (id) window.clearInterval(id);
    };
  }, [end]);

  const pr = priceOf(c, now ?? undefined);
  const left = end && now ? Math.max(0, end - now) : 0;
  const showCountdown = !!end && !!pr.original && left > 0;
  const s = Math.floor(left / 1000);
  const parts = [
    { v: Math.floor(s / 86400), l: "Ngày" },
    { v: Math.floor((s % 86400) / 3600), l: "Giờ" },
    { v: Math.floor((s % 3600) / 60), l: "Phút" },
    { v: s % 60, l: "Giây" },
  ];
  const save = pr.original ? Math.round((1 - pr.price / pr.original) * 100) : 0;

  return (
    <Card id="dang-ky" className="scroll-mt-36 p-4">
      {c.canLearn ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="size-4" /> Bạn đã sở hữu khóa học này
        </div>
      ) : (
        <>
          {(showCountdown || pr.original) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="relative rounded-r-full rounded-tl-lg bg-brand-500 py-1.5 pl-3 pr-5 text-xs font-bold text-white shadow-md shadow-brand-500/30">
                Ưu đãi hôm nay
              </span>
              {showCountdown && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">Kết thúc sau:</span>
                  {parts.map((p) => (
                    <span key={p.l} className="text-center">
                      <span className="relative block h-7 w-8 overflow-hidden rounded-md bg-brand-50 text-sm font-extrabold leading-7 text-brand-500">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={p.v}
                            initial={{ y: -16, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 16, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="block"
                          >
                            {String(p.v).padStart(2, "0")}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                      <span className="text-[9px] text-muted">{p.l}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="text-3xl font-extrabold">{pr.free ? "Miễn phí" : vnd(pr.price)}</span>
            {!pr.free && <span className="pb-1 text-sm font-semibold">/ khóa</span>}
            {pr.original && <span className="pb-1 text-sm text-muted line-through">{vnd(pr.original)}</span>}
            {save > 0 && (
              <motion.span
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="mb-1 ml-auto rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-500"
              >
                Tiết kiệm {save}%
              </motion.span>
            )}
          </div>
        </>
      )}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={enroll}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-colors hover:bg-brand-600 disabled:opacity-60"
      >
        {c.canLearn ? <PlayCircle className="size-4" /> : <ShoppingCart className="size-4" />} {busy ? "Đang xử lý…" : label}
      </motion.button>
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-brand-500" /> Thanh toán an toàn
        </span>
        <span className="flex items-center gap-1">
          <PlayCircle className="size-3.5 text-brand-500" /> Học ngay sau khi đăng ký
        </span>
        <span className="flex items-center gap-1">
          <RotateCcw className="size-3.5 text-brand-500" /> Hoàn tiền 7 ngày
        </span>
      </div>
    </Card>
  );
}
