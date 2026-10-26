"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Logo } from "@/components/ui";
import { Petals } from "@/components/Hero";
import { Pagoda, SakuraBranch } from "@/components/site";
import { Button, Field, Input } from "./ui";

export default function AdminLogin() {
  const { login, logout, user, isStaff } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isStaff) router.replace(next.startsWith("/admin") ? next : "/admin");
  }, [user, isStaff, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const me = await login(email, password);
      if (me.role === "student") {
        await logout();
        setError("Tài khoản không có quyền truy cập trang quản trị");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không đăng nhập được");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-gradient-to-br from-[#fff6f6] to-[#ffe9eb] lg:grid-cols-2">
      <Petals count={14} />
      <div className="relative hidden lg:block">
        <Image src="https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=80" alt="" fill priority sizes="50vw" className="object-cover object-[50%_80%] opacity-90 hue-rotate-[-10deg] [mask-image:linear-gradient(to_right,black_60%,transparent)]" />
        <Pagoda className="absolute bottom-10 left-[18%] h-56 drop-shadow-xl" />
        <p className="absolute left-10 top-10 rotate-[-6deg] font-script text-3xl leading-snug text-white drop-shadow-lg">
          Kết nối tri thức
          <br />
          Mở ra tương lai cùng tiếng Nhật
        </p>
      </div>
      <div className="relative grid place-items-center p-6">
        <SakuraBranch className="pointer-events-none absolute -right-6 -top-4 w-48 -scale-x-100 opacity-80" />
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-sm rounded-3xl border border-white bg-white/90 p-7 shadow-2xl shadow-brand-500/10 backdrop-blur"
        >
          <Logo />
          <h1 className="mt-6 text-2xl font-extrabold">Đăng nhập quản trị</h1>
          <p className="mt-1 text-sm text-muted">Hệ quản trị nội bộ Nihongo+</p>
          <div className="mt-6 space-y-4">
            <Field label="Email">
              <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@nihongo.vn" leftIcon={<Mail className="size-4" />} />
            </Field>
            <Field label="Mật khẩu">
              <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" leftIcon={<Lock className="size-4" />} />
            </Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Đăng nhập
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
