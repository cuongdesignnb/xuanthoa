"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  EyeOff,
  ExternalLink,
  Heart,
  MessageCircle,
  MessageSquareWarning,
  MoreHorizontal,
  RotateCcw,
  Star,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Avatar, Badge, Button, Drawer, Dropdown, Field, IconButton, StatusBadge, Tabs, Textarea, cx, toast, useConfirm, type Tone } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, StatCard } from "@/components/admin/page";
import { avatar } from "@/components/ui";
import { api, fmtDate, num, timeAgo } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

type Summary = {
  reviews_pending: number;
  reviews_total: number;
  reviews_avg: number | null;
  reviews_featured: number;
  reports_open: number;
  reports_pending: number;
  reports_total: number;
  comments_pending: number;
  comments_hidden: number;
  comments_total: number;
  ratingDist: { rating: number; count: number }[];
};

type Review = {
  id: string;
  authorName: string;
  authorRole: string | null;
  rating: number;
  content: string;
  featured: boolean;
  status: "pending" | "approved" | "hidden";
  createdAt: string;
  avatarUrl: string | null;
  userEmail: string | null;
  teacherName: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
};

type Report = {
  id: string;
  targetType: string;
  targetId: string | null;
  targetTitle: string | null;
  content: string;
  status: "open" | "pending" | "resolved" | "closed";
  resolution: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  adminHref: string | null;
  siteHref: string | null;
};

type Comment = {
  id: string;
  content: string;
  likes: number;
  status: "pending" | "approved" | "hidden";
  parentId: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  userRole: string;
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
};

const MOD_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Chờ duyệt", tone: "amber" },
  approved: { label: "Đã duyệt", tone: "green" },
  hidden: { label: "Đã ẩn", tone: "gray" },
};
const REPORT_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Mới", tone: "red" },
  pending: { label: "Đang xử lý", tone: "blue" },
  resolved: { label: "Đã xử lý", tone: "green" },
  closed: { label: "Đã đóng", tone: "gray" },
};
const TARGET: Record<string, { label: string; tone: Tone }> = {
  lesson: { label: "Bài học", tone: "blue" },
  question: { label: "Câu hỏi", tone: "violet" },
  post: { label: "Bài viết", tone: "pink" },
  video: { label: "Video", tone: "orange" },
  other: { label: "Khác", tone: "gray" },
};

function Stars({ n, size = "size-3.5" }: { n: number; size?: string }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cx(size, i <= n ? "fill-amber-400 text-amber-400" : "text-ink/15")} />
      ))}
    </span>
  );
}

type TabId = "reviews" | "reports" | "comments";

export default function ModerationAdmin() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = sp.get("tab");
  const tab: TabId = raw === "reports" || raw === "comments" ? raw : "reviews";
  const summary = useApi<Summary>("/admin/moderation/summary", { dedupeMs: 0 });
  const s = summary.data;

  return (
    <div>
      <PageHeader
        title="Đánh giá & Báo lỗi"
        subtitle="Duyệt đánh giá của học viên, xử lý báo lỗi nội dung và kiểm duyệt bình luận bài học."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Đánh giá & Báo lỗi" }]}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} tone="amber" icon={<MessageCircle className="size-5" />} label="Đánh giá chờ duyệt" value={s ? num(s.reviews_pending) : "…"} sub={s ? `${num(s.reviews_total)} đánh giá` : undefined} />
        <StatCard index={1} tone="green" icon={<Star className="size-5" />} label="Điểm trung bình" value={s?.reviews_avg ? `${s.reviews_avg.toFixed(2)}/5` : "…"} sub={s ? `${s.reviews_featured} đánh giá nổi bật` : undefined} />
        <StatCard index={2} tone="red" icon={<AlertTriangle className="size-5" />} label="Báo lỗi mới" value={s ? num(s.reports_open) : "…"} sub={s ? `${s.reports_pending} đang xử lý · ${s.reports_total} tổng` : undefined} />
        <StatCard index={3} tone="violet" icon={<MessageSquareWarning className="size-5" />} label="Bình luận chờ duyệt" value={s ? num(s.comments_pending) : "…"} sub={s ? `${s.comments_hidden} đã ẩn · ${num(s.comments_total)} tổng` : undefined} />
      </div>
      <Tabs
        className="mb-4 w-fit"
        value={tab}
        onChange={(v) => router.replace(v === "reviews" ? pathname : `${pathname}?tab=${v}`, { scroll: false })}
        tabs={[
          { value: "reviews", label: "Đánh giá", count: s?.reviews_pending || undefined },
          { value: "reports", label: "Báo lỗi nội dung", count: s?.reports_open || undefined },
          { value: "comments", label: "Bình luận bài học", count: s?.comments_pending || undefined },
        ]}
      />
      {tab === "reviews" && <ReviewsTab summary={s} />}
      {tab === "reports" && <ReportsTab />}
      {tab === "comments" && <CommentsTab />}
    </div>
  );
}

