"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CheckCheck, ChevronLeft, KeyRound, LifeBuoy, MessageSquarePlus, Send, UserRound } from "lucide-react";
import { api, fmtDate, timeAgo } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { PageBanner } from "@/components/site";
import { Badge, Button, EmptyState, Field, Input, Select, Skeleton, StatusBadge, Textarea, Toaster, cx, toast } from "@/components/admin/ui";
import { useForm } from "@/components/admin/page";
import { PasswordForm, ProfileForm } from "./forms";

type Tab = "profile" | "password" | "tickets" | "notifications";
const TABS: { value: Tab; label: string; icon: typeof UserRound }[] = [
  { value: "profile", label: "Hồ sơ", icon: UserRound },
  { value: "password", label: "Mật khẩu", icon: KeyRound },
  { value: "tickets", label: "Hỗ trợ của tôi", icon: LifeBuoy },
  { value: "notifications", label: "Thông báo", icon: Bell },
];

const card = "rounded-2xl border border-ink/5 bg-white p-5 shadow-sm sm:p-6";

export default function AccountPage() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const { user } = useAuth();
  const tab = (TABS.find((t) => t.value === params.get("tab"))?.value ?? "profile") as Tab;
  const setTab = (t: Tab) => router.replace(`${path}${t === "profile" ? "" : `?tab=${t}`}`, { scroll: false });

  return (
    <>
      <PageBanner compact script={null}>
        <p className="font-jp text-sm text-ink/80">マイページ</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-[2.2rem]">Tài khoản của tôi</h1>
        <p className="mt-2 text-ink/75">Quản lý hồ sơ, mật khẩu, yêu cầu hỗ trợ và thông báo{user ? ` của ${user.name}` : ""}.</p>
      </PageBanner>
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:self-start lg:rounded-2xl lg:border lg:border-ink/5 lg:bg-white lg:p-3 lg:shadow-sm">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cx(
                  "relative flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition",
                  tab === t.value ? "font-semibold text-brand-500" : "bg-white text-ink/75 hover:text-brand-500 lg:bg-transparent",
                )}
              >
                {tab === t.value && <motion.span layoutId="acc-tab" className="absolute inset-0 rounded-xl bg-brand-100/70" />}
                <t.icon className="relative size-[18px]" />
                <span className="relative whitespace-nowrap">{t.label}</span>
              </button>
            ))}
            <Link href="/dashboard" className="hidden items-center gap-2 px-3.5 py-2.5 text-xs text-muted hover:text-brand-500 lg:flex">
              <ChevronLeft className="size-4" /> Về trang tổng quan
            </Link>
          </nav>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="min-w-0">
              {tab === "profile" && (
                <section className={card}>
                  <h2 className="mb-4 text-lg font-bold">Hồ sơ cá nhân</h2>
                  <ProfileForm learner={user?.role === "student"} />
                </section>
              )}
              {tab === "password" && (
                <section className={card}>
                  <h2 className="mb-4 text-lg font-bold">Đổi mật khẩu</h2>
                  <PasswordForm />
                </section>
              )}
              {tab === "tickets" && <MyTickets />}
              {tab === "notifications" && <MyNotifications />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <Toaster />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Thông báo                                                           */
/* ------------------------------------------------------------------ */

type Notif = { id: string; title: string; body: string; link: string | null; at: string; read: boolean };

function MyNotifications() {
  const { data, error, reload, mutate } = useApi<{ items: Notif[]; unread: number }>("/me/notifications?limit=50");
  const [open, setOpen] = useState<string | null>(null);
  const markRead = async (id?: string) => {
    mutate((d) => (d ? { items: d.items.map((n) => (!id || n.id === id ? { ...n, read: true } : n)), unread: id ? Math.max(0, d.unread - 1) : 0 } : d!));
    try {
      await api("/me/notifications/read", { body: id ? { id } : { all: true } });
      invalidate("/me/summary");
    } catch (e) {
      toast.error(e);
      reload();
    }
  };
  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          Thông báo {data && data.unread > 0 && <Badge tone="pink">{data.unread} chưa đọc</Badge>}
        </h2>
        {data && data.unread > 0 && (
          <Button size="sm" variant="soft" icon={<CheckCheck className="size-4" />} onClick={() => markRead()}>
            Đánh dấu đã đọc tất cả
          </Button>
        )}
      </div>
      {error && !data ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !data.items.length ? (
        <EmptyState icon="🔔" title="Chưa có thông báo" description="Thông báo mới từ Nihongo+ sẽ hiển thị tại đây." />
      ) : (
        <ul className="divide-y divide-ink/5">
          {data.items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => {
                  setOpen(open === n.id ? null : n.id);
                  if (!n.read) markRead(n.id);
                }}
                className="flex w-full items-start gap-3 py-3 text-left"
              >
                <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-ink/10" : "bg-brand-500")} />
                <span className="min-w-0 flex-1">
                  <span className={cx("block text-sm", !n.read && "font-semibold")}>{n.title}</span>
                  <span className="block text-xs text-muted">{timeAgo(n.at)}</span>
                </span>
              </button>
              <AnimatePresence>
                {open === n.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="prose prose-sm mb-3 ml-5 max-w-none rounded-xl bg-brand-50/50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: n.body }} />
                    {n.link && (
                      <Link href={n.link} className="mb-3 ml-5 inline-block text-xs font-semibold text-brand-500 hover:underline">
                        Xem chi tiết →
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Yêu cầu hỗ trợ                                                      */
/* ------------------------------------------------------------------ */

type TicketRow = { id: string; code: string; subject: string; category: string; status: string; replyCount: number; lastReplyStaff: boolean | null; updatedAt: string };
type Ticket = TicketRow & { message: string; createdAt: string; replies: { byName: string; staff: boolean; content: string; at: string }[] };
const TICKET_STATUS: Record<string, string> = { open: "Đang chờ", pending: "Đã phản hồi", resolved: "Đã xử lý", closed: "Đã đóng" };

function MyTickets() {
  const { data, error } = useApi<{ items: TicketRow[]; categories: Record<string, string> }>("/me/tickets");
  const [sel, setSel] = useState<string | "new" | null>(null);
  const cats = data?.categories ?? {};
  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Yêu cầu hỗ trợ</h2>
        <Button size="sm" icon={<MessageSquarePlus className="size-4" />} onClick={() => setSel("new")}>
          Gửi yêu cầu mới
        </Button>
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className={cx("space-y-2", sel && "hidden md:block")}>
          {error && !data ? (
            <p className="text-sm text-red-600">{error.message}</p>
          ) : !data ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : !data.items.length ? (
            <EmptyState icon="💬" title="Chưa có yêu cầu nào" description="Gặp vấn đề khi học? Gửi yêu cầu, đội ngũ sẽ phản hồi sớm." />
          ) : (
            data.items.map((t) => (
              <button
                key={t.id}
                onClick={() => setSel(t.id)}
                className={cx("w-full rounded-xl border p-3 text-left transition", sel === t.id ? "border-brand-200 bg-brand-50/60" : "border-ink/5 hover:bg-brand-50/30")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-muted">#{t.code}</span>
                  <StatusBadge status={t.status} label={TICKET_STATUS[t.status]} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">{t.subject}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {cats[t.category] ?? t.category} · {timeAgo(t.updatedAt)}
                  {t.lastReplyStaff && " · Có phản hồi mới"}
                </p>
              </button>
            ))
          )}
        </div>
        <div className={cx("min-w-0", !sel && "hidden md:block")}>
          {sel === "new" ? (
            <NewTicket categories={cats} onDone={(id) => setSel(id)} onCancel={() => setSel(null)} />
          ) : sel ? (
            <TicketThread id={sel} onBack={() => setSel(null)} />
          ) : (
            <div className="grid h-full min-h-48 place-items-center rounded-xl bg-ink/[.02] text-sm text-muted">Chọn một yêu cầu để xem trao đổi</div>
          )}
        </div>
      </div>
    </section>
  );
}

function NewTicket({ categories, onDone, onCancel }: { categories: Record<string, string>; onDone: (id: string) => void; onCancel: () => void }) {
  const f = useForm({ subject: "", category: "general", message: "" });
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const t = await f.submit((v) => api<{ id: string }>("/me/tickets", { body: v }));
      toast.success("Đã gửi yêu cầu hỗ trợ");
      invalidate("/me/tickets");
      invalidate("/me/summary");
      if (t) onDone(t.id);
    } catch {
      /* lỗi theo trường hiển thị dưới ô */
    }
  };
  return (
    <form onSubmit={send} className="space-y-4">
      <Field label="Tiêu đề" required error={f.errors.subject}>
        <Input value={f.values.subject} onChange={f.input("subject")} placeholder="Tóm tắt vấn đề của bạn" invalid={!!f.errors.subject} />
      </Field>
      <Field label="Danh mục" error={f.errors.category}>
        <Select value={f.values.category} onChange={f.input("category")} options={Object.entries(categories).map(([value, label]) => ({ value, label }))} />
      </Field>
      <Field label="Mô tả chi tiết" required error={f.errors.message}>
        <Textarea value={f.values.message} onChange={f.input("message")} rows={6} placeholder="Mô tả vấn đề, bài học/đơn hàng liên quan…" invalid={!!f.errors.message} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" loading={f.submitting} icon={<Send className="size-4" />}>
          Gửi yêu cầu
        </Button>
      </div>
    </form>
  );
}

function TicketThread({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, mutate } = useApi<Ticket>(`/me/tickets/${id}`, { dedupeMs: 0 });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!data) return <Skeleton className="h-64" />;
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const t = await api<Ticket>(`/me/tickets/${id}/reply`, { body: { content: text } });
      mutate(t);
      setText("");
      invalidate("/me/tickets");
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const msgs = [{ byName: "Bạn", staff: false, content: data.message, at: data.createdAt }, ...data.replies];
  return (
    <div>
      <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs text-muted md:hidden">
        <ChevronLeft className="size-4" /> Danh sách
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold">{data.subject}</h3>
        <StatusBadge status={data.status} label={TICKET_STATUS[data.status]} />
      </div>
      <p className="text-xs text-muted">
        #{data.code} · Tạo lúc {fmtDate(data.createdAt, true)}
      </p>
      <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={cx("flex", m.staff ? "justify-start" : "justify-end")}>
            <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", m.staff ? "rounded-tl-sm bg-ink/[.04]" : "rounded-tr-sm bg-brand-500 text-white")}>
              <p className={cx("mb-0.5 text-[11px] font-semibold", m.staff ? "text-brand-500" : "text-white/80")}>{m.staff ? `${m.byName} · Nihongo+` : "Bạn"}</p>
              <p className="whitespace-pre-line">{m.content}</p>
              <p className={cx("mt-1 text-right text-[10px]", m.staff ? "text-muted" : "text-white/70")}>{timeAgo(m.at)}</p>
            </div>
          </div>
        ))}
      </div>
      {data.status !== "closed" ? (
        <div className="mt-4 flex gap-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập phản hồi…" className="flex-1" />
          <Button onClick={send} loading={busy} icon={<Send className="size-4" />} className="self-end">
            Gửi
          </Button>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-ink/[.03] p-3 text-center text-xs text-muted">Yêu cầu đã đóng. Hãy tạo yêu cầu mới nếu cần hỗ trợ thêm.</p>
      )}
    </div>
  );
}
