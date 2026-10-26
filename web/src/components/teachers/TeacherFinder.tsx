"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Heart,
  LayoutGrid,
  Loader2,
  MessagesSquare,
  Search,
  SearchX,
  Star,
  User,
} from "lucide-react";
import { Reveal } from "../ui";
import { badgeLabel, teacherAvatar, type FilterId, type SortId, type Teacher } from "./types";
import { ProfileModal, TrialModal } from "./TeacherModals";
import { api, type Paged } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

const FILTERS: { id: FilterId; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "Tất cả", icon: <LayoutGrid className="size-[18px]" /> },
  { id: "native", label: "Bản ngữ", icon: <User className="size-[18px]" /> },
  { id: "jlpt", label: "JLPT", icon: <FileText className="size-[18px] text-brand-500" /> },
  { id: "giao-tiep", label: "Giao tiếp", icon: <MessagesSquare className="size-[18px] text-violet-500" /> },
  { id: "kanji", label: "Kanji", icon: <BookOpen className="size-[18px] text-brand-500" /> },
  { id: "n5n3", label: "N5 - N3", icon: <BarChart3 className="size-[18px] text-brand-500" /> },
  { id: "n2n1", label: "N2 - N1", icon: <BarChart3 className="size-[18px] text-sky-500" /> },
];

const SORTS: { id: SortId; label: string }[] = [
  { id: "popular", label: "Phổ biến nhất" },
  { id: "rating", label: "Đánh giá cao nhất" },
  { id: "experience", label: "Nhiều kinh nghiệm nhất" },
  { id: "name", label: "Tên A → Z" },
];

const PAGE = 6;
type TeacherPage = Paged<Teacher> & { all: number };

const listPath = (filter: FilterId, q: string, sort: SortId, page: number) => {
  const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE), sort });
  if (filter !== "all") p.set("filter", filter);
  if (q) p.set("q", q);
  return `/public/teachers?${p}`;
};

/** Yêu thích giáo viên (bookmarks) — chỉ khi đã đăng nhập. */
function useFavorites() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, mutate } = useApi<{ ids: string[] }>(user ? "/me/teacher-favorites" : null);
  const ids = new Set(data?.ids ?? []);
  const toggle = async (id: string) => {
    if (!user) {
      router.push(`/dang-nhap?next=${encodeURIComponent("/giao-vien")}`);
      return;
    }
    const on = !ids.has(id);
    mutate((d) => ({ ids: on ? [...(d?.ids ?? []), id] : (d?.ids ?? []).filter((x) => x !== id) }));
    try {
      await api(`/me/teacher-favorites/${id}`, { method: on ? "POST" : "DELETE" });
    } catch {
      mutate((d) => ({ ids: on ? (d?.ids ?? []).filter((x) => x !== id) : [...(d?.ids ?? []), id] }));
    }
  };
  return { has: (id: string) => ids.has(id), toggle };
}

