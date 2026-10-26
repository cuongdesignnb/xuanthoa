"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpenCheck,
  Bookmark,
  ChevronDown,
  Clock,
  FileText,
  Heart,
  MessageCircle,
  Mic,
  NotebookPen,
  Plus,
  Send,
  Sparkles,
  Volume2,
  Trash2,
  Loader2,
} from "lucide-react";
import { avatar } from "../ui";
import { speakJa } from "./speak";
import { RichTextView } from "../RichText";
import { api, ApiError, qs, timeAgo, type Paged } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { mmss, type CommentData, type LessonData, type NoteData, type VocabItem } from "../courses/types";

export type TabKey = "content" | "notes" | "vocab" | "grammar" | "discuss";

export const fmtTime = mmss;

/** Chuyển hướng tới đăng nhập (giữ trang hiện tại). */
export function useLoginRedirect() {
  const router = useRouter();
  const path = usePathname();
  return () => router.push(`/dang-nhap?next=${encodeURIComponent(path)}`);
}

/** "ご飯を*食べて*から" → phần trong dấu * được tô màu. */
function Marked({ text }: { text: string }) {
  const parts = text.split("*");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="font-bold text-brand-500">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Từ vựng                                                             */
/* ------------------------------------------------------------------ */

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={on} className="flex items-center gap-2 text-xs font-medium">
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-ink/20"}`}>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow ${on ? "right-0.5" : "left-0.5"}`}
        />
      </span>
      {label}
    </button>
  );
}

