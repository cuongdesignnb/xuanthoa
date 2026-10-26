"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  Clock,
  GraduationCap,
  Lightbulb,
  ClipboardList,
  PenLine,
  Search,
  SearchX,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { Reveal } from "../ui";
import { PostCover } from "./Cover";
import Sidebar from "./Sidebar";
import { catLabel, catTag, type CategoryId, type PostCard } from "./types";
import { fmtDateShort, type Paged } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { teacherAvatar } from "../teachers/types";

function ToriiIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 5 Q12 2 22 5" />
      <path d="M4 9 H20" />
      <path d="M7 5 V21 M17 5 V21" />
      <path d="M12 5 V9" />
    </svg>
  );
}

const TABS: { id: CategoryId; label: string; icon?: React.ReactNode }[] = [
  { id: "all", label: "Tất cả bài viết" },
  { id: "ngu-phap", label: "Ngữ pháp", icon: <PenLine className="size-5 text-indigo-500" /> },
  { id: "kanji", label: "Kanji", icon: <span className="font-jp text-xl font-bold leading-none text-emerald-600">漢</span> },
  { id: "jlpt", label: "Kinh nghiệm JLPT", icon: <ClipboardList className="size-5 text-brand-500" /> },
  { id: "van-hoa", label: "Văn hóa Nhật Bản", icon: <ToriiIcon className="size-5 text-amber-500" /> },
  { id: "meo", label: "Mẹo học tập", icon: <Lightbulb className="size-5 text-violet-500" /> },
  { id: "du-hoc", label: "Du học", icon: <GraduationCap className="size-5 text-sky-600" /> },
];

const PAGE = 6;

const postsPath = (cat: CategoryId, q: string, page: number) => {
  const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE) });
  if (cat !== "all") p.set("category", cat);
  if (q) p.set("q", q);
  return `/public/posts?${p}`;
};

