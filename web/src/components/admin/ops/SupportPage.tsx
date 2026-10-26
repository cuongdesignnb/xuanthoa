"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Inbox, Mail, Phone, Search, Send, UserRound } from "lucide-react";
import { api, fmtDate, timeAgo } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, Level, Select, Skeleton, Spinner, StatusBadge, Tabs, Textarea, cx, toast, type Tone } from "@/components/admin/ui";
import { Pagination } from "@/components/admin/table";
import { PageHeader } from "@/components/admin/page";

type TicketRow = {
  id: string;
  code: string;
  subject: string;
  message: string;
  category: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assigneeId: string | null;
  assigneeName: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  replyCount: number;
  lastReplyStaff: boolean | null;
  createdAt: string;
  updatedAt: string;
};
type Ticket = TicketRow & {
  replies: { by: string; byName: string; staff: boolean; content: string; at: string }[];
  userPhone: string | null;
  userLevel: string | null;
  userCreatedAt: string | null;
  history: { id: string; code: string; subject: string; status: string; createdAt: string }[];
  categories: Record<string, string>;
};
type Stats = { total: number; open: number; pending: number; resolved: number; closed: number; urgent: number; mine: number; unassigned: number; categories: Record<string, string> };

const STATUS_LABEL: Record<string, string> = { open: "Mới", pending: "Đang xử lý", resolved: "Đã xử lý", closed: "Đã đóng" };
const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  urgent: { label: "Khẩn cấp", tone: "red" },
  high: { label: "Cao", tone: "orange" },
  normal: { label: "Bình thường", tone: "blue" },
  low: { label: "Thấp", tone: "gray" },
};
const opts = (r: Record<string, string>) => Object.entries(r).map(([value, label]) => ({ value, label }));

