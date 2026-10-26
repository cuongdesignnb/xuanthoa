"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Sparkles, Target, UserRound } from "lucide-react";
import { useAuth, type Me } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { PageBanner } from "@/components/site";
import { avatar } from "@/components/ui";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

/** Chỉ chấp nhận đường dẫn nội bộ cho ?next= (tránh open redirect). */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">{label}</span>
      <span
        className={`flex items-center gap-2.5 rounded-xl border bg-white px-3.5 transition focus-within:ring-4 ${
          error ? "border-red-300 focus-within:ring-red-100" : "border-ink/10 focus-within:border-brand-300 focus-within:ring-brand-100"
        }`}
      >
        <span className="text-ink/40">{icon}</span>
        {children}
      </span>
      <AnimatePresence>
        {error && (
          <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 block text-xs text-red-500">
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}

const inputCls = "h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [form, setForm] = useState({ name: "", email: "", password: "", level: "N5" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (me: Pick<Me, "role">) => router.replace(next ?? (me.role === "student" ? "/dashboard" : "/admin"));

  useEffect(() => {
    if (!loading && user) go(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setBusy(true);
    try {
      const me =
        mode === "login"
          ? await login(form.email.trim(), form.password)
          : await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, level: form.level });
      go(me);
    } catch (err) {
      if (err instanceof ApiError) {
        const fe = err.fieldErrors;
        setErrors(fe);
        if (!Object.keys(fe).length || err.status !== 400) setError(err.message);
        if (err.status === 409) setErrors({ email: err.message });
      } else setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === "login";
  const other = `${isLogin ? "/dang-ky" : "/dang-nhap"}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <PageBanner
      script={
        <>
          Mỗi ngày một chút,
          <br />
          tiếng Nhật sẽ
          <br />
          thành của bạn
        </>
      }
      aside={
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="relative mx-auto hidden max-w-xs lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar("Hana", "transparent")} alt="" className="mx-auto h-72 w-auto drop-shadow-xl" />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -left-6 top-10 rounded-2xl bg-white/90 px-4 py-3 text-xs shadow-lg backdrop-blur"
          >
            <p className="font-jp text-sm font-bold">がんばって！</p>
            <p className="text-muted">Cố lên nhé!</p>
          </motion.div>
        </motion.div>
      }
    >
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md rounded-3xl border border-white bg-white/90 p-6 shadow-2xl shadow-brand-500/10 backdrop-blur sm:p-8"
        noValidate
      >
        <p className="font-jp text-sm text-brand-500">{isLogin ? "おかえりなさい！" : "ようこそ！"}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{isLogin ? "Đăng nhập" : "Tạo tài khoản miễn phí"}</h1>
        <p className="mt-1 text-sm text-muted">
          {isLogin ? "Tiếp tục hành trình chinh phục tiếng Nhật của bạn." : "Lưu tiến độ, nhận lộ trình cá nhân và làm bài tập không giới hạn."}
        </p>

        <div className="mt-6 space-y-4">
          {!isLogin && (
            <Field label="Họ và tên" icon={<UserRound className="size-4" />} error={errors.name}>
              <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Nguyễn Minh Anh" autoComplete="name" required />
            </Field>
          )}
          <Field label="Email" icon={<Mail className="size-4" />} error={errors.email}>
            <input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="ban@email.com" autoComplete="email" required />
          </Field>
          <Field label="Mật khẩu" icon={<Lock className="size-4" />} error={errors.password}>
            <input
              className={inputCls}
              type={show ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder={isLogin ? "••••••••" : "Tối thiểu 6 ký tự"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="text-ink/40 hover:text-brand-500">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </Field>
          {!isLogin && (
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink/80">
                <Target className="size-4 text-ink/40" /> Trình độ hiện tại
              </span>
              <div className="grid grid-cols-5 gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, level: l }))}
                    className={`rounded-xl border py-2 text-sm font-bold transition ${
                      form.level === l ? "border-brand-500 bg-brand-50 text-brand-500" : "border-ink/10 text-ink/60 hover:border-brand-200"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={busy}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : isLogin ? null : <Sparkles className="size-4" />}
            {isLogin ? "Đăng nhập" : "Đăng ký ngay"}
            {!busy && <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />}
          </motion.button>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <Link href={other} className="font-semibold text-brand-500 hover:underline">
            {isLogin ? "Đăng ký miễn phí" : "Đăng nhập"}
          </Link>
        </p>
      </motion.form>
    </PageBanner>
  );
}