export default function TeacherFinder() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("popular");
  const [sortOpen, setSortOpen] = useState(false);
  const [pages, setPages] = useState(1);
  const [booking, setBooking] = useState<Teacher | null>(null);
  const [booked, setBooked] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<string | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const fav = useFavorites();
  const q = useDebounced(query.trim(), 300);

  const first = useApi<TeacherPage>(listPath(filter, q, sort, 1));
  const total = first.data?.total ?? 0;
  const all = first.data?.all ?? 0;
  const shown = Math.min(total, pages * PAGE);

  useEffect(() => {
    if (!sortOpen) return;
    const close = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [sortOpen]);

  const cardProps = (t: Teacher) => ({
    t,
    fav: fav.has(t.id),
    onFav: () => fav.toggle(t.id),
    booked: !!booked[t.id],
    onBook: () => setBooking(t),
    onProfile: () => setProfile(t.slug),
  });

  return (
    <section className="mx-auto mt-6 max-w-[1400px] px-4 sm:px-6 lg:mt-8">
      <Reveal className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight sm:text-[1.35rem]">Tìm giáo viên phù hợp với bạn</h2>
          <p className="mt-1 text-[12.5px] text-muted">Lọc theo nhu cầu, trình độ hoặc chuyên môn để tìm người đồng hành lý tưởng.</p>
        </div>
        <p className="text-xs text-muted">
          Hiển thị{" "}
          <motion.b key={`${shown}/${all}`} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="inline-block text-brand-500">
            {first.data ? `${total}/${all}` : "…"}
          </motion.b>{" "}
          giáo viên
        </p>
      </Reveal>

      <Reveal delay={0.05} className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="-mx-4 flex min-w-0 snap-x gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <motion.button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setPages(1);
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                className={`relative flex h-[38px] shrink-0 snap-start items-center gap-2 rounded-lg px-4 text-xs font-medium transition-colors lg:px-5 ${
                  active ? "text-brand-500" : "bg-white text-ink shadow-sm ring-1 ring-ink/10 hover:ring-brand-200"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="teacher-filter"
                    className="absolute inset-0 rounded-lg bg-brand-50 ring-1 ring-brand-200"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{f.icon}</span>
                <span className="relative whitespace-nowrap">{f.label}</span>
              </motion.button>
            );
          })}
        </div>
        <div className="flex gap-2.5">
          <label className="flex h-[38px] min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3 shadow-sm ring-1 ring-ink/10 focus-within:ring-brand-300 xl:w-[260px] xl:flex-none">
            <Search className="size-4 shrink-0 text-ink/70" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPages(1);
              }}
              placeholder="Tìm theo tên giáo viên, chuyên môn..."
              aria-label="Tìm giáo viên"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted/80"
            />
          </label>
          <div ref={sortRef} className="relative shrink-0">
            <button
              onClick={() => setSortOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="flex h-[38px] items-center gap-2 rounded-lg bg-white px-3 text-xs shadow-sm ring-1 ring-ink/10 hover:ring-brand-200"
            >
              <span className="hidden sm:inline">Sắp xếp:</span>
              <span className="font-medium">{SORTS.find((s) => s.id === sort)?.label}</span>
              <ChevronDown className={`size-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.ul
                  role="listbox"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-ink/5 bg-white p-1 shadow-xl"
                >
                  {SORTS.map((s) => (
                    <li key={s.id}>
                      <button
                        role="option"
                        aria-selected={sort === s.id}
                        onClick={() => {
                          setSort(s.id);
                          setPages(1);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-brand-50 ${
                          sort === s.id ? "font-semibold text-brand-500" : ""
                        }`}
                      >
                        {s.label}
                        {sort === s.id && <Check className="size-3.5" />}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Reveal>

      <motion.div layout className="mt-4 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {first.loading ? (
          Array.from({ length: PAGE }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {(first.data?.items ?? []).map((t, i) => (
                <TeacherCard key={t.id} i={i} {...cardProps(t)} />
              ))}
            </AnimatePresence>
            {Array.from({ length: pages - 1 }).map((_, k) => (
              <TeacherPageRows key={`${filter}-${q}-${sort}-${k + 2}`} path={listPath(filter, q, sort, k + 2)} render={(t, i) => <TeacherCard key={t.id} i={i} {...cardProps(t)} />} />
            ))}
          </>
        )}
      </motion.div>

      {first.error && !first.data && (
        <div className="grid place-items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-12 text-center">
          <p className="font-semibold">Không tải được danh sách giáo viên</p>
          <button onClick={() => first.reload()} className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white">
            Thử lại
          </button>
        </div>
      )}

      {first.data && total === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid place-items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-12 text-center"
        >
          <SearchX className="size-10 text-brand-400" />
          <p className="mt-3 font-semibold">Chưa tìm thấy giáo viên phù hợp</p>
          <p className="mt-1 text-sm text-muted">Thử bỏ bớt bộ lọc hoặc tìm với từ khóa khác nhé.</p>
          <button
            onClick={() => {
              setFilter("all");
              setQuery("");
              setPages(1);
            }}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white"
          >
            Xem tất cả giáo viên
          </button>
        </motion.div>
      )}

      {total > PAGE && (
        <div className="mt-5 flex justify-center">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPages((p) => (shown >= total ? 1 : p + 1))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-5 py-2 text-xs font-semibold text-brand-500 shadow-sm hover:bg-brand-50"
          >
            {shown >= total ? "Thu gọn" : `Xem thêm ${Math.min(PAGE, total - shown)} giáo viên`}
            <ChevronDown className={`size-4 transition-transform ${shown >= total ? "rotate-180" : ""}`} />
          </motion.button>
        </div>
      )}

      <TrialModal
        teacher={booking}
        open={!!booking}
        onClose={() => setBooking(null)}
        onDone={() => booking && setBooked((b) => ({ ...b, [booking.id]: true }))}
      />
      <ProfileModal
        slug={profile}
        onClose={() => setProfile(null)}
        onBook={(t) => {
          setProfile(null);
          setBooking(t);
        }}
      />
    </section>
  );
}

function TeacherPageRows({ path, render }: { path: string; render: (t: Teacher, i: number) => React.ReactNode }) {
  const { data, loading } = useApi<TeacherPage>(path);
  if (loading)
    return (
      <div className="col-span-full flex justify-center py-4 text-brand-500">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  return <>{(data?.items ?? []).map(render)}</>;
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-ink/5 bg-white p-2 shadow-sm">
      <div className="aspect-[212/125] animate-pulse rounded-lg bg-brand-50" />
      <div className="space-y-2 px-2 py-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-ink/[.06]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-ink/[.05]" />
        <div className="h-3 w-full animate-pulse rounded bg-ink/[.04]" />
        <div className="h-8 animate-pulse rounded bg-ink/[.04]" />
      </div>
    </div>
  );
}

export function JapanFlag({ className = "" }: { className?: string }) {
  return (
    <span
      title="Giáo viên người Nhật"
      className={`inline-grid h-3 w-4 shrink-0 place-items-center rounded-[2px] bg-white ring-1 ring-ink/10 ${className}`}
    >
      <span className="size-1.5 rounded-full bg-brand-500" />
    </span>
  );
}

function TeacherCard({
  t,
  i,
  fav,
  onFav,
  booked,
  onBook,
  onProfile,
}: {
  t: Teacher;
  i: number;
  fav: boolean;
  onFav: () => void;
  booked: boolean;
  onBook: () => void;
  onProfile: () => void;
}) {
  const badge = badgeLabel(t);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: (i % 6) * 0.05 } }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      whileHover={{ y: -6 }}
      className="group flex flex-col rounded-xl border border-ink/5 bg-white p-2 shadow-sm transition-shadow hover:shadow-xl hover:shadow-brand-500/10"
    >
      <div className="relative aspect-[212/125] overflow-hidden rounded-lg" style={{ background: `#${t.avatarBg ?? "ffe4e8"}` }}>
        <Image
          src="https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&q=60"
          alt=""
          fill
          sizes="(min-width:1280px) 16vw, (min-width:768px) 30vw, 90vw"
          className="object-cover opacity-35 blur-[2px]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={teacherAvatar(t)}
          alt={t.name}
          className={`absolute left-1/2 -translate-x-1/2 transition-transform duration-500 group-hover:scale-105 ${t.avatarUrl ? "inset-y-0 h-full object-cover" : "-bottom-6 h-[125%]"}`}
        />
        <span
          className={`absolute left-2 top-2 flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ${
            t.native ? "text-brand-500" : t.badge === "N1" ? "text-violet-600" : "text-sky-600"
          }`}
        >
          {t.native ? <GraduationCap className="size-3" /> : <span className="grid size-3 place-items-center rounded-full bg-current text-[7px] text-white">日</span>}
          {badge}
        </span>
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={onFav}
          aria-label={fav ? "Bỏ yêu thích" : "Yêu thích"}
          aria-pressed={fav}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/95 shadow-sm"
        >
          <motion.span key={String(fav)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
            <Heart className={`size-3.5 ${fav ? "fill-brand-500 text-brand-500" : "text-ink/70"}`} />
          </motion.span>
        </motion.button>
      </div>
      <div className="flex flex-1 flex-col px-2 pb-1 pt-2.5">
        <h3 className="flex items-center gap-2 text-[13.5px] font-bold">
          <span className="truncate">{t.name}</span>
          {t.native && <JapanFlag />}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <b className="text-ink">{t.rating}</b> ({t.reviewCount} đánh giá)
        </p>
        <ul className="mt-2 space-y-1 text-[10.5px] text-ink/75">
          <li className="flex items-center gap-2">
            <GraduationCap className="size-3.5 shrink-0 text-muted" />
            <span className="truncate">{t.skills.join(", ")}</span>
          </li>
          <li className="flex items-center gap-2">
            <Briefcase className="size-3.5 shrink-0 text-muted" />
            {t.yearsExp} năm kinh nghiệm
          </li>
        </ul>
        <p className="mt-2.5 line-clamp-3 text-[10.5px] leading-relaxed text-muted">{t.bio}</p>
        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-3">
          <button
            onClick={onProfile}
            className="grid h-8 place-items-center rounded-md border border-brand-300 text-[10.5px] font-semibold text-brand-500 transition-colors hover:bg-brand-50"
          >
            Xem hồ sơ
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBook}
            className={`flex h-8 items-center justify-center gap-1 rounded-md text-[10.5px] font-semibold text-white shadow-sm transition-colors ${
              booked ? "bg-emerald-500" : "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {booked && <Check className="size-3.5" />}
            {booked ? "Đã đặt lịch" : "Đặt lịch học thử"}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
