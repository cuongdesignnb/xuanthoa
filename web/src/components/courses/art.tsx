"use client";

import { Headphones } from "lucide-react";
import { Pagoda, SakuraBranch } from "../site";
import { avatar } from "../ui";
import type { CoverStyle } from "./types";

/** Cổng Torii cách điệu. */
export function Torii({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <path d="M2 14 Q60 2 118 14 L114 22 Q60 12 6 22 Z" fill="#c62828" />
      <rect x="4" y="12" width="112" height="4" rx="2" fill="#2b1d1d" opacity=".85" />
      <rect x="14" y="32" width="92" height="7" fill="#d63a2f" />
      <rect x="56" y="22" width="8" height="12" fill="#d63a2f" />
      <rect x="24" y="20" width="9" height="80" fill="#d63a2f" />
      <rect x="87" y="20" width="9" height="80" fill="#d63a2f" />
      <rect x="21" y="92" width="15" height="8" fill="#2b1d1d" />
      <rect x="84" y="92" width="15" height="8" fill="#2b1d1d" />
    </svg>
  );
}

/** Núi Phú Sĩ cách điệu. */
export function Fuji({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 90" className={className} aria-hidden>
      <path d="M0 90 L78 18 Q100 4 122 18 L200 90 Z" fill="#9db7d6" />
      <path d="M62 34 L78 18 Q100 4 122 18 L138 34 L124 30 L112 38 L100 28 L88 38 L76 30 Z" fill="#fff" />
    </svg>
  );
}

function Daruma({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 64" className={className} aria-hidden>
      <ellipse cx="30" cy="36" rx="26" ry="27" fill="#d32f2f" />
      <ellipse cx="30" cy="30" rx="15" ry="13" fill="#ffe7d6" />
      <circle cx="24" cy="29" r="3.2" fill="#1d1d2b" />
      <circle cx="36" cy="29" r="3.2" fill="#fff" stroke="#1d1d2b" />
      <path d="M22 22 Q24 19 27 22 M33 22 Q36 19 38 22" stroke="#1d1d2b" strokeWidth="1.6" fill="none" />
      <path d="M25 37 Q30 40 35 37" stroke="#1d1d2b" strokeWidth="1.4" fill="none" />
      <path d="M18 50 Q30 58 42 50" stroke="#f6c343" strokeWidth="3" fill="none" />
    </svg>
  );
}

function ExamSheet({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 70" className={className} aria-hidden>
      <g transform="rotate(-8 45 35)">
        <rect x="8" y="6" width="74" height="58" rx="3" fill="#fff" stroke="#e5e7eb" />
        <rect x="14" y="12" width="30" height="5" rx="1" fill="#e5383b" opacity=".75" />
        {[24, 31, 38, 45, 52].map((y) => (
          <g key={y}>
            <circle cx="17" cy={y + 1} r="2" fill="none" stroke="#9ca3af" />
            <rect x="23" y={y} width="48" height="2.4" rx="1" fill="#cbd5e1" />
          </g>
        ))}
      </g>
      <rect x="62" y="20" width="5" height="44" rx="2" transform="rotate(24 64 42)" fill="#334155" />
    </svg>
  );
}

function Office({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <rect x="0" y="20" width="60" height="90" fill="#cbd5e1" />
      <rect x="64" y="0" width="56" height="110" fill="#94a3b8" />
      <rect x="124" y="34" width="36" height="76" fill="#cbd5e1" />
      {Array.from({ length: 6 }, (_, r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={70 + c * 17} y={8 + r * 16} width="11" height="9" fill="#e2e8f0" opacity=".85" />
        )),
      )}
      {Array.from({ length: 5 }, (_, r) =>
        [0, 1].map((c) => (
          <rect key={`a${r}-${c}`} x={8 + c * 26} y={30 + r * 15} width="18" height="8" fill="#f1f5f9" opacity=".8" />
        )),
      )}
    </svg>
  );
}