function VocabTab({ data, onChange }: { data: LessonData; onChange: (v: VocabItem[]) => void }) {
  const vocab = data.vocab;
  const { user } = useAuth();
  const toLogin = useLoginRedirect();
  const [showEx, setShowEx] = useState(true);
  const [all, setAll] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [practice, setPractice] = useState<number | null>(null);

  const list = all ? vocab : vocab.slice(0, 5);

  const play = (i: number, text: string) => {
    setPlaying(i);
    speakJa(text);
    setTimeout(() => setPlaying((p) => (p === i ? null : p)), 1000);
  };

  const toggleSave = async (v: VocabItem) => {
    if (!user) return toLogin();
    onChange(vocab.map((x) => (x.id === v.id ? { ...x, saved: !x.saved } : x)));
    try {
      const r = await api<{ saved: boolean }>(`/me/vocab/${v.id}/save`, { method: "POST" });
      onChange(vocab.map((x) => (x.id === v.id ? { ...x, saved: r.saved } : x)));
      invalidate("/me/vocab");
    } catch {
      onChange(vocab);
    }
  };

  // Luyện phát âm: đọc lần lượt từng từ đang hiển thị
  useEffect(() => {
    if (practice === null) return;
    const words = all ? vocab : vocab.slice(0, 5);
    if (practice >= words.length) {
      const id = setTimeout(() => setPractice(null), 0);
      return () => clearTimeout(id);
    }
    speakJa(words[practice].reading || words[practice].word, 0.8);
    const id = setTimeout(() => setPractice((p) => (p === null ? null : p + 1)), 1600);
    return () => clearTimeout(id);
  }, [practice, all, vocab]);

  if (!vocab.length)
    return (
      <div className="py-8 text-center text-sm text-muted">
        <BookOpenCheck className="mx-auto mb-2 size-8 text-brand-200" />
        Bài học này chưa có danh sách từ vựng.
      </div>
    );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold sm:text-xl">Từ vựng trong bài</h3>
          <p className="text-xs text-muted">Các từ vựng quan trọng xuất hiện trong bài học. Hãy nghe, luyện đọc và ghi nhớ nhé!</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setPractice((p) => (p === null ? 0 : null))}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              practice !== null ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500 hover:bg-brand-100"
            }`}
          >
            <Mic className={`size-4 ${practice !== null ? "animate-pulse" : ""}`} />
            {practice !== null ? "Dừng luyện" : "Luyện phát âm"}
          </motion.button>
          <Switch on={showEx} onChange={() => setShowEx((s) => !s)} label="Hiện ví dụ" />
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {list.map((v, i) => (
            <motion.li
              key={v.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, delay: i >= 5 ? (i - 5) * 0.04 : 0 }}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-3 transition md:flex-nowrap md:px-4 ${
                practice === i ? "border-brand-200 bg-brand-50/70" : "border-ink/5 hover:border-brand-100 hover:bg-brand-50/30"
              }`}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink/[.04] text-[11px] font-semibold text-muted">{i + 1}</span>
              <span className="w-[68px] shrink-0 md:w-20">
                <span className="block font-jp text-lg font-bold leading-tight md:text-xl">{v.word}</span>
                <span className="block text-[10px] text-muted md:hidden">
                  <span className="font-jp">{v.reading}</span> {v.romaji && <>· {v.romaji}</>}
                </span>
              </span>
              <span className="hidden w-[72px] shrink-0 md:block">
                <span className="block font-jp text-xs">{v.reading}</span>
                <span className="block text-xs text-muted">{v.romaji}</span>
              </span>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => play(i, v.reading || v.word)}
                aria-label={`Nghe ${v.word}`}
                className={`relative grid size-9 shrink-0 place-items-center rounded-full transition ${
                  playing === i ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500 hover:bg-brand-100"
                }`}
              >
                {playing === i && <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/40" />}
                <Volume2 className="relative size-[18px]" />
              </motion.button>
              <span className="hidden w-[86px] shrink-0 text-xs text-muted sm:block">{v.pos}</span>
              <span className={`min-w-0 flex-1 text-sm ${showEx && v.exampleJa ? "md:w-28 md:flex-none" : ""}`}>{v.meaning}</span>
              <AnimatePresence initial={false}>
                {showEx && v.exampleJa && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="order-last flex min-w-0 basis-full gap-2 border-ink/5 md:order-none md:basis-auto md:flex-1 md:border-l md:pl-4"
                  >
                    <button
                      onClick={() => speakJa(v.exampleJa!.replace(/\*/g, ""))}
                      aria-label="Nghe ví dụ"
                      className="mt-0.5 shrink-0 text-ink/40 transition hover:text-brand-500"
                    >
                      <Volume2 className="size-3.5" />
                    </button>
                    <span className="min-w-0">
                      <span className="block font-jp text-[13px]">
                        <Marked text={v.exampleJa} />
                      </span>
                      {v.exampleRomaji && <span className="block text-[11px] text-muted">{v.exampleRomaji}</span>}
                      {v.exampleVi && <span className="block text-[11px] text-muted">{v.exampleVi}</span>}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileTap={{ scale: 1.3 }}
                onClick={() => toggleSave(v)}
                aria-label={v.saved ? "Bỏ lưu từ" : "Lưu từ"}
                title={v.saved ? "Bỏ lưu từ" : "Lưu vào sổ từ vựng"}
                aria-pressed={v.saved}
                className="ml-auto shrink-0 md:ml-0"
              >
                <Bookmark className={`size-5 transition ${v.saved ? "fill-brand-500 text-brand-500" : "text-ink/40 hover:text-brand-500"}`} />
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {vocab.length > 5 && (
        <button
          onClick={() => setAll((a) => !a)}
          className="mx-auto mt-3 flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-semibold text-brand-500 transition hover:bg-brand-50"
        >
          {all ? "Thu gọn" : `Xem thêm ${vocab.length - 5} từ vựng`}
          <ChevronDown className={`size-4 transition-transform ${all ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ngữ pháp / nội dung                                                 */
/* ------------------------------------------------------------------ */

function HtmlTab({ html, empty, icon }: { html: string | null; empty: string; icon: React.ReactNode }) {
  if (!html)
    return (
      <div className="py-8 text-center text-sm text-muted">
        <span className="mx-auto mb-2 block w-fit text-brand-200">{icon}</span>
        {empty}
      </div>
    );
  return <RichTextView html={html} className="[&_[lang=ja]]:font-jp [&_td[lang=ja]]:font-jp" />;
}

/* ------------------------------------------------------------------ */
/* Ghi chú                                                             */
/* ------------------------------------------------------------------ */

function NotesTab({ data, time, seek }: { data: LessonData; time: number; seek: (t: number) => void }) {
  const { user } = useAuth();
  const toLogin = useLoginRedirect();
  const path = user ? `/me/lessons/${data.lesson.id}/notes` : null;
  const { data: res, loading, mutate } = useApi<{ items: NoteData[] }>(path);
  const notes = res?.items ?? [];
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    if (!user) return toLogin();
    if (!draft.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const n = await api<NoteData>(`/me/lessons/${data.lesson.id}/notes`, { body: { content: draft.trim(), atSec: Math.floor(time) } });
      mutate((p) => ({ items: [...(p?.items ?? []), n].sort((a, b) => a.atSec - b.atSec) }));
      invalidate(`/me/courses/${data.course.id}/notes`);
      setDraft("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Không lưu được ghi chú");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (n: NoteData) => {
    mutate((p) => ({ items: (p?.items ?? []).filter((x) => x.id !== n.id) }));
    try {
      await api(`/me/notes/${n.id}`, { method: "DELETE" });
      invalidate(`/me/courses/${data.course.id}/notes`);
    } catch {
      mutate((p) => ({ items: [...(p?.items ?? []), n].sort((a, b) => a.atSec - b.atSec) }));
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold sm:text-xl">Ghi chú của bạn</h3>
      <p className="text-xs text-muted">Ghi chú được gắn với thời điểm trong video. Nhấn vào mốc thời gian để xem lại.</p>
      <div className="mt-4 rounded-xl border border-ink/10 p-3 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => !user && toLogin()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add();
          }}
          rows={2}
          maxLength={2000}
          placeholder={user ? "Viết ghi chú tại thời điểm hiện tại... (Ctrl + Enter để lưu)" : "Đăng nhập để ghi chú bài học"}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted/70"
        />
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-500">
            <Clock className="size-3" /> {fmtTime(time)}
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={add}
            disabled={!draft.trim() || busy}
            className="flex items-center gap-1 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Thêm ghi chú
          </motion.button>
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
      {user && loading && <div className="mt-4 h-12 animate-pulse rounded-xl bg-ink/[.04]" />}
      {user && !loading && !notes.length && <p className="mt-4 text-center text-xs text-muted">Chưa có ghi chú nào cho bài học này.</p>}
      <ul className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {notes.map((n) => (
            <motion.li
              key={n.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="group flex items-start gap-3 rounded-xl border border-ink/5 p-3"
            >
              <button
                onClick={() => seek(n.atSec)}
                className="shrink-0 rounded-md bg-ink/[.04] px-2 py-1 text-[11px] font-semibold tabular-nums text-brand-500 transition hover:bg-brand-100"
              >
                {fmtTime(n.atSec)}
              </button>
              <p className="min-w-0 flex-1 whitespace-pre-line text-sm">{n.content}</p>
              <button
                onClick={() => remove(n)}
                aria-label="Xóa ghi chú"
                className="shrink-0 text-ink/30 opacity-100 transition hover:text-brand-500 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thảo luận                                                           */
/* ------------------------------------------------------------------ */

export const commentsPath = (lessonId: string, pageSize = 10) => `/public/lessons/${lessonId}/comments${qs({ pageSize })}`;
type CommentsRes = Paged<CommentData> & { all: number };

const isTeacher = (role: string) => role !== "student";
const userAvatar = (u: CommentData["user"]) => u.avatarUrl || avatar(u.name, isTeacher(u.role) ? "dbeafe" : "ffe3e3");

export function CommentItem({
  c,
  compact = false,
  onReply,
  onChange,
}: {
  c: CommentData;
  compact?: boolean;
  onReply?: (c: CommentData) => void;
  onChange?: (c: CommentData) => void;
}) {
  const { user } = useAuth();
  const toLogin = useLoginRedirect();
  const like = async () => {
    if (!user) return toLogin();
    const optimistic = { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) };
    onChange?.(optimistic);
    try {
      const r = await api<{ liked: boolean; likes: number }>(`/me/comments/${c.id}/like`, { method: "POST" });
      onChange?.({ ...c, liked: r.liked, likes: r.likes });
    } catch {
      onChange?.(c);
    }
  };
  return (
    <div className="flex min-w-0 gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={userAvatar(c.user)} alt={c.user.name} className="size-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-xs">
          <b>{c.user.name}</b>
          {isTeacher(c.user.role) && <span className="rounded bg-brand-500 px-1.5 py-px text-[9px] font-semibold text-white">Giáo viên</span>}
          <span className="text-[10px] text-muted">{timeAgo(c.createdAt)}</span>
        </p>
        <p className={`mt-1 whitespace-pre-line text-xs leading-relaxed text-ink/80 ${compact ? "line-clamp-3" : ""}`}>{c.content}</p>
        <div className="mt-1.5 flex items-center gap-4 text-[11px] text-muted">
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={like}
            disabled={!onChange}
            className={`flex items-center gap-1 transition ${c.liked ? "text-brand-500" : "hover:text-brand-500"}`}
          >
            <Heart className={`size-3.5 ${c.liked ? "fill-brand-500" : ""}`} /> {c.likes}
          </motion.button>
          {onReply && (
            <button onClick={() => onReply(c)} className="transition hover:text-brand-500">
              Trả lời
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Dùng chung cho tab Thảo luận và khối Thảo luận cuối trang. */
export function useComments(lessonId: string | null, pageSize = 10) {
  const res = useApi<CommentsRes>(lessonId ? commentsPath(lessonId, pageSize) : null);
  const update = (c: CommentData) =>
    res.mutate((p) =>
      p
        ? {
            ...p,
            items: p.items.map((x) =>
              x.id === c.id ? { ...c, replies: x.replies } : { ...x, replies: x.replies?.map((r) => (r.id === c.id ? c : r)) },
            ),
          }
        : p!,
    );
  return { ...res, update };
}

function DiscussTab({ data }: { data: LessonData }) {
  const { user } = useAuth();
  const toLogin = useLoginRedirect();
  const [size, setSize] = useState(10);
  const { data: res, loading, mutate, update, validating } = useComments(data.lesson.id, size);
  const items = res?.items ?? [];
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<CommentData | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const post = async () => {
    if (!user) return toLogin();
    if (!draft.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const c = await api<CommentData>(`/me/lessons/${data.lesson.id}/comments`, { body: { content: draft.trim(), parentId: replyTo?.id ?? null } });
      mutate((p) => {
        const base = p ?? { items: [], total: 0, all: 0, page: 1, pageSize: size };
        if (replyTo)
          return { ...base, all: base.all + 1, items: base.items.map((x) => (x.id === replyTo.id ? { ...x, replies: [...(x.replies ?? []), c] } : x)) };
        return { ...base, all: base.all + 1, total: base.total + 1, items: [c, ...base.items] };
      });
      invalidate(`/public/lessons/${data.lesson.id}/comments`);
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      setErr(e instanceof ApiError ? (e.fieldErrors.content ?? e.message) : "Không gửi được bình luận");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: CommentData) => {
    await api(`/me/comments/${c.id}`, { method: "DELETE" }).catch(() => null);
    invalidate(`/public/lessons/${data.lesson.id}/comments`);
  };

  return (
    <div>
      <h3 className="text-lg font-bold sm:text-xl">Thảo luận ({res?.all ?? data.commentsCount})</h3>
      <div className="mt-4 flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user?.avatarUrl || avatar(user?.name ?? "Khách")} alt="" className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          {replyTo && (
            <p className="mb-1 flex items-center gap-2 text-[11px] text-muted">
              Trả lời <b className="text-ink">{replyTo.user.name}</b>
              <button onClick={() => setReplyTo(null)} className="text-brand-500">
                Huỷ
              </button>
            </p>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => !user && toLogin()}
              onKeyDown={(e) => e.key === "Enter" && post()}
              maxLength={2000}
              placeholder={user ? "Đặt câu hỏi hoặc chia sẻ ý kiến của bạn..." : "Đăng nhập để tham gia thảo luận"}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={post}
              aria-label="Gửi"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-white disabled:opacity-40"
              disabled={!draft.trim() || busy}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </motion.button>
          </div>
          {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
        </div>
      </div>
      {loading && (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-ink/[.04]" />
          ))}
        </div>
      )}
      {!loading && !items.length && <p className="mt-6 text-center text-sm text-muted">Chưa có thảo luận nào — hãy là người đầu tiên đặt câu hỏi!</p>}
      <ul className="mt-5 space-y-4">
        <AnimatePresence initial={false}>
          {items.map((c) => (
            <motion.li key={c.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border-b border-ink/5 pb-4 last:border-0">
              <CommentItem c={c} onReply={setReplyTo} onChange={update} />
              {c.mine && (
                <button onClick={() => remove(c)} className="ml-12 mt-1 text-[11px] text-muted hover:text-brand-500">
                  Xoá
                </button>
              )}
              {!!c.replies?.length && (
                <ul className="ml-12 mt-3 space-y-3 border-l-2 border-brand-100 pl-4">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <CommentItem c={r} onChange={update} />
                    </li>
                  ))}
                </ul>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {res && res.total > items.length && (
        <button
          onClick={() => setSize((s) => s + 10)}
          disabled={validating}
          className="mx-auto mt-3 flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-semibold text-brand-500 transition hover:bg-brand-50 disabled:opacity-50"
        >
          {validating ? "Đang tải…" : `Xem thêm ${res.total - items.length} thảo luận`}
          <ChevronDown className="size-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function LessonTabs({
  data,
  setVocab,
  tab,
  setTab,
  time,
  seek,
  commentCount,
}: {
  data: LessonData;
  setVocab: (v: VocabItem[]) => void;
  tab: TabKey;
  setTab: (t: TabKey) => void;
  time: number;
  seek: (t: number) => void;
  commentCount: number;
}) {
  const tabs: { k: TabKey; label: string; icon: typeof NotebookPen }[] = [
    ...(data.video && data.lesson.content ? [{ k: "content" as const, label: "Bài giảng", icon: FileText }] : []),
    { k: "notes", label: "Ghi chú", icon: NotebookPen },
    { k: "vocab", label: `Từ vựng (${data.vocabCount})`, icon: BookOpenCheck },
    { k: "grammar", label: "Ngữ pháp", icon: Sparkles },
    { k: "discuss", label: `Thảo luận (${commentCount})`, icon: MessageCircle },
  ];
  return (
    <section id="noi-dung" className="min-w-0 scroll-mt-24 rounded-2xl border border-ink/5 bg-white shadow-sm">
      <div className="no-scrollbar flex overflow-x-auto border-b border-ink/5 px-2 sm:px-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-sm transition sm:flex-1 sm:justify-center ${
                on ? "font-semibold text-brand-500" : "text-ink/70 hover:text-ink"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
              {on && <motion.span layoutId="lesson-tab" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>
      <div className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            {tab === "content" && <HtmlTab html={data.lesson.content} empty="Bài học chưa có nội dung." icon={<FileText className="size-8" />} />}
            {tab === "vocab" && <VocabTab data={data} onChange={setVocab} />}
            {tab === "grammar" && <HtmlTab html={data.lesson.grammar} empty="Bài học này không có phần ngữ pháp riêng." icon={<Sparkles className="size-8" />} />}
            {tab === "notes" && <NotesTab data={data} time={time} seek={seek} />}
            {tab === "discuss" && <DiscussTab data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {data.quiz && (
        <div className="border-t border-ink/5 px-4 py-3 text-xs sm:px-6">
          Bài tập đi kèm:{" "}
          <Link href={`/bai-tap/${data.quiz.slug}`} className="font-semibold text-brand-500">
            {data.quiz.title}
          </Link>
        </div>
      )}
    </section>
  );
}