export default function BlogExplorer() {
  const [cat, setCat] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(1);
  const q = useDebounced(query.trim(), 300);

  // Trang 1 quyết định tổng số; các trang sau được tải bởi <PostPage> và nối vào lưới.
  const first = useApi<Paged<PostCard>>(postsPath(cat, q, 1));
  const total = first.data?.total ?? 0;
  const hasMore = total > pages * PAGE;

  const reset = () => {
    setCat("all");
    setQuery("");
    setPages(1);
  };

  return (
    <>
      {/* Ô tìm kiếm nổi trên banner */}
      <div className="relative z-20 mx-auto -mt-2 max-w-7xl px-4 sm:px-6 lg:-mt-12">
        <Reveal y={12} className="lg:ml-[33%] lg:max-w-[415px]">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setPages(1);
            }}
            className="flex items-center gap-2 rounded-xl border border-ink/5 bg-white p-1.5 pl-4 shadow-[0_10px_30px_-10px_rgba(229,56,59,.25)]"
          >
            <Search className="size-5 shrink-0 text-ink/70" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPages(1);
              }}
              placeholder="Tìm kiếm bài viết, chủ đề, kỹ năng..."
              aria-label="Tìm kiếm bài viết"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted/80"
            />
            {query && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => {
                  setQuery("");
                  setPages(1);
                }}
                className="rounded-full p-1 text-muted hover:bg-ink/5"
              >
                <X className="size-4" />
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/30"
            >
              Tìm kiếm
            </motion.button>
          </form>
        </Reveal>
      </div>

      {/* Tab danh mục */}
      <div className="mx-auto mt-6 max-w-[1400px] px-4 sm:px-6 lg:mt-8">
        <Reveal className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0">
          {TABS.map((t) => {
            const active = cat === t.id;
            return (
              <motion.button
                key={t.id}
                onClick={() => {
                  setCat(t.id);
                  setPages(1);
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex h-[42px] shrink-0 snap-start items-center justify-center gap-2.5 rounded-lg px-5 text-[13px] font-semibold transition-colors lg:px-8 ${
                  t.id === "all" ? "min-w-[145px]" : ""
                } ${active ? "text-white" : "bg-white text-ink shadow-sm ring-1 ring-ink/5 hover:ring-brand-200"}`}
              >
                {active && (
                  <motion.span
                    layoutId="blog-tab"
                    className="absolute inset-0 rounded-lg bg-brand-500 shadow-md shadow-brand-500/30"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {t.icon && <span className="relative">{t.icon}</span>}
                <span className="relative whitespace-nowrap">{t.label}</span>
              </motion.button>
            );
          })}
        </Reveal>
      </div>

      {/* Lưới bài viết + sidebar */}
      <section className="mx-auto mt-5 grid max-w-[1400px] grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_432px] [&>*]:min-w-0">
        <div>
          {q && first.data && (
            <p className="mb-3 text-sm text-muted">
              Tìm thấy <b className="text-brand-500">{total}</b> bài viết cho “{q}”
            </p>
          )}
          {first.error && !first.data ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-14 text-center">
              <p className="font-semibold">Không tải được bài viết</p>
              <p className="mt-1 text-sm text-muted">{first.error.message}</p>
              <button onClick={() => first.reload()} className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white">
                Thử lại
              </button>
            </div>
          ) : (
            <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {first.loading ? (
                Array.from({ length: PAGE }).map((_, i) => <CardSkeleton key={i} />)
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    {(first.data?.items ?? []).map((a, i) => (
                      <ArticleCard key={a.id} a={a} i={i} />
                    ))}
                  </AnimatePresence>
                  {Array.from({ length: pages - 1 }).map((_, k) => (
                    <PostPage key={`${cat}-${q}-${k + 2}`} path={postsPath(cat, q, k + 2)} />
                  ))}
                </>
              )}
            </motion.div>
          )}
          {first.data && total === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid place-items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-14 text-center"
            >
              <SearchX className="size-10 text-brand-400" />
              <p className="mt-3 font-semibold">Không tìm thấy bài viết phù hợp</p>
              <p className="mt-1 text-sm text-muted">Hãy thử từ khóa khác hoặc chọn danh mục “Tất cả bài viết”.</p>
              <button onClick={reset} className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white">
                Xem tất cả bài viết
              </button>
            </motion.div>
          )}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPages((p) => p + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-500 shadow-sm hover:bg-brand-50"
              >
                Xem thêm bài viết <ChevronDown className="size-4" />
              </motion.button>
            </div>
          )}
        </div>
        <Sidebar />
      </section>
    </>
  );
}

/** Một trang kết quả bổ sung (khi bấm "Xem thêm"). */
function PostPage({ path }: { path: string }) {
  const { data, loading } = useApi<Paged<PostCard>>(path);
  if (loading)
    return (
      <div className="col-span-full flex justify-center py-4 text-brand-500">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  return (
    <>
      {(data?.items ?? []).map((a, i) => (
        <ArticleCard key={a.id} a={a} i={i} />
      ))}
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/5 bg-white shadow-sm">
      <div className="aspect-[290/143] animate-pulse bg-brand-50" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-11/12 animate-pulse rounded bg-ink/[.06]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-ink/[.06]" />
        <div className="h-3 w-full animate-pulse rounded bg-ink/[.04]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-ink/[.04]" />
      </div>
    </div>
  );
}

function ArticleCard({ a, i }: { a: PostCard; i: number }) {
  const href = `/blog/${a.slug}`;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, delay: (i % 6) * 0.05 } }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      whileHover={{ y: -6 }}
      className="group flex flex-col overflow-hidden rounded-xl border border-ink/5 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-brand-500/10"
    >
      <Link href={href} className="relative block aspect-[290/143] overflow-hidden" aria-label={a.title}>
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
          <PostCover post={a} />
        </div>
        <span className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-semibold text-white shadow ${catTag(a.category)}`}>
          {catLabel(a.category)}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-bold leading-snug transition-colors group-hover:text-brand-500">
          <Link href={href}>{a.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted">{a.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-[10.5px] text-muted">
          {a.author && (
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teacherAvatar(a.author, a.author.avatarBg ?? "ffe3e3")} alt="" className="size-6 rounded-full ring-1 ring-ink/10" />
              {a.author.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {fmtDateShort(a.publishedAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {a.readMin} phút
          </span>
        </div>
      </div>
    </motion.article>
  );
}
