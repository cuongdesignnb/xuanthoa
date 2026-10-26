"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  LayoutGrid,
  List,
  MessagesSquare,
  Route,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
  Layers,
  SearchX,
  Search,
} from "lucide-react";
import { PageBanner, Pagoda, SakuraBranch } from "../site";
import { Reveal, avatar } from "../ui";
import { CourseCover, Fuji, Torii } from "./art";
import { useApi, useDebounced } from "@/lib/hooks";
import { qs, type Paged } from "@/lib/api";
import { fmtK, teacherAvatar, type CategoryCounts, type CourseSummary, type FilterKey } from "./types";

export { fmtK };

/* ------------------------------------------------------------------ */
/* Tabs cấp độ / danh mục                                              */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "all", label: "Tất cả khóa học", icon: LayoutGrid, tone: "" },
  { id: "N5", label: "N5", sub: "Cho người mới bắt đầu", icon: CalendarDays, tone: "text-rose-500 bg-rose-50 [&_.ic]:bg-rose-100" },
  { id: "N4", label: "N4", sub: "Củng cố nền tảng", icon: Award, tone: "text-amber-600 bg-amber-50/70 [&_.ic]:bg-amber-100" },
  { id: "N3", label: "N3", sub: "Trung cấp", icon: Layers, tone: "text-emerald-600 bg-emerald-50/70 [&_.ic]:bg-emerald-100" },
  { id: "N2", label: "N2", sub: "Nâng cao", icon: TrendingUp, tone: "text-sky-600 bg-sky-50/70 [&_.ic]:bg-sky-100" },
  { id: "N1", label: "N1", sub: "Chinh phục", icon: Crown, tone: "text-violet-600 bg-violet-50/70 [&_.ic]:bg-violet-100" },
  { id: "JLPT", label: "JLPT", sub: "Luyện thi", icon: Target, tone: "text-ink bg-rose-50/60 [&_.ic]:bg-rose-100 [&_.ic]:text-brand-500" },
  { id: "Giao tiếp", label: "Giao tiếp", icon: Users, tone: "text-ink bg-sky-50/60 [&_.ic]:bg-sky-100 [&_.ic]:text-sky-600" },
  { id: "Kanji", label: "Kanji", sub: "Hán tự", icon: null, tone: "text-ink bg-emerald-50/60 [&_.ic]:bg-emerald-100 [&_.ic]:text-emerald-700" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SORTS = [
  { v: "popular", l: "Phổ biến nhất" },
  { v: "new", l: "Mới nhất" },
  { v: "rating", l: "Đánh giá cao nhất" },
  { v: "lessons", l: "Nhiều bài học nhất" },
  { v: "price", l: "Giá thấp nhất" },
] as const;
type SortId = (typeof SORTS)[number]["v"];

const EMPTY: Record<FilterKey, string[]> = { level: [], goal: [], duration: [], format: [] };
const PAGE = 12;
const TAB_IDS = TABS.map((t) => t.id) as string[];

export default function Catalog() {
  const params = useSearchParams();
  const router = useRouter();
  const initialTab = params.get("tab") ?? params.get("level") ?? "all";
  const [tab, setTabState] = useState<TabId>((TAB_IDS.includes(initialTab) ? initialTab : "all") as TabId);
  const [filters, setFilters] = useState(EMPTY);
  const [sort, setSort] = useState<SortId>("popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [limit, setLimit] = useState(PAGE);
  const dq = useDebounced(q.trim(), 300);

  const activeCount = Object.values(filters).reduce((s, v) => s + v.length, 0);
  const editorial = sort === "popular" && tab === "all" && activeCount === 0 && !dq;
  const query = {
    tag: tab === "all" ? undefined : tab,
    level: filters.level.join(",") || undefined,
    goal: filters.goal.join(",") || undefined,
    duration: filters.duration.join(",") || undefined,
    format: filters.format.join(",") || undefined,
    q: dq || undefined,
  };
  const listRes = useApi<Paged<CourseSummary>>(`/public/courses${qs({ ...query, sort: editorial ? "order" : sort, pageSize: limit })}`);
  const countRes = useApi<CategoryCounts>(`/public/courses/categories${qs(query)}`);
  const list = listRes.data?.items ?? [];
  const total = listRes.data?.total ?? 0;
  const loading = listRes.loading;

  // về trang đầu khi đổi bộ lọc / sắp xếp
  const filterKey = JSON.stringify([query, sort]);
  const [lastKey, setLastKey] = useState(filterKey);
  if (filterKey !== lastKey) {
    setLastKey(filterKey);
    setLimit(PAGE);
  }

  const setTab = (t: TabId) => {
    setTabState(t);
    const sp = new URLSearchParams(params.toString());
    if (t === "all") sp.delete("tab");
    else sp.set("tab", t);
    sp.delete("level");
    const str = sp.toString();
    router.replace(`/khoa-hoc${str ? `?${str}` : ""}`, { scroll: false });
  };

  const toggle = (key: FilterKey, v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const reset = () => {
    setFilters(EMPTY);
    setQ("");
    setTab("all");
  };

  const heading = tab === "all" ? "Tất cả khóa học" : `Khóa học ${tab}`;
  const tabCounts: Record<string, number> = Object.fromEntries((countRes.data?.tabs ?? []).map((t) => [t.id, t.count]));

  return (
    <>
      <CatalogBanner />

      <div className="relative z-20 mx-auto -mt-3 max-w-7xl px-4 sm:px-6">
        <CategoryTabs tab={tab} setTab={setTab} counts={tabCounts} />
      </div>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[260px_1fr] [&>*]:min-w-0">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <FilterPanel groups={countRes.data?.groups} filters={filters} toggle={toggle} reset={reset} />
          </div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold sm:text-2xl">
              {heading}{" "}
              <motion.span key={total} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block text-sm font-normal text-muted sm:text-base">
                ({loading ? "…" : total} khóa học)
              </motion.span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Tìm khóa học</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm khóa học…"
                  className="w-36 rounded-lg border border-ink/10 bg-white py-2 pl-8 pr-2 text-xs outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100 sm:w-44"
                />
              </label>
              <button
                onClick={() => setDrawer(true)}
                className="flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs font-semibold lg:hidden"
              >
                <SlidersHorizontal className="size-4" /> Bộ lọc
                {activeCount > 0 && <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[10px] text-white">{activeCount}</span>}
              </button>
              <label className="hidden text-xs text-muted sm:block" htmlFor="sort">
                Sắp xếp theo
              </label>
              <div className="relative">
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortId)}
                  className="appearance-none rounded-lg border border-ink/10 bg-white py-2 pl-3 pr-8 text-xs font-medium outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100 sm:w-36"
                >
                  {SORTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.l}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              </div>
              <div className="flex gap-1 rounded-lg bg-white p-0.5">
                {(
                  [
                    ["grid", LayoutGrid, "Dạng lưới"],
                    ["list", List, "Dạng danh sách"],
                  ] as const
                ).map(([v, Icon, label]) => (
                  <button
                    key={v}
                    aria-label={label}
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`relative grid size-8 place-items-center rounded-md transition-colors ${view === v ? "text-white" : "text-muted hover:text-brand-500"}`}
                  >
                    {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-md bg-brand-500" />}
                    <Icon className="relative size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <LayoutGroup>
            <motion.div layout className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4"}>
              <AnimatePresence mode="popLayout">
                {loading &&
                  !list.length &&
                  Array.from({ length: 6 }, (_, i) => (
                    <div key={`sk${i}`} className="h-72 animate-pulse rounded-2xl border border-ink/5 bg-white p-2">
                      <div className="h-32 rounded-xl bg-ink/[.06]" />
                      <div className="mt-3 h-4 w-3/4 rounded bg-ink/[.06]" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-ink/[.06]" />
                    </div>
                  ))}
                {list.map((c, i) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.94, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0, transition: { delay: Math.min(i, 6) * 0.04 } }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  >
                    <CourseCard course={c} view={view} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>

          {total > list.length && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setLimit((l) => l + PAGE)}
                disabled={listRes.validating}
                className="rounded-lg border border-brand-500 px-5 py-2 text-xs font-semibold text-brand-500 transition hover:bg-brand-50 disabled:opacity-50"
              >
                {listRes.validating ? "Đang tải…" : `Xem thêm ${Math.min(PAGE, total - list.length)} khóa học`}
              </button>
            </div>
          )}
          {listRes.error && !list.length && (
            <div className="rounded-2xl border border-dashed border-ink/10 bg-white py-10 text-center text-sm text-muted">
              Không tải được danh sách khóa học.{" "}
              <button onClick={() => listRes.reload()} className="font-semibold text-brand-500">
                Thử lại
              </button>
            </div>
          )}

          <AnimatePresence>
            {!loading && !listRes.error && list.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-ink/10 bg-white py-14 text-center"
              >
                <SearchX className="mx-auto size-10 text-brand-300" />
                <p className="mt-3 font-semibold">Không tìm thấy khóa học phù hợp</p>
                <p className="mt-1 text-sm text-muted">Hãy thử bỏ bớt bộ lọc hoặc chọn danh mục khác.</p>
                <button onClick={reset} className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                  Đặt lại bộ lọc
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Roadmap />
      <Newsletter />

      {/* Bộ lọc dạng slide-over trên mobile */}
      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-ink/5 px-4 py-3">
                <p className="font-bold">Bộ lọc</p>
                <button aria-label="Đóng bộ lọc" onClick={() => setDrawer(false)} className="grid size-8 place-items-center rounded-full hover:bg-brand-50">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <FilterPanel groups={countRes.data?.groups} filters={filters} toggle={toggle} reset={reset} bare />
              </div>
              <div className="border-t border-ink/5 p-3">
                <button onClick={() => setDrawer(false)} className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white">
                  Xem {total} khóa học
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */

function CatalogBanner() {
  return (
    <PageBanner
      compact
      aside={
        <div className="relative h-56">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: -4 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="absolute left-0 top-2 z-10 rounded-[2rem] bg-white px-5 py-3 shadow-lg"
          >
            <p className="font-jp text-base font-bold leading-snug">
              一緒に
              <br />
              がんばりましょう!
            </p>
            <p className="font-script text-base leading-tight text-ink/80">
              Cùng nhau
              <br />
              cố gắng nhé! <span className="text-brand-500">♥</span>
            </p>
            <span className="absolute -bottom-2 right-8 size-4 rotate-45 bg-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="absolute -bottom-10 left-36 h-64 w-56"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar("Yuki", "ffd6dc")} alt="Học viên Nihongo+" className="size-full rounded-t-[45%] object-cover" />
            <span className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded bg-white/95 px-3 py-1.5 font-jp text-xs font-bold tracking-widest shadow">
              日本語
            </span>
          </motion.div>
        </div>
      }
    >
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]"
      >
        Khám phá khóa học tiếng Nhật <br className="hidden sm:block" />
        phù hợp với bạn
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-3 max-w-xl text-sm text-muted sm:text-[15px]"
      >
        Lộ trình bài bản, giảng dạy bởi giáo viên giàu kinh nghiệm, giúp bạn chinh phục tiếng Nhật dễ dàng và hiệu quả hơn mỗi ngày.
      </motion.p>
    </PageBanner>
  );
}

function CategoryTabs({ tab, setTab, counts }: { tab: TabId; setTab: (t: TabId) => void; counts: Record<string, number> }) {
  return (
    <Reveal y={16} className="rounded-2xl border border-ink/5 bg-white/95 p-2 shadow-lg shadow-ink/5 backdrop-blur">
      <div className="no-scrollbar -mx-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 lg:mx-0 lg:grid lg:grid-cols-[1.35fr_repeat(8,1fr)] lg:overflow-visible lg:px-0">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <motion.button
              key={t.id}
              onClick={() => setTab(t.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={active}
              className={`relative flex shrink-0 snap-start items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                active ? "border-transparent text-white" : `border-ink/5 ${t.tone}`
              } ${t.id === "all" ? "justify-center" : ""}`}
            >
              {active && (
                <motion.span
                  layoutId="cat-tab"
                  className="absolute inset-0 rounded-xl bg-brand-500 shadow-lg shadow-brand-500/30"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className={`ic relative grid size-8 shrink-0 place-items-center rounded-lg ${active ? "bg-white/20 text-white" : ""}`}>
                {Icon ? <Icon className="size-4" /> : <span className="font-jp text-sm font-bold">漢</span>}
              </span>
              <span className="relative min-w-0">
                <span className="block whitespace-nowrap text-sm font-bold">
                  {t.label}
                  {counts[t.id] !== undefined && t.id !== "all" && (
                    <span className={`ml-1 text-[10px] font-semibold ${active ? "text-white/80" : "text-muted"}`}>{counts[t.id]}</span>
                  )}
                </span>
                {"sub" in t && <span className={`block whitespace-nowrap text-[10px] ${active ? "text-white/80" : "text-muted"}`}>{t.sub}</span>}
              </span>
            </motion.button>
          );
        })}
      </div>
    </Reveal>
  );
}

function FilterPanel({
  groups,
  filters,
  toggle,
  reset,
  bare = false,
}: {
  groups?: CategoryCounts["groups"];
  filters: Record<FilterKey, string[]>;
  toggle: (k: FilterKey, v: string) => void;
  reset: () => void;
  bare?: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({ level: true, goal: true, duration: true, format: true });
  return (
    <div className={bare ? "" : "rounded-2xl border border-ink/5 bg-white p-4 shadow-sm"}>
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 font-bold">
          <SlidersHorizontal className="size-4" /> Bộ lọc khóa học
        </p>
        <button onClick={reset} className="group flex items-center gap-1 text-xs font-medium text-brand-500">
          <RotateCcw className="size-3.5 transition-transform group-hover:-rotate-180" /> Đặt lại
        </button>
      </div>
      {!groups &&
        Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 border-t border-ink/5 py-3 first-of-type:border-t-0">
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink/[.06]" />
            <div className="h-3 w-full animate-pulse rounded bg-ink/[.06]" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-ink/[.06]" />
          </div>
        ))}
      {groups?.map((g) => (
        <div key={g.key} className="border-t border-ink/5 py-3 first-of-type:border-t-0">
          <button
            onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
            className="flex w-full items-center justify-between text-sm font-bold"
            aria-expanded={open[g.key]}
          >
            {g.title}
            <motion.span animate={{ rotate: open[g.key] ? 180 : 0 }}>
              <ChevronDown className="size-4 text-muted" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open[g.key] && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 pt-2">
                  {g.options.map((o) => {
                    const checked = filters[g.key].includes(o.value);
                    return (
                      <li key={o.value}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-xs text-ink/80 transition hover:bg-brand-50">
                          <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(g.key, o.value)} />
                          <span
                            className={`grid size-4 shrink-0 place-items-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-200 ${
                              checked ? "border-brand-500 bg-brand-500 text-white" : "border-ink/20 bg-white"
                            }`}
                          >
                            <AnimatePresence>
                              {checked && (
                                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                  <Check className="size-3" strokeWidth={3.5} />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                          <span className={`flex-1 ${checked ? "font-semibold text-ink" : ""}`}>{o.label}</span>
                          <span className="text-muted">{o.count}</span>
                        </label>
                      </li>
                    );
                  })}
                </div>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function Stats({ c }: { c: CourseSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      <span className="flex items-center gap-1">
        <BookOpen className="size-3.5" /> {c.lessonsCount} bài học
      </span>
      <span className="flex items-center gap-1">
        <Users className="size-3.5" /> {fmtK(c.studentCount)} học viên
      </span>
      <span className="flex items-center gap-1">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        <b className="font-semibold text-ink">{c.rating}</b> ({c.ratingCount})
      </span>
    </div>
  );
}

function CourseCard({ course: c, view }: { course: CourseSummary; view: "grid" | "list" }) {
  const t = c.teacher;
  const tAvatar = teacherAvatar(t, avatar);
  const coverAvatar = c.coverStyle ? avatar(c.coverStyle.seed, c.coverStyle.bg) : tAvatar;
  const list = view === "list";
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`group flex h-full overflow-hidden rounded-2xl border border-ink/5 bg-white p-2 shadow-sm transition-shadow hover:shadow-xl hover:shadow-brand-500/10 ${
        list ? "flex-col sm:flex-row" : "flex-col"
      }`}
    >
      <div className={`relative shrink-0 overflow-hidden rounded-xl ${list ? "h-36 sm:h-auto sm:w-72" : "h-32"}`}>
        <CourseCover course={c} className="size-full" />
        {c.badge && (
          <span
            className={`absolute left-2 top-2 z-20 rounded-md px-2 py-0.5 text-[10px] font-semibold text-white shadow ${
              c.badge === "Mới" ? "bg-emerald-500" : "bg-brand-500"
            }`}
          >
            {c.badge}
          </span>
        )}
      </div>
      <div className={`flex flex-1 flex-col px-1.5 pb-1.5 pt-3 ${list ? "sm:px-4" : ""}`}>
        <div className="flex gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverAvatar} alt="" className="size-9 shrink-0 rounded-full border border-ink/5" />
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm font-bold group-hover:text-brand-500">
              <Link href={`/khoa-hoc/${c.slug}`}>{c.title}</Link>
            </h3>
            <p className="mt-0.5 line-clamp-2 min-h-[2.4em] text-[11px] leading-snug text-muted">{c.subtitle}</p>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-2 text-[11px] font-medium">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tAvatar} alt="" className="size-6 rounded-full" />
          {t?.name ?? "Nihongo+"}
          {c.coverStyle?.live && <span className="size-1.5 animate-pulse rounded-full bg-brand-500" title="Đang trực tuyến" />}
        </p>
        <div className="mt-2">
          <Stats c={c} />
        </div>
        <div className={`mt-3 grid grid-cols-2 gap-2 ${list ? "mt-auto pt-3 sm:max-w-sm" : "mt-auto pt-3"}`}>
          <Link
            href={`/khoa-hoc/${c.slug}`}
            className="rounded-lg border border-brand-500 py-2 text-center text-xs font-semibold text-brand-500 transition hover:bg-brand-50"
          >
            Xem chi tiết
          </Link>
          <Link
            href={c.firstLessonSlug ? `/hoc/${c.firstLessonSlug}` : `/khoa-hoc/${c.slug}`}
            className="rounded-lg bg-brand-500 py-2 text-center text-xs font-semibold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600"
          >
            Bắt đầu học
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Lộ trình đề xuất                                                    */
/* ------------------------------------------------------------------ */

const STEP_STYLE: Record<string, { icon: typeof CalendarDays; c: string; tc: string }> = {
  N5: { icon: CalendarDays, c: "bg-rose-100 text-rose-500", tc: "text-rose-500" },
  N4: { icon: Sprout, c: "bg-amber-100 text-amber-600", tc: "text-amber-600" },
  N3: { icon: MessagesSquare, c: "bg-emerald-100 text-emerald-600", tc: "text-emerald-600" },
  N2: { icon: TrendingUp, c: "bg-sky-100 text-sky-600", tc: "text-sky-600" },
  N1: { icon: Trophy, c: "bg-violet-100 text-violet-600", tc: "text-violet-600" },
};

type RoadmapData = { steps: { level: string; title: string; duration: string; course: { slug: string; title: string } | null }[]; href: string };

function Roadmap() {
  const { data } = useApi<RoadmapData>("/public/roadmap");
  const steps = data?.steps ?? [];
  if (data && !steps.length) return null;
  return (
    <section id="lo-trinh" className="mx-auto mt-10 max-w-7xl scroll-mt-24 px-4 sm:px-6">
      <Reveal className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-[#fff8f8] to-brand-50 p-4 sm:p-5">
        <SakuraBranch className="pointer-events-none absolute -right-6 -top-8 w-32 -scale-x-100 opacity-40" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30">
              <Route className="size-5" />
            </span>
            <div>
              <h2 className="flex items-center gap-1.5 text-lg font-extrabold sm:text-xl">
                Lộ trình đề xuất cho bạn
                <motion.span animate={{ rotate: [0, 18, -10, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2.4 }}>
                  <Sparkles className="size-5 fill-amber-300 text-amber-400" />
                </motion.span>
              </h2>
              <p className="text-xs text-muted">Chưa biết bắt đầu từ đâu? Hãy để Nihongo+ gợi ý lộ trình học phù hợp với mục tiêu của bạn!</p>
            </div>
          </div>
          <Link
            href={data?.href ?? "/khoa-hoc"}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/25"
          >
            Xem lộ trình chi tiết <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="no-scrollbar relative -mx-4 mt-4 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5 lg:mx-0 lg:overflow-visible lg:px-0">
          {!data &&
            Array.from({ length: 5 }, (_, i) => <div key={i} className="h-16 w-56 shrink-0 animate-pulse rounded-xl bg-white/80 lg:w-auto lg:flex-1" />)}
          {steps.map((step, i) => {
            const st = STEP_STYLE[step.level] ?? STEP_STYLE.N5;
            const s = { ...st, lv: step.level, t: step.title, d: step.duration };
            return (
            <div key={s.lv} className="flex shrink-0 snap-start items-center gap-2 lg:flex-1 lg:shrink">
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="flex w-56 items-center gap-3 rounded-xl border border-ink/5 bg-white p-3 shadow-sm lg:w-auto lg:flex-1"
              >
                <Link href={step.course ? `/khoa-hoc/${step.course.slug}` : `/khoa-hoc?tab=${s.lv}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${s.c}`}>
                  <s.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold text-brand-500">Bước {i + 1}</span>
                  <span className="block truncate text-xs">
                    <b className={`text-sm ${s.tc}`}>{s.lv}</b> <span className={s.tc}>- {s.t}</span>
                  </span>
                  <span className="block text-[10px] text-muted">{s.d}</span>
                </span>
                </Link>
              </motion.div>
              {i < steps.length - 1 && (
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.2 }}>
                  <ArrowRight className="size-5 shrink-0 text-brand-400" />
                </motion.span>
              )}
            </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Đăng ký nhận tin + tải ứng dụng                                     */
/* ------------------------------------------------------------------ */

const APPLE =
  "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";

export function StoreBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-muted">Tải ứng dụng Nihongo+</span>
      <a href="#" className="flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-ink/40">
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <path d={APPLE} />
        </svg>
        App Store
      </a>
      <a href="#" className="flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-ink/40">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path d="M3.6 2.3 13.4 12l-9.8 9.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1Z" fill="#00d7fe" />
          <path d="m16.8 8.6-3.4 3.4L3.6 2.3c.3-.2.8-.2 1.2 0l12 6.3Z" fill="#00f076" />
          <path d="m16.8 15.4-12 6.3c-.4.2-.9.2-1.2 0l9.8-9.7 3.4 3.4Z" fill="#ff3a44" />
          <path d="M20.4 10.5c.8.4.8 1.6 0 2.1l-3.6 2.8-3.4-3.4 3.4-3.4 3.6 1.9Z" fill="#ffd500" />
        </svg>
        Google Play
      </a>
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="relative mt-10 overflow-hidden bg-gradient-to-b from-white via-brand-50 to-[#ffe9ea]">
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[36%] md:block" aria-hidden>
        <Fuji className="absolute bottom-0 left-[30%] w-64 opacity-50" />
        <Pagoda className="absolute bottom-0 left-6 h-28" />
        <Torii className="absolute bottom-0 left-[46%] h-16 opacity-90" />
        <SakuraBranch className="absolute -left-4 bottom-10 w-36 opacity-80" />
      </div>
      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 md:pl-[36%] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-base font-bold">Nhận những kiến thức hữu ích về tiếng Nhật mỗi tuần</p>
          <p className="text-xs text-muted">Đăng ký để nhận bài học, mẹo học tập và ưu đãi khóa học mới nhất từ Nihongo+</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.includes("@")) setDone(true);
          }}
          className="flex w-full max-w-md items-center gap-2"
        >
          <AnimatePresence mode="wait">
            {done ? (
              <motion.p
                key="ok"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-1 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700"
              >
                <Check className="size-4" /> Cảm ơn bạn đã đăng ký!
              </motion.p>
            ) : (
              <motion.div key="form" exit={{ opacity: 0, y: -8 }} className="flex flex-1 rounded-lg border border-ink/10 bg-white p-1 shadow-sm">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  aria-label="Email"
                  className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
                />
                <motion.button whileTap={{ scale: 0.95 }} className="shrink-0 rounded-md bg-brand-500 px-4 py-2 text-xs font-semibold text-white">
                  Đăng ký ngay
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.span animate={{ x: [0, 6, 0], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.2 }} className="hidden sm:block">
            <Send className="size-7 -rotate-12 fill-brand-500 text-brand-500" />
          </motion.span>
        </form>
      </div>
      <div className="relative mx-auto flex max-w-7xl justify-center px-4 pb-4 sm:px-6 lg:justify-end">
        <StoreBadges />
      </div>
    </section>
  );
}
