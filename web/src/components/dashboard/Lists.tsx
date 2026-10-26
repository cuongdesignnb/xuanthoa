"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BookOpenText, CheckCircle2, ClipboardList, Gift, Headphones, Languages, PenTool, Star, Volume2 } from "lucide-react";
import { avatar } from "../ui";
import { speakJa } from "../lesson/speak";
import { api } from "@/lib/api";
import { JpText, relDay, type DashboardData } from "./types";

const cardCls = "min-w-0 rounded-2xl border border-ink/5 bg-white p-4 shadow-sm sm:p-5";

function Head({ title, sub, href = "#" }: { title: string; sub?: string; href?: string }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-bold">{title}</h3>
        {sub && <p className="text-[11px] text-muted">{sub}</p>}
      </div>
      <Link href={href} className="group flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-500">
        Xem tất cả <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

const rowAnim = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};
const listAnim = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, margin: "-40px" },
  variants: { show: { transition: { staggerChildren: 0.07 } } },
} as const;

/* ------------------------------------------------------------------ */

const ART = [
  { seed: "Hana", bg: "#ffe3e6" },
  { seed: "Yuki", bg: "#f3ede4" },
  { seed: "Mai", bg: "#eef0f3" },
  { seed: "Sakura", bg: "#ffe9ec" },
];
const firstJp = (t: string, fallback: string) => t.match(/[\u3040-\u30ff\u3400-\u9fff]/)?.[0] ?? fallback;

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-[12px] text-muted">{text}</p>;
}