const refreshAll = (prefix: string) => {
  invalidate(prefix);
  invalidate("/admin/moderation/summary");
  invalidate("/admin/dashboard");
};

/* ------------------------------ Đánh giá ------------------------------ */

function ReviewsTab({ summary }: { summary?: Summary }) {
  const t = useTable<Review>("/admin/moderation/reviews", { filters: { status: "pending" }, sort: "createdAt" });
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("moderation.write");
  const refresh = () => {
    refreshAll("/admin/moderation/reviews");
    invalidate("/public/reviews");
    invalidate("/public/home");
  };

  const patch = async (r: Review, body: Partial<Pick<Review, "status" | "featured">>, msg: string) => {
    try {
      await api(`/admin/moderation/reviews/${r.id}`, { method: "PATCH", body });
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const bulk = async (ids: string[], action: "approve" | "hide" | "feature" | "unfeature" | "delete", clear: () => void) => {
    if (action === "delete" && !(await confirm({ title: `Xoá ${ids.length} đánh giá?`, danger: true, confirmText: "Xoá" }))) return;
    try {
      const r = await api<{ count: number }>("/admin/moderation/reviews/bulk", { body: { ids, action } });
      toast.success(`Đã cập nhật ${r.count} đánh giá`);
      clear();
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const max = Math.max(1, ...(summary?.ratingDist.map((d) => d.count) ?? [1]));

  const cols: Column<Review>[] = [
    {
      key: "authorName",
      header: "Học viên",
      sortable: true,
      cell: (r) => (
        <div className="flex min-w-[180px] items-center gap-2.5">
          <Avatar src={r.avatarUrl || avatar(r.authorName)} name={r.authorName} size={34} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.authorName}</p>
            <p className="truncate text-[11px] text-muted">{r.authorRole ?? r.userEmail ?? "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "rating", header: "Điểm", sortable: true, cell: (r) => <Stars n={r.rating} /> },
    {
      key: "content",
      header: "Nội dung",
      cell: (r) => (
        <div className="min-w-[260px] max-w-md">
          <p className="line-clamp-3 text-[13px] leading-relaxed text-ink/80">{r.content}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted">
            {r.courseTitle && <Badge tone="blue">{r.courseTitle}</Badge>}
            {r.teacherName && <Badge tone="pink">{r.teacherName}</Badge>}
            {!r.courseTitle && !r.teacherName && <Badge tone="gray">Đánh giá chung</Badge>}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (r) => (
        <div className="flex flex-col items-start gap-1">
          <Badge tone={MOD_STATUS[r.status].tone} dot>
            {MOD_STATUS[r.status].label}
          </Badge>
          {r.featured && (
            <Badge tone="amber">
              <Crown className="size-3" /> Nổi bật
            </Badge>
          )}
        </div>
      ),
    },
    { key: "createdAt", header: "Gửi lúc", sortable: true, hideOnMobile: true, cell: (r) => <span className="whitespace-nowrap text-xs text-muted">{timeAgo(r.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-28",
      cell: (r) =>
        canWrite && (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            {r.status !== "approved" && (
              <IconButton label="Duyệt" className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => patch(r, { status: "approved" }, "Đã duyệt đánh giá")}>
                <CheckCircle2 className="size-4" />
              </IconButton>
            )}
            {r.status !== "hidden" && (
              <IconButton label="Ẩn" onClick={() => patch(r, { status: "hidden", featured: false }, "Đã ẩn đánh giá")}>
                <EyeOff className="size-4" />
              </IconButton>
            )}
            <Dropdown
              trigger={
                <IconButton label="Thêm">
                  <MoreHorizontal className="size-4" />
                </IconButton>
              }
              items={[
                { label: r.featured ? "Bỏ ghim nổi bật" : "Ghim nổi bật (trang chủ / giáo viên)", icon: <Crown className="size-4" />, onClick: () => patch(r, { featured: !r.featured }, r.featured ? "Đã bỏ ghim" : "Đã ghim nổi bật") },
                ...(r.status !== "pending" ? [{ label: "Chuyển về chờ duyệt", icon: <RotateCcw className="size-4" />, onClick: () => patch(r, { status: "pending" }, "Đã chuyển về chờ duyệt") }] : []),
                "divider" as const,
                {
                  label: "Xoá",
                  icon: <Trash2 className="size-4" />,
                  danger: true,
                  onClick: async () => {
                    if (!(await confirm({ title: "Xoá đánh giá này?", danger: true, confirmText: "Xoá" }))) return;
                    try {
                      await api(`/admin/moderation/reviews/${r.id}`, { method: "DELETE" });
                      toast.success("Đã xoá đánh giá");
                      refresh();
                    } catch (e) {
                      toast.error(e);
                    }
                  },
                },
              ]}
            />
          </div>
        ),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] [&>*]:min-w-0">
      <TableCard
        table={t}
        columns={cols}
        rowKey={(r) => r.id}
        placeholder="Tìm theo học viên, nội dung, khóa học…"
        filters={[
          { key: "status", label: "Mọi trạng thái", options: Object.entries(MOD_STATUS).map(([value, x]) => ({ value, label: x.label })) },
          { key: "rating", label: "Mọi số sao", options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} sao` })) },
          {
            key: "target",
            label: "Đối tượng",
            options: [
              { value: "course", label: "Khóa học" },
              { value: "teacher", label: "Giáo viên" },
              { value: "site", label: "Đánh giá chung" },
            ],
          },
          { key: "featured", label: "Nổi bật", options: [{ value: "1", label: "Đang ghim" }] },
        ]}
        bulk={
          canWrite
            ? (ids, clear) => (
                <>
                  <Button size="sm" variant="soft" icon={<CheckCircle2 className="size-4" />} onClick={() => bulk(ids, "approve", clear)}>
                    Duyệt
                  </Button>
                  <Button size="sm" variant="ghost" icon={<EyeOff className="size-4" />} onClick={() => bulk(ids, "hide", clear)}>
                    Ẩn
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Crown className="size-4" />} onClick={() => bulk(ids, "feature", clear)}>
                    Ghim
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => bulk(ids, "delete", clear)}>
                    Xoá
                  </Button>
                </>
              )
            : undefined
        }
        empty={
          <div className="grid place-items-center py-12 text-center">
            <CheckCircle2 className="size-10 text-emerald-400" />
            <p className="mt-2 font-semibold">Không còn đánh giá nào trong bộ lọc này</p>
            <p className="text-sm text-muted">Hàng đợi đã sạch. Thử đổi bộ lọc trạng thái.</p>
          </div>
        }
      />
      <div className="h-fit rounded-2xl border border-ink/5 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold">Phân bố số sao</p>
        <p className="mt-0.5 text-[11px] text-muted">Tất cả đánh giá (mọi trạng thái)</p>
        <ul className="mt-3 space-y-2">
          {(summary?.ratingDist ?? []).map((d) => (
            <li key={d.rating}>
              <button onClick={() => t.setFilter("rating", t.state.filters.rating === String(d.rating) ? "" : String(d.rating))} className="flex w-full items-center gap-2 text-xs">
                <span className="flex w-8 items-center gap-0.5 font-semibold">
                  {d.rating} <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/5">
                  <span className={cx("block h-full rounded-full", d.rating >= 4 ? "bg-emerald-400" : d.rating === 3 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${(d.count / max) * 100}%` }} />
                </span>
                <span className={cx("w-8 text-right", t.state.filters.rating === String(d.rating) ? "font-bold text-brand-500" : "text-muted")}>{d.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* --------------------------- Báo lỗi nội dung --------------------------- */

function ReportsTab() {
  const t = useTable<Report>("/admin/moderation/reports");
  const [open, setOpen] = useState<Report | null>(null);
  const cols: Column<Report>[] = [
    {
      key: "target",
      header: "Nội dung bị báo lỗi",
      cell: (r) => (
        <div className="min-w-[220px] max-w-xs">
          <Badge tone={(TARGET[r.targetType] ?? TARGET.other).tone}>{(TARGET[r.targetType] ?? TARGET.other).label}</Badge>
          <p className="mt-1 line-clamp-2 text-[13px] font-semibold">{r.targetTitle ?? "—"}</p>
        </div>
      ),
    },
    { key: "content", header: "Mô tả lỗi", cell: (r) => <p className="line-clamp-2 min-w-[220px] max-w-sm text-[13px] text-ink/80">{r.content}</p> },
    {
      key: "user",
      header: "Người báo",
      hideOnMobile: true,
      cell: (r) =>
        r.userName ? (
          <span className="flex items-center gap-2 whitespace-nowrap text-xs">
            <Avatar src={r.userAvatar || avatar(r.userName)} name={r.userName} size={26} /> {r.userName}
          </span>
        ) : (
          <span className="text-xs text-muted">Ẩn danh</span>
        ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (r) => (
        <Badge tone={REPORT_STATUS[r.status].tone} dot>
          {REPORT_STATUS[r.status].label}
        </Badge>
      ),
    },
    { key: "createdAt", header: "Thời gian", sortable: true, hideOnMobile: true, cell: (r) => <span className="whitespace-nowrap text-xs text-muted">{timeAgo(r.createdAt)}</span> },
  ];
  return (
    <>
      <TableCard
        table={t}
        columns={cols}
        rowKey={(r) => r.id}
        onRowClick={setOpen}
        placeholder="Tìm theo nội dung, tiêu đề, người báo…"
        filters={[
          {
            key: "status",
            label: "Mọi trạng thái",
            options: [{ value: "unresolved", label: "Chưa xử lý xong" }, ...Object.entries(REPORT_STATUS).map(([value, x]) => ({ value, label: x.label }))],
          },
          { key: "type", label: "Loại nội dung", options: Object.entries(TARGET).map(([value, x]) => ({ value, label: x.label })) },
        ]}
      />
      <ReportDrawer key={open?.id ?? "none"} report={open} onClose={() => setOpen(null)} />
    </>
  );
}

function ReportDrawer({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const [note, setNote] = useState(report?.resolution ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("moderation.write");
  const update = async (status: Report["status"]) => {
    setErr("");
    if (status === "resolved" && !note.trim()) {
      setErr("Nhập ghi chú xử lý trước khi đánh dấu đã xử lý");
      return;
    }
    setBusy(status);
    try {
      await api(`/admin/moderation/reports/${report!.id}`, { method: "PATCH", body: { status, resolution: note.trim() || null } });
      toast.success(status === "resolved" ? "Đã đánh dấu đã xử lý" : "Đã cập nhật báo lỗi");
      refreshAll("/admin/moderation/reports");
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: "Xoá báo lỗi này?", danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/moderation/reports/${report!.id}`, { method: "DELETE" });
      toast.success("Đã xoá báo lỗi");
      refreshAll("/admin/moderation/reports");
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };
  const r = report;
  return (
    <Drawer
      open={!!r}
      onClose={onClose}
      title="Chi tiết báo lỗi"
      footer={
        r &&
        canWrite && (
          <>
            <IconButton label="Xoá" onClick={remove} className="mr-auto hover:text-red-600">
              <Trash2 className="size-4" />
            </IconButton>
            {r.status === "resolved" || r.status === "closed" ? (
              <Button variant="outline" icon={<RotateCcw className="size-4" />} loading={busy === "open"} onClick={() => update("open")}>
                Mở lại
              </Button>
            ) : (
              <>
                <Button variant="ghost" loading={busy === "closed"} onClick={() => update("closed")}>
                  Đóng (không phải lỗi)
                </Button>
                {r.status === "open" && (
                  <Button variant="soft" loading={busy === "pending"} onClick={() => update("pending")}>
                    Đang xử lý
                  </Button>
                )}
              </>
            )}
            <Button icon={<CheckCircle2 className="size-4" />} loading={busy === "resolved"} onClick={() => update("resolved")}>
              Đã xử lý
            </Button>
          </>
        )
      }
    >
      {r && (
        <div className="space-y-4">
          <div className="rounded-xl bg-ink/[.025] p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge tone={(TARGET[r.targetType] ?? TARGET.other).tone}>{(TARGET[r.targetType] ?? TARGET.other).label}</Badge>
              <Badge tone={REPORT_STATUS[r.status].tone} dot>
                {REPORT_STATUS[r.status].label}
              </Badge>
            </div>
            <p className="mt-2 font-bold">{r.targetTitle ?? "Không rõ nội dung"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.adminHref && (
                <Link href={r.adminHref}>
                  <Button size="sm" variant="outline" icon={<ExternalLink className="size-3.5" />}>
                    Mở trong admin
                  </Button>
                </Link>
              )}
              {r.siteHref && (
                <a href={r.siteHref} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost" icon={<ExternalLink className="size-3.5" />}>
                    Xem như học viên
                  </Button>
                </a>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted">Mô tả lỗi</p>
            <p className="mt-1 whitespace-pre-line rounded-xl border border-ink/5 bg-white p-3 text-sm leading-relaxed">{r.content}</p>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted">
              {r.userName && <Avatar src={r.userAvatar || avatar(r.userName)} name={r.userName} size={22} />}
              {r.userName ?? "Ẩn danh"} {r.userEmail && `· ${r.userEmail}`} · {fmtDate(r.createdAt, true)}
            </p>
          </div>
          <Field label="Ghi chú xử lý" required error={err} hint="Bắt buộc khi đánh dấu đã xử lý. Lưu lại để đội ngũ tra cứu sau này.">
            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} disabled={!canWrite} placeholder="VD: Đã sửa furigana và cập nhật lại phụ đề video." />
          </Field>
        </div>
      )}
    </Drawer>
  );
}

/* --------------------------- Bình luận bài học --------------------------- */

function CommentsTab() {
  const t = useTable<Comment>("/admin/moderation/comments", { sort: "createdAt" });
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("moderation.write");
  const refresh = () => refreshAll("/admin/moderation/comments");

  const setStatus = async (c: Comment, status: Comment["status"]) => {
    try {
      await api(`/admin/moderation/comments/${c.id}`, { method: "PATCH", body: { status } });
      toast.success(status === "approved" ? "Đã duyệt bình luận" : "Đã ẩn bình luận");
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const bulk = async (ids: string[], action: "approve" | "hide" | "delete", clear: () => void) => {
    if (action === "delete" && !(await confirm({ title: `Xoá ${ids.length} bình luận?`, danger: true, confirmText: "Xoá" }))) return;
    try {
      const r = await api<{ count: number }>("/admin/moderation/comments/bulk", { body: { ids, action } });
      toast.success(`Đã cập nhật ${r.count} bình luận`);
      clear();
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const cols: Column<Comment>[] = [
    {
      key: "user",
      header: "Người bình luận",
      cell: (c) => (
        <div className="flex min-w-[170px] items-center gap-2.5">
          <Avatar src={c.userAvatar || avatar(c.userName)} name={c.userName} size={32} />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate font-semibold">
              {c.userName}
              {c.userRole !== "student" && <Badge tone="pink">Giáo viên</Badge>}
            </p>
            <p className="truncate text-[11px] text-muted">{c.userEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "content",
      header: "Bình luận",
      cell: (c) => (
        <div className="min-w-[260px] max-w-md">
          {c.parentId && <p className="text-[10.5px] font-semibold text-muted">↳ Trả lời bình luận</p>}
          <p className="line-clamp-3 text-[13px] text-ink/85">{c.content}</p>
        </div>
      ),
    },
    {
      key: "lesson",
      header: "Bài học",
      hideOnMobile: true,
      cell: (c) => (
        <a href={`/hoc/${c.lessonSlug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="line-clamp-2 max-w-[200px] text-xs font-medium text-brand-500 hover:underline">
          {c.lessonTitle}
        </a>
      ),
    },
    {
      key: "likes",
      header: "Thích",
      sortable: true,
      cell: (c) => (
        <span className="flex items-center gap-1 text-xs">
          <Heart className="size-3.5 text-brand-400" /> {c.likes}
        </span>
      ),
    },
    { key: "status", header: "Trạng thái", cell: (c) => <StatusBadge status={c.status} label={MOD_STATUS[c.status].label} /> },
    { key: "createdAt", header: "Thời gian", sortable: true, hideOnMobile: true, cell: (c) => <span className="whitespace-nowrap text-xs text-muted">{timeAgo(c.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-28",
      cell: (c) =>
        canWrite && (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            {c.status !== "approved" && (
              <IconButton label="Duyệt" className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => setStatus(c, "approved")}>
                <ThumbsUp className="size-4" />
              </IconButton>
            )}
            {c.status !== "hidden" && (
              <IconButton label="Ẩn" onClick={() => setStatus(c, "hidden")}>
                <EyeOff className="size-4" />
              </IconButton>
            )}
            <IconButton
              label="Xoá"
              className="hover:text-red-600"
              onClick={async () => {
                if (!(await confirm({ title: "Xoá bình luận này?", message: c.content, danger: true, confirmText: "Xoá" }))) return;
                try {
                  await api(`/admin/moderation/comments/${c.id}`, { method: "DELETE" });
                  toast.success("Đã xoá bình luận");
                  refresh();
                } catch (e) {
                  toast.error(e);
                }
              }}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ),
    },
  ];

  return (
    <TableCard
      table={t}
      columns={cols}
      rowKey={(c) => c.id}
      placeholder="Tìm theo nội dung, người bình luận, bài học…"
      filters={[{ key: "status", label: "Mọi trạng thái", options: Object.entries(MOD_STATUS).map(([value, x]) => ({ value, label: x.label })) }]}
      bulk={
        canWrite
          ? (ids, clear) => (
              <>
                <Button size="sm" variant="soft" icon={<ThumbsUp className="size-4" />} onClick={() => bulk(ids, "approve", clear)}>
                  Duyệt
                </Button>
                <Button size="sm" variant="ghost" icon={<EyeOff className="size-4" />} onClick={() => bulk(ids, "hide", clear)}>
                  Ẩn
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => bulk(ids, "delete", clear)}>
                  Xoá
                </Button>
              </>
            )
          : undefined
      }
    />
  );
}
