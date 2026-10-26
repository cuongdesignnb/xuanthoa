"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  Clock,
  Eye,
  Flag,
  Link2,
  Loader2,
  Share2,
} from "lucide-react";
import { Breadcrumb, PageBanner } from "../site";
import { Reveal } from "../ui";
import { PostCover } from "./Cover";
import ArticleBody from "./ArticleBody";
import { catLabel, catTag, type PostCard, type PostDetail as Post } from "./types";
import { teacherAvatar } from "../teachers/types";
import { api, ApiError, compact, fmtDateShort } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

export default function PostDetail({ slug }: { slug: string }) {
  const { data: post, error, loading, reload } = useApi<Post>(`/public/posts/${encodeURIComponent(slug)}`, { dedupeMs: 60_000 });

  useEffect(() => {
    if (post) document.title = `${post.title} | Blog Nihongo+`;
  }, [post]);

  if (loading) return <DetailSkeleton />;
  if (error || !post)
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 pt-28 text-center">
        <div>
          <p className="font-jp text-5xl font-bold text-brand-200">迷子</p>
          <h1 className="mt-3 text-2xl font-extrabold">{error?.status === 404 ? "Không tìm thấy bài viết" : "Không tải được bài viết"}</h1>
          <p className="mt-2 text-sm text-muted">
            {error?.status === 404 ? "Bài viết có thể đã bị gỡ hoặc đường dẫn không chính xác." : error?.message}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {error?.status !== 404 && (
              <button onClick={() => reload()} className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-500">
                Thử lại
              </button>
            )}
            <Link href="/blog" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
              Về trang Blog
            </Link>
          </div>
        </div>
      </div>
    );

  return (
    <>
      <PageBanner
        compact
        script={null}
        aside={
          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto aspect-[16/10] w-full max-w-[480px] overflow-hidden rounded-2xl shadow-2xl shadow-brand-500/20 ring-4 ring-white"
          >
            <PostCover post={post} sizes="480px" />
          </motion.div>
        }
      >
        <div className="pb-2">
          <Breadcrumb items={[{ label: "Blog", href: "/blog" }, { label: catLabel(post.category), href: "/blog" }, { label: post.title }]} />
          <span className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-bold text-white ${catTag(post.category)}`}>{catLabel(post.category)}</span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-3 text-[1.9rem] font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.6rem]"
          >
            {post.title}
          </motion.h1>
          {post.excerpt && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/70">{post.excerpt}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            {post.author && (
              <span className="flex items-center gap-2 font-semibold text-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={teacherAvatar(post.author, post.author.avatarBg ?? "ffe3e3")} alt="" className="size-8 rounded-full ring-2 ring-white" />
                {post.author.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" /> {fmtDateShort(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> {post.readMin} phút đọc
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="size-4" /> {compact(post.views)} lượt xem
            </span>
          </div>
        </div>
      </PageBanner>

      {/* Ảnh bìa trên mobile (aside của banner chỉ hiện từ lg) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:hidden">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-lg">
          <PostCover post={post} sizes="100vw" />
        </div>
      </div>

      <section className="mx-auto mt-6 grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <Reveal className="rounded-2xl border border-ink/5 bg-white p-5 shadow-sm sm:p-8">
          {post.content ? <ArticleBody html={post.content} /> : <p className="text-muted">Bài viết chưa có nội dung.</p>}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink/5 pt-5">
            <ShareButtons title={post.title} />
            <ReportButton postId={post.id} />
          </div>
        </Reveal>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {post.author && (
            <Reveal className="overflow-hidden rounded-2xl border border-ink/5 bg-white shadow-sm">
              <div className="relative h-24 bg-gradient-to-r from-brand-100 via-brand-50 to-[#fff4ef]">
                <span className="absolute right-4 top-2 font-jp text-5xl font-bold text-brand-500/10">先生</span>
              </div>
              <div className="-mt-12 px-5 pb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={teacherAvatar(post.author, post.author.avatarBg ?? "ffe3e3")}
                  alt={post.author.name}
                  className="size-20 rounded-full bg-white ring-4 ring-white"
                />
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-brand-500">Tác giả</p>
                <h3 className="text-lg font-extrabold">{post.author.name}</h3>
                {post.author.title && <p className="text-xs text-muted">{post.author.title}</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {post.author.levelRange && (
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-500">{post.author.levelRange}</span>
                  )}
                  {post.author.yearsExp > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-ink/5 px-2 py-0.5 text-ink/70">
                      <Briefcase className="size-3" /> {post.author.yearsExp} năm kinh nghiệm
                    </span>
                  )}
                </div>
                {post.author.bio && <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{post.author.bio}</p>}
                <Link
                  href="/giao-vien"
                  className="group mt-4 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-300 text-xs font-semibold text-brand-500 transition-colors hover:bg-brand-50"
                >
                  Xem đội ngũ giáo viên <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          )}
          <Reveal delay={0.05} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-5 text-white shadow-lg shadow-brand-500/25">
            <span className="pointer-events-none absolute -right-3 -top-6 font-jp text-[90px] font-bold leading-none text-white/10">学</span>
            <BookOpen className="size-7" />
            <p className="mt-2 text-lg font-extrabold leading-snug">Học bài bản cùng lộ trình rõ ràng</p>
            <p className="mt-1 text-xs text-white/85">Video bài giảng, bài tập tương tác và giáo viên đồng hành.</p>
            <Link href="/khoa-hoc" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-brand-500">
              Khám phá khóa học <ArrowRight className="size-3.5" />
            </Link>
          </Reveal>
        </aside>
      </section>

      {(post.prev || post.next) && (
        <nav className="mx-auto mt-6 grid max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-6">
          {post.prev ? (
            <Link href={`/blog/${post.prev.slug}`} className="group rounded-xl border border-ink/5 bg-white p-4 shadow-sm transition hover:border-brand-200">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted">
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" /> Bài trước
              </span>
              <span className="mt-1 line-clamp-1 block text-sm font-bold group-hover:text-brand-500">{post.prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {post.next && (
            <Link href={`/blog/${post.next.slug}`} className="group rounded-xl border border-ink/5 bg-white p-4 text-right shadow-sm transition hover:border-brand-200">
              <span className="flex items-center justify-end gap-1 text-[11px] font-semibold text-muted">
                Bài tiếp theo <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="mt-1 line-clamp-1 block text-sm font-bold group-hover:text-brand-500">{post.next.title}</span>
            </Link>
          )}
        </nav>
      )}

      {post.related.length > 0 && (
        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
          <Reveal className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Bài viết liên quan</h2>
            <Link href="/blog" className="group flex items-center gap-1 text-xs font-semibold text-brand-500">
              Xem tất cả <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {post.related.map((r, i) => (
              <RelatedCard key={r.id} p={r} i={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function RelatedCard({ p, i }: { p: PostCard; i: number }) {
  return (
    <Reveal delay={i * 0.06} whileHover={{ y: -6 }} className="group overflow-hidden rounded-xl border border-ink/5 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-brand-500/10">
      <Link href={`/blog/${p.slug}`} className="block">
        <div className="relative aspect-[290/143] overflow-hidden">
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
            <PostCover post={p} />
          </div>
          <span className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-semibold text-white shadow ${catTag(p.category)}`}>{catLabel(p.category)}</span>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug transition-colors group-hover:text-brand-500">{p.title}</h3>
          <p className="mt-2 flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" /> {fmtDateShort(p.publishedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {p.readMin} phút
            </span>
          </p>
        </div>
      </Link>
    </Reveal>
  );
}