/** Ảnh bìa khóa học được dựng bằng chữ + minh họa (không dùng ảnh người thật). */
export function CourseCover({
  course,
  className = "",
}: {
  course: { coverStyle: CoverStyle | null; coverUrl?: string | null; title: string; level?: string | null };
  className?: string;
}) {
  if (course.coverUrl)
    return (
      <div className={`relative isolate overflow-hidden bg-brand-50 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={course.coverUrl} alt={course.title} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
    );
  const cover: CoverStyle = course.coverStyle ?? {
    lines: [
      ...(course.level ? [{ t: course.level, c: "text-5xl font-black text-brand-500" }] : []),
      { t: course.title, c: "text-lg font-extrabold text-ink" },
    ],
    deco: "torii",
    seed: "Nihongo",
    bg: "ffd6dc",
    tone: "from-[#ffe9ec] via-[#fff5f6] to-[#ffdfe4]",
  };
  return (
    <div className={`relative isolate overflow-hidden bg-gradient-to-br ${cover.tone} ${className}`}>
      <SakuraBranch className="absolute -left-4 -top-4 w-28 opacity-90" />
      <SakuraBranch className="absolute -bottom-8 right-1/3 w-24 rotate-180 opacity-70" />

      {cover.deco === "torii" && <Torii className="absolute bottom-0 left-[38%] h-[70%] opacity-90" />}
      {cover.deco === "pagoda" && <Pagoda className="absolute -bottom-2 left-[2%] h-[78%] opacity-90" />}
      {cover.deco === "fuji" && <Fuji className="absolute bottom-0 left-0 w-3/4 opacity-80" />}
      {cover.deco === "office" && <Office className="absolute bottom-0 right-0 h-full opacity-70" />}
      {cover.deco === "jlpt" && (
        <>
          <Fuji className="absolute -top-2 right-2 w-1/2 opacity-40" />
          <ExamSheet className="absolute bottom-1 right-[30%] w-24" />
        </>
      )}
      {cover.deco === "kanji" && (
        <>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-jp text-[3.4rem] font-bold leading-[0.95] text-ink [writing-mode:vertical-rl]">
            漢字
          </span>
          <Daruma className="absolute bottom-1 right-3 w-12" />
        </>
      )}
      {cover.deco === "kana" && (
        <span className="absolute -right-2 -top-4 font-jp text-8xl font-bold text-brand-500/10">か</span>
      )}
      {cover.deco === "book" && (
        <span className="absolute bottom-1 left-[42%] rounded border border-ink/10 bg-white/90 px-2 py-1 font-jp text-[10px] font-bold text-ink shadow">
          単語帳
        </span>
      )}

      {/* Nhân vật minh họa */}
      {cover.deco !== "kanji" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
        src={avatar(cover.seed, cover.bg)}
        alt=""
        loading="lazy"
        className="absolute -bottom-3 right-0 h-[112%] w-auto rounded-tl-[40%] object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      {cover.deco === "headphones" && (
        <span className="absolute right-[26%] top-[18%] grid size-9 place-items-center rounded-full bg-white/90 text-brand-500 shadow">
          <Headphones className="size-5" />
        </span>
      )}
      {cover.deco === "torii" && (
        <span className="absolute bottom-2 right-3 rotate-6 rounded bg-white/95 px-2 py-1 text-center font-jp text-[10px] font-bold leading-tight text-ink shadow">
          はじめての
          <br />
          日本語
        </span>
      )}

      <div
        className={`relative z-10 flex h-full flex-col justify-center gap-0.5 py-3 leading-[1.05] ${
          cover.deco === "kanji" ? "pl-[32%] pr-3" : cover.deco === "pagoda" ? "pl-[27%] pr-[34%]" : "pl-4 pr-[38%]"
        }`}
      >
        {cover.lines.map((l) => (
          <span key={l.t + (l.a ?? "")} className={`block drop-shadow-[0_2px_0_rgba(255,255,255,.9)] ${l.c}`}>
            {l.t}
            {l.a && <span className="ml-2 text-emerald-600">{l.a}</span>}
          </span>
        ))}
        {cover.sub && <span className="mt-1 text-[9px] font-semibold text-ink/70">{cover.sub}</span>}
      </div>
    </div>
  );
}
