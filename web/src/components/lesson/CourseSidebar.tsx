"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BarChart3, Bookmark, Check, CheckCircle2, ChevronDown, ChevronRight, Download, Lock, PlayCircle, Share2 } from "lucide-react";
import { Pagoda } from "../site";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { fileSize, minutesLabel, mmss, type LessonData, type LessonResource, type NoteData } from "../courses/types";
import { useLoginRedirect } from "./LessonTabs";

const SIDE_TABS = ["Danh sách bài học", "Tài liệu bài học", "Ghi chú của tôi"];

function FileIcon({ kind }: { kind: string }) {
  const pdf = kind.toUpperCase() === "PDF";
  return (
    <span className="relative h-9 w-7 shrink-0">
      <svg viewBox="0 0 28 36" className="size-full">
        <path d="M2 2h16l8 8v24H2z" fill={pdf ? "#fde2e2" : "#dbeafe"} />
        <path d="M18 2v8h8" fill={pdf ? "#f6a5a5" : "#93c5fd"} />
      </svg>
      <span className={`absolute bottom-1 left-0 rounded-sm px-0.5 text-[7px] font-bold text-white ${pdf ? "bg-brand-500" : "bg-sky-500"}`}>{kind.slice(0, 4)}</span>
    </span>
  );
}

function Docs({ items, locked }: { items: LessonResource[]; locked: boolean }) {
  const [state, setState] = useState<Record<string, "loading" | "done">>({});
  const toLogin = useLoginRedirect();
  const { user } = useAuth();
  const dl = async (d: LessonResource) => {
    if (!d.fileUrl) return user ? undefined : toLogin();
    if (state[d.id] === "loading") return;
    setState((s) => ({ ...s, [d.id]: "loading" }));
    try {
      const r = await api<{ url: string }>(`/public/lesson-resources/${d.id}/download`, { method: "POST" });
      const a = document.createElement("a");
      a.href = r.url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.download = "";
      a.click();
      setState((s) => ({ ...s, [d.id]: "done" }));
    } catch {
      setState((s) => {
        const n = { ...s };
        delete n[d.id];
        return n;
      });
    }
  };
  if (!items.length) return <p className="py-4 text-center text-xs text-muted">Bài học này chưa có tài liệu đính kèm.</p>;
  return (
    <ul className="space-y-1">
      {items.map((d) => (
        <li key={d.id} className="flex items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-brand-50/40">
          <FileIcon kind={d.fileType} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">{d.title}</span>
            <span className="block text-[10px] text-muted">{fileSize(d.sizeBytes)}</span>
          </span>
          {!d.fileUrl ? (
            <span className="flex shrink-0 items-center gap-1 rounded-lg border border-ink/10 px-3 py-1.5 text-[11px] font-semibold text-muted" title={locked ? "Đăng ký khóa học để tải" : ""}>
              <Lock className="size-3.5" /> Khoá
            </span>
          ) : (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => dl(d)}
              className={`flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
                state[d.id] === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-brand-100 text-brand-500 hover:bg-brand-50"
              }`}
            >
              {state[d.id] === "done" ? (
                <>
                  <Check className="size-3.5" /> Đã tải
                </>
              ) : state[d.id] === "loading" ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="size-3 rounded-full border-2 border-brand-300 border-t-transparent"
                  />
                  Đang tải
                </>
              ) : (
                <>
                  <Download className="size-3.5" /> Tải xuống
                </>
              )}
            </motion.button>
          )}
        </li>
      ))}
    </ul>
  );
}

