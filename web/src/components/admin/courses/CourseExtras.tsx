"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Avatar, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { ProgressBar } from "@/components/admin/charts";
import { fmtDate, timeAgo } from "@/lib/api";
import { useApi, useTable } from "@/lib/hooks";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  enrolledAt: string;
  lastActiveAt: string | null;
  progress: { completed: number; total: number; percent: number };
};

export function CourseStudents({ courseId }: { courseId: string }) {
  const t = useTable<StudentRow>(`/admin/courses/${courseId}/students`);
  const columns: Column<StudentRow>[] = [
    {
      key: "name",
      header: "Học viên",
      cell: (r) => (
        <Link href={`/admin/hoc-vien/${r.id}`} className="flex min-w-[220px] items-center gap-2.5 hover:text-brand-500" onClick={(e) => e.stopPropagation()}>
          <Avatar src={r.avatarUrl} name={r.name} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{r.name}</span>
            <span className="block truncate text-[11px] text-muted">{r.email}</span>
          </span>
        </Link>
      ),
    },
    {
      key: "progress",
      header: "Tiến độ",
      cell: (r) => (
        <div className="min-w-[160px]">
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="font-semibold">{r.progress.percent}%</span>
            <span className="text-muted">
              {r.progress.completed}/{r.progress.total} bài
            </span>
          </div>
          <ProgressBar value={r.progress.percent} />
        </div>
      ),
    },
    { key: "enrolledAt", header: "Ghi danh", hideOnMobile: true, cell: (r) => <span className="whitespace-nowrap text-xs">{fmtDate(r.enrolledAt)}</span> },
    { key: "lastActiveAt", header: "Học gần nhất", hideOnMobile: true, cell: (r) => <span className="whitespace-nowrap text-xs text-muted">{r.lastActiveAt ? timeAgo(r.lastActiveAt) : "Chưa học"}</span> },
    { key: "status", header: "Trạng thái", cell: (r) => <StatusBadge status={r.status} label={r.status === "active" ? "Đang học" : r.status === "cancelled" ? "Đã huỷ" : undefined} /> },
  ];
  return <TableCard table={t} columns={columns} rowKey={(r) => r.id} placeholder="Tìm học viên theo tên, email…" empty={<EmptyState title="Chưa có học viên" description="Học viên sẽ xuất hiện khi đăng ký hoặc mua khóa học." />} />;
}

type ReviewsRes = {
  items: { id: string; authorName: string; authorRole: string | null; rating: number; content: string; status: string; createdAt: string }[];
  total: number;
  avg: number;
  dist: { star: number; count: number }[];
};

export function CourseReviews({ courseId }: { courseId: string }) {
  const { data, loading, error, reload } = useApi<ReviewsRes>(`/admin/courses/${courseId}/reviews`);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data)
    return (
      <Card className="space-y-3 p-5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </Card>
    );
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <Card className="p-5">
        <p className="text-sm font-semibold text-muted">Điểm trung bình</p>
        <p className="mt-1 flex items-end gap-2 text-4xl font-extrabold">
          {data.avg || "—"} <span className="pb-1 text-sm font-medium text-muted">/ 5 · {data.total} đánh giá</span>
        </p>
        <div className="mt-4 space-y-2">
          {data.dist.map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-xs">
              <span className="flex w-8 items-center gap-0.5">
                {d.star} <Star className="size-3 fill-amber-400 text-amber-400" />
              </span>
              <div className="flex-1">
                <ProgressBar value={data.total ? (d.count / data.total) * 100 : 0} />
              </div>
              <span className="w-6 text-right text-muted">{d.count}</span>
            </div>
          ))}
        </div>
        <Link href="/admin/danh-gia" className="mt-4 inline-block text-xs font-semibold text-brand-500">
          Duyệt đánh giá ở mục Đánh giá & báo lỗi →
        </Link>
      </Card>
      <Card className="p-5">
        {!data.items.length && <EmptyState title="Chưa có đánh giá" />}
        <ul className="divide-y divide-ink/5">
          {data.items.map((r) => (
            <li key={r.id} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <Avatar name={r.authorName} size={28} />
                <b className="text-sm">{r.authorName}</b>
                <span className="flex">
                  {Array.from({ length: 5 }, (_, k) => (
                    <Star key={k} className={`size-3 ${k < r.rating ? "fill-amber-400 text-amber-400" : "text-ink/15"}`} />
                  ))}
                </span>
                <StatusBadge status={r.status} />
                <span className="ml-auto text-[11px] text-muted">{fmtDate(r.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-ink/80">{r.content}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