function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const open = (make: (u: string) => string) => window.open(make(encodeURIComponent(window.location.href)), "_blank", "noopener,width=640,height=560");
  const btn = "grid size-9 place-items-center rounded-full border border-ink/10 bg-white text-ink/70 transition hover:border-brand-300 hover:text-brand-500";
  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Share2 className="size-4" /> Chia sẻ:
      </span>
      <button className={btn} aria-label="Chia sẻ Facebook" onClick={() => open((u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`)}>
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6Z" />
        </svg>
      </button>
      <button className={btn} aria-label="Chia sẻ X" onClick={() => open((u) => `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(title)}`)}>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
          <path d="M18.2 2H21l-6.5 7.4L22 22h-6l-4.7-6.1L5.8 22H3l7-8L2 2h6.1l4.2 5.6L18.2 2Zm-1 18h1.6L7 3.9H5.3L17.2 20Z" />
        </svg>
      </button>
      <button
        className={btn}
        aria-label="Sao chép liên kết"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* trình duyệt chặn clipboard */
          }
        }}
      >
        {copied ? <Check className="size-4 text-emerald-500" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}

/** Báo lỗi nội dung bài viết (cần đăng nhập) → POST /me/reports. */
function ReportButton({ postId }: { postId: string }) {
  const { user } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState("");

  if (!user)
    return (
      <Link href={`/dang-nhap?next=${encodeURIComponent(path)}`} className="flex items-center gap-1.5 text-xs text-muted hover:text-brand-500">
        <Flag className="size-3.5" /> Báo lỗi nội dung
      </Link>
    );
  if (state === "sent") return <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><Check className="size-4" /> Đã gửi báo lỗi, cảm ơn bạn!</p>;
  return (
    <div className="w-full sm:w-auto">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-muted hover:text-brand-500">
          <Flag className="size-3.5" /> Báo lỗi nội dung
        </button>
      ) : (
        <form
          className="flex w-full flex-col gap-2 sm:w-[360px]"
          onSubmit={async (e) => {
            e.preventDefault();
            setState("sending");
            setErr("");
            try {
              await api("/me/reports", { body: { targetType: "post", targetId: postId, content: text } });
              setState("sent");
            } catch (ex) {
              setErr(ex instanceof ApiError ? (ex.fieldErrors.content ?? ex.message) : "Không gửi được, thử lại sau");
              setState("idle");
            }
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Mô tả lỗi bạn gặp (sai chính tả, ví dụ chưa đúng…)"
            className="w-full rounded-lg border border-ink/10 p-2.5 text-sm outline-none focus:border-brand-300"
          />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-ink/5">
              Huỷ
            </button>
            <button disabled={state === "sending" || text.trim().length < 5} className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {state === "sending" && <Loader2 className="size-3.5 animate-spin" />} Gửi báo lỗi
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
      <div className="h-4 w-48 animate-pulse rounded bg-ink/[.06]" />
      <div className="mt-4 h-10 w-3/4 animate-pulse rounded-lg bg-ink/[.06]" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-ink/[.05]" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3 rounded-2xl border border-ink/5 bg-white p-8">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-ink/[.05]" style={{ width: `${70 + ((i * 13) % 30)}%` }} />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-ink/[.05]" />
      </div>
    </div>
  );
}