export function RecentLessons({ items }: { items: DashboardData["recentLessons"] }) {
  return (
    <section className={cardCls}>
      <Head title="Bài học gần đây" href={items[0] ? `/hoc/${items[0].slug}` : "/khoa-hoc"} />
      {!items.length && <Empty text="Bạn chưa học bài nào — bắt đầu ngay hôm nay nhé!" />}
      <motion.ul {...listAnim} className="space-y-1">
        {items.map((r, i) => {
          const art = ART[i % ART.length];
          return (
            <motion.li key={r.slug} variants={rowAnim}>
              <Link href={`/hoc/${r.slug}`} className="group flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-brand-50/60">
                <span
                  className="relative flex h-11 w-[76px] shrink-0 items-center overflow-hidden rounded-lg ring-1 ring-ink/5"
                  style={{ background: art.bg }}
                >
                  <span className="pl-2 font-jp text-lg font-bold text-ink/80">{firstJp(r.title, r.level ?? "日")}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar(art.seed, "transparent")} alt="" className="absolute -bottom-1 right-0 h-12 w-auto transition-transform group-hover:scale-110" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold group-hover:text-brand-500">
                    <JpText text={r.title} />
                  </span>
                  <span className="block text-[10px] font-medium text-brand-500">{r.tag}</span>
                </span>
                <span className={`flex shrink-0 items-center gap-1 text-[11px] font-semibold ${r.percent >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                  <CheckCircle2 className={`size-4 text-white ${r.percent >= 100 ? "fill-emerald-500" : "fill-amber-400"}`} /> {r.percent}%
                </span>
                <span className="hidden w-20 shrink-0 text-right text-[10px] text-muted sm:block">{relDay(r.updatedAt)}</span>
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const POS_TONE: Record<string, string> = {
  "Động từ": "bg-sky-50 text-sky-500",
  "Danh từ": "bg-violet-50 text-violet-500",
  "Tính từ": "bg-emerald-50 text-emerald-600",
};

export function SavedVocab({ items }: { items: DashboardData["savedVocab"]["items"] }) {
  const [unsaved, setUnsaved] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<number | null>(null);
  const VOCAB = items.map((x) => {
    const tag = x.pos ? x.pos.split(/[,(]/)[0].trim() : "Từ vựng";
    return { id: x.id, k: x.word, r: x.reading ?? x.word, m: x.meaning, tag, tone: POS_TONE[tag] ?? "bg-amber-50 text-amber-600" };
  });
  const toggleStar = async (id: string) => {
    const nextSaved = !!unsaved[id];
    setUnsaved((s) => ({ ...s, [id]: !nextSaved }));
    try {
      await api(`/me/dashboard/saved-vocab/${id}`, { body: { saved: nextSaved } });
    } catch {
      setUnsaved((s) => ({ ...s, [id]: nextSaved }));
    }
  };
  return (
    <section id="tu-vung" className={cardCls}>
      <Head title="Từ vựng đã lưu" />
      {!VOCAB.length && <Empty text="Nhấn ☆ ở bài học để lưu từ vựng ôn tập tại đây." />}
      <motion.ul {...listAnim} className="divide-y divide-ink/5">
        {VOCAB.map((v, i) => (
          <motion.li key={v.id} variants={rowAnim} className="flex items-center gap-3 py-2.5">
            <motion.button
              whileTap={{ scale: 0.85 }}
              aria-label={`Nghe ${v.k}`}
              onClick={() => {
                setPlaying(i);
                speakJa(v.r);
                setTimeout(() => setPlaying(null), 900);
              }}
              className={`grid size-8 shrink-0 place-items-center rounded-full transition ${playing === i ? "bg-brand-500 text-white" : "text-brand-500 hover:bg-brand-50"}`}
            >
              <Volume2 className="size-[18px]" />
            </motion.button>
            <span className="w-20 shrink-0">
              <span className="block font-jp text-[15px] font-bold leading-tight">{v.k}</span>
              <span className="block font-jp text-[10px] text-muted">{v.r}</span>
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">{v.m}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${v.tone}`}>{v.tag}</span>
            <motion.button
              whileTap={{ scale: 1.4, rotate: 20 }}
              aria-label={!unsaved[v.id] ? "Bỏ lưu" : "Lưu"}
              onClick={() => toggleStar(v.id)}
              className="shrink-0"
            >
              <Star className={`size-[18px] transition ${!unsaved[v.id] ? "fill-amber-400 text-amber-400" : "text-ink/25"}`} />
            </motion.button>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const SKILL_ICON: Record<string, { icon: typeof ClipboardList; tone: string }> = {
  grammar: { icon: ClipboardList, tone: "bg-amber-50 text-amber-500" },
  listening: { icon: Headphones, tone: "bg-violet-50 text-violet-500" },
  vocab: { icon: BookOpenText, tone: "bg-brand-50 text-brand-500" },
  kanji: { icon: PenTool, tone: "bg-sky-50 text-sky-500" },
  reading: { icon: BookOpenText, tone: "bg-emerald-50 text-emerald-600" },
  communication: { icon: Languages, tone: "bg-pink-50 text-pink-500" },
};

export function SuggestedExercises({ items, level }: { items: DashboardData["suggested"]; level: string | null }) {
  const SUGGEST = items.map((x) => ({ ...(SKILL_ICON[x.skill] ?? SKILL_ICON.grammar), slug: x.slug, t: x.title, d: `${x.questions} câu · ${x.durationMin} phút` }));
  return (
    <section className={cardCls}>
      <Head title="Bài tập đề xuất cho bạn" sub={level ? `Dựa trên trình độ ${level} của bạn` : "Dựa trên tiến độ học tập"} href="/bai-tap" />
      {!SUGGEST.length && <Empty text="Bạn đã làm hết bài tập gợi ý. Tuyệt vời!" />}
      <motion.ul {...listAnim} className="space-y-2">
        {SUGGEST.map((s) => {
          const Icon = s.icon;
          return (
            <motion.li key={s.slug} variants={rowAnim} className="flex items-center gap-3 rounded-xl border border-ink/5 p-2.5 transition hover:border-brand-100 hover:bg-brand-50/40">
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${s.tone}`}>
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{s.t}</span>
                <span className="block text-[10px] text-muted">{s.d}</span>
              </span>
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="shrink-0">
                <Link href={`/bai-tap/${s.slug}`} className="block rounded-md bg-brand-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600 sm:px-6">
                  Làm bài
                </Link>
              </motion.span>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Hex({ from, to, children }: { from: string; to: string; children: React.ReactNode }) {
  const id = `g${from.slice(1)}${to.slice(1)}`;
  return (
    <svg viewBox="0 0 64 70" className="h-16 w-14 drop-shadow-md">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path d="M32 2 L60 18 V52 L32 68 L4 52 V18 Z" fill={`url(#${id})`} stroke="#fff" strokeWidth="3" />
      <path d="M32 9 L54 22 V48 L32 61 L10 48 V22 Z" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" />
      {children}
    </svg>
  );
}

function Shield({ from, to, children }: { from: string; to: string; children: React.ReactNode }) {
  const id = `s${from.slice(1)}${to.slice(1)}`;
  return (
    <svg viewBox="0 0 64 70" className="h-16 w-14 drop-shadow-md">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path d="M32 2 L58 12 V36 C58 52 46 62 32 68 C18 62 6 52 6 36 V12 Z" fill={`url(#${id})`} stroke="#fde68a" strokeWidth="3" />
      {children}
    </svg>
  );
}

function Star5() {
  return <path d="M32 18 L36 30 L49 30 L39 38 L43 50 L32 42 L21 50 L25 38 L15 30 L28 30 Z" fill="#fff7d6" />;
}

const BADGE_ART: Record<string, React.ReactNode> = {
  sakura: (
    <Hex from="#ff8fa3" to="#e5383b">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="32" cy="27" rx="5.5" ry="8" fill="#ffe3e8" transform={`rotate(${a} 32 35)`} />
      ))}
      <circle cx="32" cy="35" r="3.5" fill="#f5a524" />
    </Hex>
  ),
  flame: (
    <Hex from="#ffc35a" to="#f0682a">
      <path d="M32 18 C40 28 44 34 40 44 C38 50 26 50 24 44 C21 36 28 32 28 26 C31 30 32 32 34 32 C34 27 33 22 32 18 Z" fill="#fff4d6" />
      <path d="M32 34 C36 38 37 42 34 46 C32 48 28 46 28 43 C28 40 31 38 32 34 Z" fill="#f0682a" />
    </Hex>
  ),
  book: (
    <Shield from="#5b9cf5" to="#2d5fc4">
      <path d="M18 24 Q25 21 31 25 V48 Q25 44 18 47 Z" fill="#fff" />
      <path d="M46 24 Q39 21 33 25 V48 Q39 44 46 47 Z" fill="#e0ecff" />
    </Shield>
  ),
  fuji: (
    <Shield from="#7ab8ff" to="#3a5fb8">
      <path d="M14 48 L32 22 L50 48 Z" fill="#fff" />
      <path d="M26 31 L32 22 L38 31 L35 30 L32 33 L29 30 Z" fill="#cfe1ff" />
      <path d="M14 48 L32 22 L50 48 Z" fill="none" stroke="#2d5fc4" strokeWidth="1" opacity=".3" />
    </Shield>
  ),
  star: (
    <Hex from="#fcd34d" to="#f59e0b">
      <Star5 />
    </Hex>
  ),
};

export function Achievements({ items }: { items: DashboardData["achievements"] }) {
  const earned = items.filter((a) => a.earned).length;
  const BADGES = [...items.filter((a) => a.earned), ...items.filter((a) => !a.earned)].slice(0, 4).map((a) => ({
    t: a.title,
    d: a.description ?? "",
    earned: a.earned,
    art: BADGE_ART[a.icon ?? ""] ?? BADGE_ART.star,
  }));
  const left = items.length - earned;
  const pct = items.length ? Math.round((earned / items.length) * 100) : 0;
  return (
    <section id="thanh-tich" className={cardCls}>
      <Head title="Thành tích của bạn" />
      <div className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
        {BADGES.map((b, i) => (
          <motion.div
            key={b.t}
            initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 220, damping: 14, delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className={`flex w-[110px] shrink-0 snap-start flex-col items-center rounded-xl border border-ink/5 px-1.5 py-3 text-center sm:w-auto ${b.earned ? "" : "opacity-45 grayscale"}`}
          >
            <motion.div whileHover={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.5 }}>
              {b.art}
            </motion.div>
            <p className="mt-2 text-[11px] font-bold leading-tight">{b.t}</p>
            <p className="mt-0.5 text-[9px] leading-tight text-muted">{b.d}</p>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand-50/70 p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand-500 shadow-sm">
          <Gift className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium">{left > 0 ? `Còn ${left} huy hiệu nữa để mở khóa cấp độ tiếp theo!` : "Bạn đã mở khóa toàn bộ huy hiệu!"}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1 }}
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500"
              />
            </div>
            <span className="shrink-0 text-[10px] text-muted">
              <b className="text-brand-500">{earned}/{items.length}</b> huy hiệu
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