export default function SupportPage() {
  const stats = useApi<Stats>("/admin/tickets/stats", { dedupeMs: 0 });
  const t = useTable<TicketRow>("/admin/tickets", { pageSize: 20, filters: { status: "open" }, sort: "updatedAt" });
  const staff = useApi<{ value: string; label: string }[]>("/admin/options/staff");
  const [sel, setSel] = useState<string | null>(null);
  const s = stats.data;
  const cats = s?.categories ?? {};

  useEffect(() => {
    if (!sel && t.items[0] && typeof window !== "undefined" && window.innerWidth >= 1024) setSel(t.items[0].id); // eslint-disable-line react-hooks/set-state-in-effect
  }, [t.items, sel]);

  const statusTab = t.state.filters.status ?? "";
  const assignTab = t.state.filters.assignee ?? "";

  return (
    <>
      <PageHeader title="Trung tâm hỗ trợ" subtitle="Tiếp nhận và phản hồi yêu cầu hỗ trợ của học viên" crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Trung tâm hỗ trợ" }]} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs
          value={statusTab}
          onChange={(v) => t.setFilter("status", v)}
          tabs={[
            { value: "open", label: "Mới", count: s?.open },
            { value: "pending", label: "Đang xử lý", count: s?.pending },
            { value: "resolved", label: "Đã xử lý", count: s?.resolved },
            { value: "closed", label: "Đã đóng", count: s?.closed },
            { value: "", label: "Tất cả", count: s?.total },
          ]}
        />
        <Tabs
          size="sm"
          value={assignTab}
          onChange={(v) => t.setFilter("assignee", v)}
          tabs={[
            { value: "", label: "Mọi người" },
            { value: "me", label: "Của tôi", count: s?.mine },
            { value: "none", label: "Chưa phân công", count: s?.unassigned },
          ]}
        />
        {s && s.urgent > 0 && <Badge tone="red" dot>{s.urgent} khẩn cấp</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Card className={cx("flex min-h-[560px] flex-col p-3", sel && "hidden lg:flex")}>
          <div className="space-y-2 px-1 pb-2">
            <Input value={t.state.q} onChange={(e) => t.setQ(e.target.value)} placeholder="Tìm mã, tiêu đề, học viên…" leftIcon={<Search className="size-4" />} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={t.state.filters.priority ?? ""} onChange={(e) => t.setFilter("priority", e.target.value)} placeholder="Mọi mức ưu tiên" options={Object.entries(PRIORITY).map(([value, p]) => ({ value, label: p.label }))} />
              <Select value={t.state.filters.category ?? ""} onChange={(e) => t.setFilter("category", e.target.value)} placeholder="Mọi danh mục" options={opts(cats)} />
            </div>
          </div>
          <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
            {t.error && !t.data ? (
              <ErrorState error={t.error} onRetry={t.reload} />
            ) : t.loading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : !t.items.length ? (
              <EmptyState icon={<Inbox className="size-6" />} title="Không có ticket" description="Hộp thư trống với bộ lọc hiện tại." />
            ) : (
              t.items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSel(r.id)}
                  className={cx("w-full rounded-xl border p-3 text-left transition", sel === r.id ? "border-brand-200 bg-brand-50/70" : "border-transparent hover:bg-ink/[.03]")}
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar src={r.userAvatar} name={r.userName ?? "?"} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{r.userName ?? "Khách"}</p>
                        <span className="shrink-0 text-[10px] text-muted">{timeAgo(r.updatedAt)}</span>
                      </div>
                      <p className="truncate text-[13px]">{r.subject}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted">#{r.code}</span>
                        <Badge tone={PRIORITY[r.priority].tone}>{PRIORITY[r.priority].label}</Badge>
                        <span className="text-[10px] text-muted">{cats[r.category] ?? r.category}</span>
                        {r.lastReplyStaff === false && r.replyCount > 0 && <Badge tone="pink">Học viên vừa trả lời</Badge>}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <Pagination table={t as never} />
        </Card>

        <div className={cx("min-w-0", !sel && "hidden lg:block")}>
          {sel ? (
            <Conversation
              key={sel}
              id={sel}
              staff={staff.data ?? []}
              onBack={() => setSel(null)}
              onChanged={() => {
                invalidate("/admin/tickets");
                stats.reload();
              }}
            />
          ) : (
            <Card className="grid h-full min-h-[560px] place-items-center">
              <EmptyState icon={<Inbox className="size-6" />} title="Chọn một ticket" description="Nội dung trao đổi sẽ hiển thị tại đây." />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Conversation({ id, staff, onBack, onChanged }: { id: string; staff: { value: string; label: string }[]; onBack: () => void; onChanged: () => void }) {
  const { can } = useAuth();
  const writable = can("support.write");
  const { data, error, mutate, reload } = useApi<Ticket>(`/admin/tickets/${id}`, { dedupeMs: 0 });
  const [text, setText] = useState("");
  const [after, setAfter] = useState<"" | "pending" | "resolved">("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [data?.replies.length]);

  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data)
    return (
      <Card className="grid min-h-[560px] place-items-center">
        <Spinner />
      </Card>
    );

  const patch = async (body: Partial<Pick<Ticket, "status" | "priority" | "assigneeId" | "category">>) => {
    try {
      const t = await api<Ticket>(`/admin/tickets/${id}`, { method: "PATCH", body });
      mutate({ ...data, ...t });
      onChanged();
      toast.success("Đã cập nhật ticket");
    } catch (e) {
      toast.error(e);
    }
  };
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const t = await api<Ticket>(`/admin/tickets/${id}/reply`, { body: { content: text, ...(after ? { status: after } : {}) } });
      mutate({ ...data, ...t });
      setText("");
      onChanged();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const msgs = [{ by: data.userId ?? "", byName: data.userName ?? "Học viên", staff: false, content: data.message, at: data.createdAt }, ...data.replies];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
      <Card className="flex min-h-[560px] flex-col">
        <div className="border-b border-ink/5 p-4">
          <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs text-muted lg:hidden">
            <ArrowLeft className="size-4" /> Hộp thư
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{data.subject}</h2>
            <StatusBadge status={data.status} label={STATUS_LABEL[data.status]} />
            <Badge tone={PRIORITY[data.priority].tone}>{PRIORITY[data.priority].label}</Badge>
          </div>
          <p className="text-xs text-muted">
            #{data.code} · {data.categories[data.category] ?? data.category} · tạo {fmtDate(data.createdAt, true)}
          </p>
        </div>
        <div className="max-h-[520px] flex-1 space-y-3 overflow-y-auto bg-ink/[.015] p-4">
          {msgs.map((m, i) => (
            <div key={i} className={cx("flex gap-2", m.staff ? "flex-row-reverse" : "")}>
              <Avatar src={m.staff ? null : data.userAvatar} name={m.byName} size={30} />
              <div className={cx("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm", m.staff ? "rounded-tr-sm bg-brand-500 text-white" : "rounded-tl-sm bg-white")}>
                <p className={cx("mb-0.5 text-[11px] font-semibold", m.staff ? "text-white/80" : "text-brand-500")}>{m.byName}</p>
                <p className="whitespace-pre-line">{m.content}</p>
                <p className={cx("mt-1 text-right text-[10px]", m.staff ? "text-white/70" : "text-muted")}>{fmtDate(m.at, true)}</p>
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        {writable && (
          <div className="border-t border-ink/5 p-3">
            <Textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && send()}
              placeholder="Nhập phản hồi cho học viên… (Ctrl + Enter để gửi)"
            />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-muted">Sau khi gửi:</span>
              <Select
                className="w-44"
                value={after}
                onChange={(e) => setAfter(e.target.value as typeof after)}
                options={[
                  { value: "", label: "Chuyển “Đang xử lý”" },
                  { value: "resolved", label: "Đánh dấu đã xử lý" },
                ]}
              />
              <Button loading={busy} onClick={send} icon={<Send className="size-4" />}>
                Gửi phản hồi
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="space-y-3 p-4">
          <p className="text-sm font-bold">Xử lý</p>
          <label className="block text-xs text-muted">
            Trạng thái
            <Select className="mt-1" value={data.status} disabled={!writable} onChange={(e) => patch({ status: e.target.value as Ticket["status"] })} options={opts(STATUS_LABEL)} />
          </label>
          <label className="block text-xs text-muted">
            Mức ưu tiên
            <Select className="mt-1" value={data.priority} disabled={!writable} onChange={(e) => patch({ priority: e.target.value as Ticket["priority"] })} options={Object.entries(PRIORITY).map(([value, p]) => ({ value, label: p.label }))} />
          </label>
          <label className="block text-xs text-muted">
            Phân công
            <Select className="mt-1" value={data.assigneeId ?? ""} disabled={!writable} onChange={(e) => patch({ assigneeId: e.target.value || null })} options={staff} placeholder="Chưa phân công" />
          </label>
          <label className="block text-xs text-muted">
            Danh mục
            <Select className="mt-1" value={data.category} disabled={!writable} onChange={(e) => patch({ category: e.target.value })} options={opts(data.categories)} />
          </label>
        </Card>
        <Card className="p-4">
          <p className="mb-3 text-sm font-bold">Học viên</p>
          <div className="flex items-center gap-2.5">
            <Avatar src={data.userAvatar} name={data.userName ?? "?"} size={40} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{data.userName ?? "—"}</p>
              <Level level={data.userLevel} />
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-ink/80">
            <p className="flex items-center gap-2">
              <Mail className="size-3.5 text-muted" /> <span className="truncate">{data.userEmail ?? "—"}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 text-muted" /> {data.userPhone ?? "—"}
            </p>
            {data.userCreatedAt && (
              <p className="flex items-center gap-2">
                <UserRound className="size-3.5 text-muted" /> Tham gia {fmtDate(data.userCreatedAt)}
              </p>
            )}
          </div>
          {data.userId && can("students.read") && (
            <Link href={`/admin/hoc-vien/${data.userId}`} className="mt-3 inline-block text-xs font-semibold text-brand-500 hover:underline">
              Xem hồ sơ học viên →
            </Link>
          )}
          {data.history.length > 0 && (
            <div className="mt-4 border-t border-ink/5 pt-3">
              <p className="mb-2 text-xs font-semibold text-muted">Ticket trước đây</p>
              <ul className="space-y-1.5">
                {data.history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{h.subject}</span>
                    <StatusBadge status={h.status} label={STATUS_LABEL[h.status]} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
