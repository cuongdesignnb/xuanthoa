"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Briefcase, CalendarCheck, CircleCheck, GraduationCap, Loader2, Quote, Star, Users, X } from "lucide-react";
import { avatar } from "../ui";
import { badgeLabel, teacherAvatar, type Review, type Teacher, type TeacherFull } from "./types";
import { api, ApiError, num } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

/** Khung modal nhẹ cho trang client (đóng bằng Esc / click nền). */
function Sheet({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center sm:p-4" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? "sm:max-w-3xl" : "sm:max-w-md"}`}
          >
            <button onClick={onClose} aria-label="Đóng" className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-white/90 text-ink/60 shadow-sm hover:text-brand-500">
              <X className="size-4" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const TIMES = ["Sáng (8h – 11h)", "Chiều (14h – 17h)", "Tối (19h – 21h)", "Cuối tuần"];

/** Đặt lịch học thử → POST /public/trial-requests (tạo ticket "trial" cho đội tư vấn). */
export function TrialModal({ teacher, open, onClose, onDone }: { teacher: Pick<Teacher, "id" | "name"> | null; open: boolean; onClose: () => void; onDone?: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", email: "", time: TIMES[2], note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  // Điền sẵn từ tài khoản khi mở.
  const [prefilled, setPrefilled] = useState<string | null>(null);
  if (open && user && prefilled !== user.id) {
    setPrefilled(user.id);
    setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email }));
  }

  const close = () => {
    onClose();
    setTimeout(() => setCode(null), 300);
  };

  const field = "h-10 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100";
  return (
    <Sheet open={open} onClose={close}>
      {code ? (
        <div className="px-6 py-10 text-center">
          <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-500">
            <CalendarCheck className="size-8" />
          </motion.span>
          <h3 className="mt-4 text-xl font-extrabold">Đã gửi yêu cầu học thử!</h3>
          <p className="mt-2 text-sm text-muted">
            Mã yêu cầu <b className="text-ink">{code}</b>. Đội ngũ tư vấn sẽ liên hệ với bạn trong vòng 24 giờ để xác nhận lịch học
            {teacher ? ` với ${teacher.name}` : ""}.
          </p>
          <button onClick={close} className="mt-6 h-10 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white">
            Đóng
          </button>
        </div>
      ) : (
        <form
          className="p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            setErrors({});
            try {
              const r = await api<{ code: string }>("/public/trial-requests", { body: { ...form, teacherId: teacher?.id } });
              setCode(r.code);
              onDone?.();
            } catch (ex) {
              setErrors(ex instanceof ApiError ? { ...ex.fieldErrors, _: Object.keys(ex.fieldErrors).length ? "" : ex.message } : { _: "Không gửi được, vui lòng thử lại" });
            } finally {
              setSending(false);
            }
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">Học thử miễn phí</p>
          <h3 className="mt-1 pr-8 text-xl font-extrabold">Đặt lịch học thử{teacher ? ` với ${teacher.name}` : ""}</h3>
          <p className="mt-1 text-xs text-muted">Buổi học thử 30 phút giúp bạn làm quen phương pháp và nhận tư vấn lộ trình phù hợp.</p>
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Họ và tên *</span>
              <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
              {errors.name && <span className="mt-1 block text-xs text-red-500">{errors.name}</span>}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold">Số điện thoại *</span>
                <input className={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel" />
                {errors.phone && <span className="mt-1 block text-xs text-red-500">{errors.phone}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold">Email</span>
                <input className={field} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                {errors.email && <span className="mt-1 block text-xs text-red-500">{errors.email}</span>}
              </label>
            </div>
            <div>
              <span className="mb-1 block text-xs font-semibold">Thời gian mong muốn</span>
              <div className="grid grid-cols-2 gap-2">
                {TIMES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...form, time: t })}
                    className={`h-9 rounded-lg text-xs font-medium ring-1 transition ${form.time === t ? "bg-brand-50 text-brand-600 ring-brand-300" : "ring-ink/10 hover:ring-brand-200"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Ghi chú</span>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                placeholder="Mục tiêu học, trình độ hiện tại…"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
            {errors._ && <p className="text-xs text-red-500">{errors._}</p>}
          </div>
          <button disabled={sending} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 disabled:opacity-60">
            {sending && <Loader2 className="size-4 animate-spin" />} Gửi yêu cầu đặt lịch
          </button>
        </form>
      )}
    </Sheet>
  );
}

type Profile = TeacherFull & {
  courses: { id: string; slug: string; title: string; level: string | null; rating: number; studentCount: number }[];
  reviews: Pick<Review, "id" | "authorName" | "authorRole" | "rating" | "content" | "avatarUrl">[];
};

/** Hồ sơ chi tiết giáo viên (GET /public/teachers/:slug). */
export function ProfileModal({ slug, onClose, onBook }: { slug: string | null; onClose: () => void; onBook: (t: Teacher) => void }) {
  const { data: t, loading, error } = useApi<Profile>(slug ? `/public/teachers/${slug}` : null);
  return (
    <Sheet open={!!slug} onClose={onClose} wide>
      {loading || !t ? (
        <div className="grid h-72 place-items-center text-sm text-muted">{error ? error.message : <Loader2 className="size-6 animate-spin text-brand-500" />}</div>
      ) : (
        <div>
          <div className="relative flex flex-col gap-4 bg-gradient-to-r from-brand-50 via-[#fff6f4] to-brand-50 p-6 sm:flex-row sm:items-end">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl" style={{ background: `#${t.avatarBg ?? "ffe4e8"}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teacherAvatar(t)} alt={t.name} className="absolute -bottom-3 left-1/2 h-[118%] max-w-none -translate-x-1/2" />
            </div>
            <div className="min-w-0">
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand-500">{badgeLabel(t)}</span>
              <h3 className="mt-2 text-2xl font-extrabold">{t.name}</h3>
              {t.title && <p className="text-sm text-muted">{t.title}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/70">
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" /> <b>{t.rating}</b> ({num(t.reviewCount)} đánh giá)
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5 text-brand-500" /> {num(t.studentCount)} học viên
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="size-3.5 text-brand-500" /> {t.yearsExp} năm kinh nghiệm
                </span>
                {t.levelRange && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="size-3.5 text-brand-500" /> {t.levelRange}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0">
              {t.quote && (
                <blockquote className="relative mb-4 pl-5 text-sm italic leading-relaxed text-ink/70">
                  <Quote className="absolute left-0 top-0 size-3.5 -scale-x-100 fill-brand-300 text-brand-300" />
                  {t.quote}
                </blockquote>
              )}
              {t.bio && <p className="text-sm leading-relaxed text-ink/80">{t.bio}</p>}
              {t.highlights.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {t.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-[13px]">
                      <CircleCheck className="size-4 shrink-0 fill-emerald-500 text-white" /> {h}
                    </li>
                  ))}
                </ul>
              )}
              {t.reviews.length > 0 && (
                <>
                  <h4 className="mt-6 text-sm font-bold">Học viên nhận xét</h4>
                  <ul className="mt-2 space-y-3">
                    {t.reviews.slice(0, 3).map((r) => (
                      <li key={r.id} className="flex gap-3 rounded-xl bg-ink/[.02] p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.avatarUrl || avatar(r.authorName)} alt="" className="size-9 shrink-0 rounded-full" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-xs font-bold">
                            {r.authorName}
                            <span className="flex">
                              {Array.from({ length: r.rating }).map((_, k) => (
                                <Star key={k} className="size-3 fill-amber-400 text-amber-400" />
                              ))}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-ink/70">{r.content}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {t.skills.map((s) => (
                  <span key={s} className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
                    {s}
                  </span>
                ))}
              </div>
              {t.education && <p className="flex gap-1.5 text-xs text-muted"><GraduationCap className="size-4 shrink-0 text-brand-500" /> {t.education}</p>}
              {t.courses.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-bold">
                    <BookOpen className="size-4 text-brand-500" /> Khóa học phụ trách
                  </h4>
                  <ul className="mt-2 space-y-1.5">
                    {t.courses.map((c) => (
                      <li key={c.id}>
                        <Link href={`/khoa-hoc/${c.slug}`} className="block rounded-lg px-2 py-1.5 text-xs hover:bg-brand-50 hover:text-brand-600">
                          {c.level && <b className="mr-1 text-brand-500">{c.level}</b>}
                          {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={() => onBook(t)} className="h-10 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/30">
                Đặt lịch học thử
              </button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
