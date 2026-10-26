"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Lock, LogIn, SearchX, ShoppingCart } from "lucide-react";
import { Breadcrumb, LevelBadge, Pagoda, SakuraBranch } from "../site";
import VideoPlayer from "../video/VideoPlayer";
import { RichTextView } from "../RichText";
import LessonTabs, { CommentItem, useComments, useLoginRedirect, type TabKey } from "./LessonTabs";
import { CompletionChecklist, CourseCard } from "./CourseSidebar";
import { api } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { LessonData, VocabItem } from "../courses/types";

/** Tiêu đề có chữ Nhật: bọc kana/kanji bằng font-jp. */
function JpTitle({ text }: { text: string }) {
  const parts = text.split(/([぀-ヿ㐀-鿿ｦ-ﾟ～〜]+)/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="font-jp">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

function Discussion({ data, onAsk }: { data: LessonData; onAsk: () => void }) {
  const { data: res, loading, update } = useComments(data.lesson.id);
  const items = res?.items.slice(0, 3) ?? [];
  return (
    <section id="thao-luan" className="min-w-0 scroll-mt-24 rounded-2xl border border-ink/5 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold">Thảo luận &amp; Hỏi đáp ({res?.all ?? data.commentsCount})</h3>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAsk}
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-600"
        >
          Đặt câu hỏi mới
        </motion.button>
      </div>
      {loading && <div className="mt-4 h-20 animate-pulse rounded-xl bg-ink/[.04]" />}
      {!loading && !items.length && <p className="mt-4 text-sm text-muted">Chưa có câu hỏi nào. Hãy là người đầu tiên!</p>}
      <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {items.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="w-[82%] shrink-0 snap-start md:w-auto md:border-l md:border-ink/5 md:pl-4 md:first:border-0 md:first:pl-0"
          >
            <CommentItem c={c} compact onChange={update} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function LockedPanel({ data }: { data: LessonData }) {
  const { user } = useAuth();
  const toLogin = useLoginRedirect();
  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b1d2a] via-[#3a2433] to-[#1d1d2b] p-6 text-center text-white">
      <SakuraBranch className="pointer-events-none absolute -right-6 -top-6 w-48 -scale-x-100 opacity-30" />
      <div className="relative max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/10">
          <Lock className="size-7" />
        </span>
        <p className="mt-3 text-lg font-bold sm:text-xl">Bài học dành cho học viên của khóa</p>
        <p className="mt-1 text-sm text-white/70">
          Đăng ký khóa “{data.course.title}” để mở khóa video, từ vựng, ngữ pháp và tài liệu của toàn bộ {data.progress?.total ?? data.tree.reduce((s, m) => s + m.lessons.length, 0)} bài học.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!user && (
            <button onClick={toLogin} className="flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
              <LogIn className="size-4" /> Đăng nhập
            </button>
          )}
          <Link
            href={`/khoa-hoc/${data.course.slug}#dang-ky`}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
          >
            <ShoppingCart className="size-4" /> Đăng ký khóa học
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LessonPage({ slug }: { slug: string }) {
  const path = `/public/lessons/${encodeURIComponent(slug)}`;
  const { data, error, loading, mutate, reload } = useApi<LessonData>(path);
  const { user } = useAuth();
  const toLogin = useLoginRedirect();
  const [time, setTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>("vocab");
  const reported = useRef<{ lesson: string; at: number; max: number; done: boolean }>({ lesson: "", at: 0, max: 0, done: false });
  const comments = useComments(data?.lesson.id ?? null, 10);
  const lessonId = data?.lesson.id;
  const canTrack = !!user && !!data && !data.locked;
  const courseSlug = data?.course.slug;
  const myDone = !!data?.myProgress?.completed;
  const myPercent = data?.myProgress?.percent ?? 0;

  const seek = useCallback((t: number) => {
    setSeekTo(t + Math.random() * 1e-3); // giá trị mới để player tua lại cả khi trùng mốc
    document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const saveProgress = useCallback(
    async (percent: number, completed?: boolean) => {
      if (!lessonId) return;
      try {
        const r = await api<{ percent: number; completed: boolean; course: { completed: number; total: number; percent: number } }>(`/me/lessons/${lessonId}/progress`, {
          body: { percent, completed },
        });
        mutate((p) =>
          p
            ? {
                ...p,
                myProgress: { percent: r.percent, completed: r.completed },
                progress: r.course,
                tree: p.tree.map((m) => {
                  const lessons = m.lessons.map((l) => (l.id === lessonId ? { ...l, percent: r.percent, completed: r.completed } : l));
                  return { ...m, lessons, completed: lessons.filter((l) => l.completed).length };
                }),
              }
            : p!,
        );
        if (completed !== undefined || r.completed) {
          invalidate(`/public/courses/${courseSlug}`);
          invalidate("/me/courses");
          invalidate("/me/lessons/recent");
        }
      } catch {
        /* bỏ qua lỗi mạng khi lưu tiến độ */
      }
    },
    [lessonId, mutate, courseSlug],
  );

  const onProgress = useCallback(
    (cur: number, dur: number) => {
      setTime(cur);
      if (!canTrack || !dur || !lessonId) return;
      const r = reported.current;
      if (r.lesson !== lessonId) reported.current = { lesson: lessonId, at: 0, max: 0, done: myDone };
      const pct = Math.min(100, Math.round((cur / dur) * 100));
      const st = reported.current;
      st.max = Math.max(st.max, pct);
      const now = Date.now();
      if (!st.done && pct >= 90) {
        st.done = true;
        st.at = now;
        saveProgress(pct, true);
      } else if (now - st.at > 15000 && st.max > myPercent) {
        st.at = now;
        saveProgress(st.max);
      }
    },
    [canTrack, lessonId, myDone, myPercent, saveProgress],
  );

  const setVocab = (v: VocabItem[]) => mutate((p) => (p ? { ...p, vocab: v } : p!));

  const toggleBookmark = async () => {
    if (!user) return toLogin();
    if (!data) return;
    mutate((p) => (p ? { ...p, bookmarked: !p.bookmarked } : p!));
    try {
      const r = await api<{ bookmarked: boolean }>(`/me/lessons/${data.lesson.id}/bookmark`, { method: "POST" });
      mutate((p) => (p ? { ...p, bookmarked: r.bookmarked } : p!));
    } catch {
      mutate((p) => (p ? { ...p, bookmarked: !p.bookmarked } : p!));
    }
  };

  const ask = () => {
    setTab("discuss");
    document.getElementById("noi-dung")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading)
    return (
      <div className="mx-auto max-w-[1400px] px-4 pb-6 pt-24 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="space-y-4">
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink/[.06]" />
            <div className="h-9 w-2/3 animate-pulse rounded bg-ink/[.06]" />
            <div className="aspect-video animate-pulse rounded-2xl bg-ink/[.06]" />
            <div className="h-64 animate-pulse rounded-2xl bg-ink/[.04]" />
          </div>
          <div className="h-[600px] animate-pulse rounded-2xl bg-ink/[.04]" />
        </div>
      </div>
    );

  if (error || !data)
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 pt-24 text-center">
        <div>
          <SearchX className="mx-auto size-12 text-brand-300" />
          <p className="mt-3 text-lg font-bold">{error?.status === 404 ? "Không tìm thấy bài học" : "Không tải được bài học"}</p>
          <div className="mt-4 flex justify-center gap-2">
            {error?.status !== 404 && (
              <button onClick={() => reload()} className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-500">
                Thử lại
              </button>
            )}
            <Link href="/khoa-hoc" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
              Về trang khóa học
            </Link>
          </div>
        </div>
      </div>
    );

  const { lesson, course } = data;
  const completed = !!data.myProgress?.completed;
  const hasCommented = !!comments.data?.items.some((c) => c.mine || c.replies?.some((r) => r.mine));
  const currentTab: TabKey = tab === "content" && !(data.video && lesson.content) ? "vocab" : tab;

  return (
    <div className="relative bg-gradient-to-b from-brand-50/70 via-white to-white">
      <SakuraBranch className="pointer-events-none absolute -left-10 top-[40rem] hidden w-40 opacity-60 2xl:block" />
      <div className="relative mx-auto max-w-[1400px] px-4 pb-6 pt-20 sm:px-6 lg:pt-24">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_410px]">
          {/* Cột chính */}
          <div className="min-w-0 space-y-5">
            <div className="relative">
              <Pagoda className="pointer-events-none absolute -top-2 right-4 hidden h-28 opacity-25 md:block" />
              <Breadcrumb
                items={[
                  { label: "Khóa học", href: "/khoa-hoc" },
                  { label: course.title, href: `/khoa-hoc/${course.slug}` },
                  { label: data.module.title, href: `/khoa-hoc/${course.slug}#lo-trinh-hoc` },
                  { label: `Bài ${lesson.number}: ${lesson.title}` },
                ]}
              />
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-[2.1rem]"
              >
                <span>
                  Bài {lesson.number}: <JpTitle text={lesson.title} />
                </span>
                {course.level && <LevelBadge level={course.level} className="px-2.5 py-1 text-sm" />}
                {lesson.isFree && !data.enrolled && <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">Học thử miễn phí</span>}
              </motion.h1>
              {lesson.summary && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-2 text-sm text-ink/70">
                  <JpTitle text={lesson.summary} />
                </motion.p>
              )}
            </div>

            <motion.div id="video" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
              {data.locked ? (
                <LockedPanel data={data} />
              ) : data.video ? (
                <VideoPlayer
                  key={lesson.id}
                  lessonId={lesson.id}
                  videoId={data.video.videoId}
                  youtube={data.video.youtubeId}
                  poster={data.video.thumbnailUrl}
                  onProgress={onProgress}
                  onEnded={() => canTrack && !completed && saveProgress(100, true)}
                  seekTo={seekTo}
                />
              ) : (
                <div className="rounded-2xl border border-ink/5 bg-white p-5 shadow-sm sm:p-6">
                  <RichTextView html={lesson.content} className="[&_[lang=ja]]:font-jp" />
                  {canTrack && !completed && (
                    <button onClick={() => saveProgress(100, true)} className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
                      Đánh dấu đã học xong
                    </button>
                  )}
                </div>
              )}
            </motion.div>

            {!data.locked && (
              <LessonTabs data={data} setVocab={setVocab} tab={currentTab} setTab={setTab} time={time} seek={seek} commentCount={comments.data?.all ?? data.commentsCount} />
            )}
            <Discussion data={data} onAsk={ask} />
          </div>

          {/* Cột phải */}
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="min-w-0 space-y-5"
          >
            <CourseCard data={data} bookmarked={data.bookmarked} onBookmark={toggleBookmark} />
            {!data.locked && (
              <CompletionChecklist
                data={data}
                completed={completed}
                hasCommented={hasCommented}
                onComplete={(v) => (user ? saveProgress(v ? 100 : data.myProgress?.percent ?? 0, v) : toLogin())}
              />
            )}
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
