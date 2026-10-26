"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Logo, Reveal } from "./ui";
import { Petals } from "./Hero";

const COLS = [
  { t: "Về chúng tôi", l: ["Giới thiệu", "Đội ngũ giáo viên", "Cơ hội nghề nghiệp", "Liên hệ"] },
  { t: "Hỗ trợ", l: ["Điều khoản sử dụng", "Chính sách bảo mật", "Câu hỏi thường gặp", "Hướng dẫn thanh toán"] },
  { t: "Tài nguyên", l: ["Tài liệu miễn phí", "Blog tiếng Nhật", "Đề thi JLPT", "Từ điển Kanji"] },
];

const SOCIAL = [
  { n: "Facebook", p: "M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6Z" },
  { n: "YouTube", p: "M22 12s0-3.3-.4-4.8a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.7 2 12 2 12s0 3.3.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.5.4-4.8.4-4.8ZM10 15V9l5.2 3L10 15Z" },
  { n: "TikTok", p: "M16.5 3c.4 2.2 1.8 3.6 4 3.9v3.2c-1.5 0-2.9-.4-4-1.2v6.3A6 6 0 1 1 10.8 9v3.3a2.8 2.8 0 1 0 2.4 2.8V3h3.3Z" },
];

export default function Footer() {
  return (
    <footer className="pb-28 lg:pb-0">
      {/* CTA banner */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 px-6 py-10 text-white shadow-2xl shadow-brand-500/30 sm:px-10">
            <Petals count={10} />
            <svg
              viewBox="0 0 400 120"
              className="pointer-events-none absolute bottom-0 left-0 h-full w-auto opacity-25"
              aria-hidden
            >
              <path d="M0 120 L110 30 L130 42 L150 28 L260 120 Z" fill="#fff" />
              <path d="M95 43 L110 30 L125 43 L117 40 L110 46 L103 40 Z" fill="#e5383b" />
              <g fill="#fff">
                <rect x="300" y="60" width="40" height="5" />
                <rect x="306" y="65" width="28" height="12" />
                <rect x="296" y="77" width="48" height="5" />
                <rect x="304" y="82" width="32" height="14" />
                <rect x="292" y="96" width="56" height="5" />
                <rect x="302" y="101" width="36" height="19" />
              </g>
            </svg>
            <motion.span
              animate={{ rotate: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 6 }}
              className="pointer-events-none absolute -right-4 -top-8 font-jp text-[150px] font-bold leading-none text-white/10"
            >
              夢
            </motion.span>
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center md:pl-40">
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">Sẵn sàng chinh phục tiếng Nhật cùng Nihongo+?</h2>
                <p className="mt-2 text-sm text-white/85">
                  Hãy bắt đầu hành trình học tập hiệu quả, bài bản và đầy cảm hứng ngay hôm nay!
                </p>
              </div>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/khoa-hoc"
                className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-brand-500 shadow-lg"
              >
                Học thử miễn phí
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </motion.a>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 border-t border-ink/5 pt-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)_1.4fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Nền tảng học tiếng Nhật online dành cho người Việt — lộ trình rõ ràng từ N5 đến N1.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.t}>
              <h3 className="text-sm font-bold">{c.t}</h3>
              <ul className="mt-3 space-y-2">
                {c.l.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted transition hover:text-brand-500">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-sm font-bold">Kết nối với chúng tôi</h3>
            <div className="mt-3 flex gap-2">
              {SOCIAL.map((s) => (
                <motion.a
                  key={s.n}
                  whileHover={{ y: -3 }}
                  href="#"
                  aria-label={s.n}
                  className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-500 transition hover:bg-brand-500 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                    <path d={s.p} />
                  </svg>
                </motion.a>
              ))}
            </div>
            <NewsletterForm />
          </div>
        </div>
        <p className="mt-10 border-t border-ink/5 py-6 text-center text-xs text-muted">
          © 2026 Nihongo+. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </footer>
  );
}

/** Đăng ký nhận bản tin → POST /public/subscribe. */
function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [msg, setMsg] = useState("");
  return (
    <div className="mt-4">
      <form
        className="flex overflow-hidden rounded-xl border border-ink/10 bg-white focus-within:border-brand-300"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("sending");
          setMsg("");
          try {
            const r = await api<{ already: boolean }>("/public/subscribe", { body: { email } });
            setState("done");
            setMsg(r.already ? "Email này đã đăng ký nhận tin trước đó." : "Đăng ký thành công! Hẹn gặp bạn trong bản tin tới.");
            setEmail("");
          } catch (ex) {
            setState("idle");
            setMsg(ex instanceof ApiError ? (ex.fieldErrors.email ?? ex.message) : "Không gửi được, thử lại sau");
          }
        }}
      >
        <label className="flex flex-1 items-center gap-2 pl-3">
          <Mail className="size-4 text-muted" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "done") setState("idle");
            }}
            placeholder="Nhập email của bạn"
            className="w-full bg-transparent py-2.5 text-sm outline-none"
            aria-label="Email nhận tin"
          />
        </label>
        <button disabled={state === "sending"} className="flex items-center gap-1 bg-brand-500 px-4 text-sm font-semibold text-white disabled:opacity-70">
          {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : state === "done" ? <Check className="size-4" /> : null}
          Đăng ký
        </button>
      </form>
      {msg && <p className={`mt-1.5 text-xs ${state === "done" ? "text-emerald-600" : "text-red-500"}`}>{msg}</p>}
    </div>
  );
}