function ChapterList({ data }: { data: LessonData }) {
  const curModule = data.tree.findIndex((m) => m.lessons.some((l) => l.id === data.lesson.id));
  const [open, setOpen] = useState<number[]>([Math.max(0, curModule)]);
  const toggle = (i: number) => setOpen((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));

  return (
    <div className="no-scrollbar max-h-[560px] space-y-2 overflow-y-auto">
      {data.tree.map((c, ci) => {
        const isOpen = open.includes(ci);
        const active = ci === curModule;
        return (
          <div key={c.id} className={`overflow-hidden rounded-xl ${isOpen ? "bg-ink/[.02] ring-1 ring-ink/5" : "bg-ink/[.03]"}`}>
            <button onClick={() => toggle(ci)} aria-expanded={isOpen} className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left">
              <span className={`size-2.5 shrink-0 rounded-full ${active ? "bg-brand-500" : "bg-ink/25"}`} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {c.title} <span className="font-normal text-muted">({c.lessons.length} bài)</span>
              </span>
              <span className={`text-xs font-semibold ${active ? "text-brand-500" : "text-ink/70"}`}>
                {c.completed}/{c.lessons.length}
              </span>
              <ChevronDown className={`size-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white"
                >
                  {c.lessons.map((l) => {
                    const cur = l.id === data.lesson.id;
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/hoc/${l.slug}`}
                          className={`relative flex items-center gap-3 border-t border-ink/5 px-3.5 py-3 text-xs transition ${
                            cur ? "bg-brand-50 font-semibold text-brand-500" : "hover:bg-brand-50/40"
                          }`}
                        >
                          {cur && <motion.span layoutId="cur-lesson" className="absolute inset-y-0 left-0 w-1 bg-brand-500" />}
                          {l.completed ? (
                            <CheckCircle2 className="size-[18px] shrink-0 fill-emerald-500 text-white" />
                          ) : cur ? (
                            <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-brand-500 text-white">
                              <PlayCircle className="size-[18px] fill-brand-500 text-white" />
                            </span>
                          ) : l.locked ? (
                            <Lock className="size-[16px] shrink-0 text-ink/30" />
                          ) : (
                            <PlayCircle className="size-[18px] shrink-0 text-ink/30" />
                          )}
                          <span className="min-w-0 flex-1 truncate">
                            Bài {l.number}: {l.title}
                          </span>
                          <span className="shrink-0 text-[10px] font-normal text-muted">{minutesLabel(l.durationSec)}</span>
                          {l.completed ? (
                            <span className="grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-emerald-500 text-emerald-500">
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                          ) : cur ? (
                            <span className="flex h-[18px] w-[18px] shrink-0 items-end justify-center gap-[2px]" aria-label="Đang học">
                              {[0.5, 0.9, 0.7].map((h, i) => (
                                <motion.span
                                  key={i}
                                  animate={{ height: [`${h * 100}%`, "30%", `${h * 100}%`] }}
                                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                                  className="w-[3px] rounded-sm bg-brand-500"
                                />
                              ))}
                            </span>
                          ) : (
                            <span className="relative size-[18px] shrink-0 rounded-full border-[1.5px] border-ink/20">
                              {l.percent > 0 && (
                                <span className="absolute inset-[3px] rounded-full bg-emerald-300" style={{ opacity: Math.max(0.3, l.percent / 100) }} />
                              )}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function MyNotes({ data }: { data: LessonData }) {
  const { user } = useAuth();
  const { data: res, loading } = useApi<{ items: NoteData[] }>(user ? `/me/courses/${data.course.id}/notes` : null);
  if (!user) return <p className="py-4 text-center text-xs text-muted">Đăng nhập để xem ghi chú của bạn.</p>;
  if (loading) return <div className="h-20 animate-pulse rounded-xl bg-ink/[.04]" />;
  const items = res?.items ?? [];
  if (!items.length) return <p className="py-4 text-center text-xs text-muted">Bạn chưa có ghi chú nào trong khóa học này.</p>;
  const num = new Map(data.tree.flatMap((m) => m.lessons.map((l) => [l.id, l.number] as const)));
  return (
    <ul className="no-scrollbar max-h-[420px] space-y-2 overflow-y-auto text-xs">
      {items.map((n) => (
        <li key={n.id}>
          <Link href={`/hoc/${n.lesson?.slug}`} className="block rounded-xl border border-ink/5 p-3 transition hover:border-brand-100">
            <p className="text-[10px] font-semibold text-brand-500">
              Bài {num.get(n.lesson?.id ?? "") ?? "?"} · {mmss(n.atSec)}
            </p>
            <p className="mt-0.5 line-clamp-3 text-ink/80">{n.content}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CourseCard({ data, bookmarked, onBookmark }: { data: LessonData; bookmarked: boolean; onBookmark: () => void }) {
  const [tab, setTab] = useState(0);
  const [shared, setShared] = useState(false);
  const p = data.progress;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `Bài ${data.lesson.number}: ${data.lesson.title} | Nihongo+`, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      /* người dùng hủy chia sẻ */
    }
  };

  return (
    <div className="min-w-0 rounded-2xl border border-ink/5 bg-white shadow-sm">
      {/* Đầu thẻ: tên khóa + tiến độ + ảnh Phú Sĩ */}
      <div className="relative overflow-hidden rounded-t-2xl p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[55%]">
          <Image
            src="https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80"
            alt=""
            fill
            sizes="240px"
            className="object-cover object-[50%_60%] opacity-60 [mask-image:linear-gradient(to_right,transparent,black_60%)]"
          />
          <Pagoda className="absolute bottom-1 right-6 h-20 opacity-90" />
        </div>
        <div className="relative">
          <Link href={`/khoa-hoc/${data.course.slug}`} className="text-lg font-extrabold hover:text-brand-500 sm:text-xl">
            {data.course.title}
          </Link>
          {p ? (
            <>
              <p className="mt-2 text-xs font-medium">Tiến độ khóa học</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 w-[70%] overflow-hidden rounded-full bg-ink/10">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${p.percent}%` }} transition={{ duration: 1.2, delay: 0.3 }} className="h-full rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-bold">{p.percent}%</span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                {p.completed}/{p.total} bài đã hoàn thành
              </p>
            </>
          ) : (
            <p className="mt-2 max-w-[60%] text-xs text-muted">Đăng nhập để lưu tiến độ học tập của bạn.</p>
          )}
        </div>
      </div>

      <div className="px-3 pb-4 sm:px-4">
        <div className="no-scrollbar flex overflow-x-auto rounded-xl border border-ink/5">
          {SIDE_TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`relative flex-1 shrink-0 whitespace-nowrap px-3 py-3 text-xs transition ${tab === i ? "font-semibold text-brand-500" : "text-ink/70 hover:text-ink"}`}
            >
              {t}
              {tab === i && <motion.span layoutId="side-tab" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {tab === 0 && <ChapterList data={data} />}
              {tab === 1 && <Docs items={data.resources} locked={data.locked} />}
              {tab === 2 && <MyNotes data={data} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {data.next ? (
          <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} className="mt-4">
            <Link
              href={`/hoc/${data.next.slug}`}
              className="group flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
            >
              <span className="truncate">
                Bài tiếp theo: Bài {data.next.number}: {data.next.title}
              </span>
              {data.next.locked ? <Lock className="size-4 shrink-0" /> : <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />}
            </Link>
          </motion.div>
        ) : (
          <Link
            href={`/khoa-hoc/${data.course.slug}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-3.5 text-sm font-semibold text-white"
          >
            🎉 Bài cuối khóa — xem lại khóa học
          </Link>
        )}
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBookmark}
            aria-pressed={bookmarked}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition ${
              bookmarked ? "border-brand-200 bg-brand-50 text-brand-500" : "border-ink/10 text-brand-500 hover:bg-brand-50/50"
            }`}
          >
            <motion.span key={String(bookmarked)} initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
              <Bookmark className={`size-4 ${bookmarked ? "fill-brand-500" : ""}`} />
            </motion.span>
            {bookmarked ? "Đã lưu bài học" : "Lưu bài học"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={share}
            className="flex items-center justify-center gap-2 rounded-xl border border-ink/10 py-2.5 text-xs font-semibold transition hover:bg-ink/[.03]"
          >
            {shared ? <Check className="size-4 text-emerald-500" /> : <Share2 className="size-4" />}
            {shared ? "Đã sao chép" : "Chia sẻ"}
          </motion.button>
        </div>
      </div>

      {/* Tài liệu */}
      <div className="border-t border-ink/5 px-4 py-4 sm:px-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-bold">Tài liệu và bài tập</h3>
          <button onClick={() => setTab(1)} className="flex items-center gap-0.5 text-xs font-semibold text-brand-500">
            Tất cả <ChevronRight className="size-3.5" />
          </button>
        </div>
        <Docs items={data.resources.slice(0, 3)} locked={data.locked} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Checklist hoàn thành bài học                                        */
/* ------------------------------------------------------------------ */

type CheckKey = "video" | "vocab" | "grammar" | "exercise" | "discuss";

export function CompletionChecklist({
  data,
  completed,
  onComplete,
  hasCommented,
}: {
  data: LessonData;
  completed: boolean;
  onComplete: (v: boolean) => void;
  hasCommented: boolean;
}) {
  const storeKey = `nh-check-${data.lesson.id}`;
  const [local, setLocal] = useState<Partial<Record<CheckKey, boolean>>>({});
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setLocal(JSON.parse(window.localStorage.getItem(storeKey) ?? "{}"));
      } catch {
        setLocal({});
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [storeKey]);
  const setKey = (k: CheckKey, v: boolean) =>
    setLocal((s) => {
      const n = { ...s, [k]: v };
      try {
        window.localStorage.setItem(storeKey, JSON.stringify(n));
      } catch {
        /* bỏ qua */
      }
      return n;
    });

  const exerciseHref = data.quiz ? `/bai-tap/${data.quiz.slug}` : `/bai-tap${data.course.level ? `?level=${data.course.level}` : ""}`;
  const checks: { k: CheckKey; t: string; done: boolean; toggle: () => void; cta?: { label: string; href: string; solid: boolean } }[] = [
    {
      k: "video",
      t: data.video ? `Xem video bài giảng (${mmss(data.video.durationSec ?? data.lesson.durationSec)})` : "Đọc nội dung bài học",
      done: completed,
      toggle: () => onComplete(!completed),
    },
    ...(data.vocabCount
      ? [{ k: "vocab" as const, t: `Học xong ${data.vocabCount} từ vựng`, done: !!local.vocab, toggle: () => setKey("vocab", !local.vocab) }]
      : []),
    ...(data.lesson.grammar || data.locked
      ? [{ k: "grammar" as const, t: "Đọc qua phần ngữ pháp", done: !!local.grammar, toggle: () => setKey("grammar", !local.grammar) }]
      : []),
    ...(data.lesson.hasExercise
      ? [
          {
            k: "exercise" as const,
            t: "Làm bài tập luyện tập",
            done: !!local.exercise,
            toggle: () => setKey("exercise", !local.exercise),
            cta: { label: "Làm bài tập", href: exerciseHref, solid: true },
          },
        ]
      : []),
    {
      k: "discuss",
      t: "Tham gia thảo luận",
      done: hasCommented || !!local.discuss,
      toggle: () => setKey("discuss", !local.discuss),
      cta: { label: "Thảo luận ngay", href: "#thao-luan", solid: false },
    },
  ];
  const count = checks.filter((c) => c.done).length;
  const all = count === checks.length;
  return (
    <div className="min-w-0 rounded-2xl border border-ink/5 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Hoàn thành bài học</h3>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-muted">
          <BarChart3 className="size-3.5 text-brand-500" /> {count}/{checks.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/5">
        <motion.div
          animate={{ width: `${(count / checks.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="h-full rounded-full bg-emerald-500"
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {checks.map((c) => (
          <li key={c.k} className="flex items-center gap-2">
            <button onClick={c.toggle} className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-left text-xs">
              <span className={`grid size-4 shrink-0 place-items-center rounded border-[1.5px] transition ${c.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-ink/25"}`}>
                {c.done && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="size-3" strokeWidth={3.5} />
                  </motion.span>
                )}
              </span>
              <span className={`truncate ${c.done ? "text-ink/80" : ""}`}>{c.t}</span>
            </button>
            {c.cta && !c.done && (
              <Link
                href={c.cta.href}
                className={`shrink-0 rounded-lg px-4 py-1.5 text-[11px] font-semibold transition ${
                  c.cta.solid ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600" : "bg-brand-50 text-brand-500 hover:bg-brand-100"
                }`}
              >
                {c.cta.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {all && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-center text-xs font-semibold text-emerald-700"
          >
            🎉 Tuyệt vời! Bạn đã hoàn thành Bài {data.lesson.number}.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
