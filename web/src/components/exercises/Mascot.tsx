"use client";

import { motion } from "motion/react";

/** Mèo tam thể (calico) vẽ bằng SVG, thò đầu lên cổ vũ người học. */
export function CatMascot({ className = "" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 150 124"
      className={className}
      aria-hidden
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.3 }}
    >
      {/* đuôi */}
      <motion.path
        d="M118 104 C 140 100, 146 78, 134 62 C 128 54, 120 58, 126 66 C 134 78, 128 92, 112 96 Z"
        fill="#f4a14a"
        stroke="#3b2a2a"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ transformOrigin: "114px 100px" }}
        animate={{ rotate: [0, 14, -6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.g
        animate={{ y: [0, -3, 0], rotate: [0, -2, 2, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "72px 110px" }}
      >
        {/* thân */}
        <ellipse cx="72" cy="104" rx="42" ry="22" fill="#fffaf3" stroke="#3b2a2a" strokeWidth="2" />
        <path d="M96 90 C 110 92, 114 104, 108 116 C 100 110, 96 100, 96 90 Z" fill="#6b4a3a" opacity=".85" />
        {/* tai */}
        <path d="M38 44 L42 10 L66 32 Z" fill="#f4a14a" stroke="#3b2a2a" strokeWidth="2" strokeLinejoin="round" />
        <path d="M44 36 L46 19 L58 31 Z" fill="#ffb7c0" />
        <path d="M106 44 L102 10 L78 32 Z" fill="#6b4a3a" stroke="#3b2a2a" strokeWidth="2" strokeLinejoin="round" />
        <path d="M100 36 L98 19 L86 31 Z" fill="#ffb7c0" />
        {/* đầu */}
        <ellipse cx="72" cy="60" rx="40" ry="32" fill="#fffaf3" stroke="#3b2a2a" strokeWidth="2" />
        <path d="M38 50 C 40 34, 56 28, 68 30 C 64 40, 58 48, 44 58 Z" fill="#f4a14a" />
        <path d="M106 50 C 104 34, 90 28, 78 30 C 82 40, 88 46, 102 56 Z" fill="#6b4a3a" />
        <path d="M66 31 L70 42 L74 31" stroke="#3b2a2a" strokeWidth="1.5" fill="none" opacity=".5" />
        {/* mắt chớp */}
        <motion.g
          style={{ transformOrigin: "72px 62px" }}
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.46, 0.5, 0.54, 1] }}
        >
          <ellipse cx="56" cy="62" rx="7.5" ry="9" fill="#2b1d1d" />
          <ellipse cx="88" cy="62" rx="7.5" ry="9" fill="#2b1d1d" />
          <circle cx="59" cy="58" r="3" fill="#fff" />
          <circle cx="91" cy="58" r="3" fill="#fff" />
          <circle cx="54" cy="66" r="1.4" fill="#fff" />
          <circle cx="86" cy="66" r="1.4" fill="#fff" />
        </motion.g>
        {/* má hồng, mũi, miệng */}
        <ellipse cx="46" cy="74" rx="6" ry="3.5" fill="#ff8f9b" opacity=".5" />
        <ellipse cx="98" cy="74" rx="6" ry="3.5" fill="#ff8f9b" opacity=".5" />
        <path d="M69 70 L75 70 L72 74 Z" fill="#f07a8a" />
        <path d="M64 77 Q68 81 72 76 Q76 81 80 77" stroke="#3b2a2a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* ria */}
        <path d="M30 68 L44 70 M30 76 L44 74 M114 68 L100 70 M114 76 L100 74" stroke="#3b2a2a" strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
        {/* chân trước */}
        <ellipse cx="52" cy="110" rx="12" ry="8" fill="#fffaf3" stroke="#3b2a2a" strokeWidth="2" />
        <ellipse cx="92" cy="110" rx="12" ry="8" fill="#fffaf3" stroke="#3b2a2a" strokeWidth="2" />
        <path d="M48 108 L48 113 M56 108 L56 113 M88 108 L88 113 M96 108 L96 113" stroke="#3b2a2a" strokeWidth="1.2" opacity=".5" />
      </motion.g>
    </motion.svg>
  );
}

export function SpeechBubble() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: -10, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.7 }}
      className="relative origin-bottom-right rounded-2xl border border-ink/10 bg-white px-4 py-2 text-center shadow-lg shadow-ink/10"
    >
      <motion.p
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
        className="font-jp text-base font-bold leading-tight"
      >
        がんばって！
      </motion.p>
      <p className="text-[11px] text-muted">Cố lên nào!</p>
      <span className="absolute -bottom-2 right-5 size-4 rotate-45 border-b border-r border-ink/10 bg-white" />
    </motion.div>
  );
}

/** Cổng Torii nhỏ cho thẻ động viên. */
export function ToriiArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 70" className={className} aria-hidden>
      <path d="M0 70 Q45 50 90 70 Z" fill="#ffd6dc" />
      <path d="M6 12 Q45 2 84 12 L82 18 Q45 10 8 18 Z" fill="#c8282d" />
      <rect x="14" y="24" width="62" height="5" rx="1" fill="#c8282d" />
      <rect x="22" y="16" width="7" height="50" fill="#d63a2f" />
      <rect x="61" y="16" width="7" height="50" fill="#d63a2f" />
      <rect x="42" y="18" width="6" height="8" fill="#a51f24" />
      <rect x="19" y="62" width="13" height="5" fill="#3b2a2a" />
      <rect x="58" y="62" width="13" height="5" fill="#3b2a2a" />
    </svg>
  );
}
