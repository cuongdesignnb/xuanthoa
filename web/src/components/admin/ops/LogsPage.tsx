"use client";

import { Activity, CalendarDays, Download, History } from "lucide-react";
import { fmtDate, num, qs, timeAgo } from "@/lib/api";
import { useApi, useTable } from "@/lib/hooks";
import { Avatar, Badge, Button, Input, type Tone } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, StatCard } from "@/components/admin/page";

type Log = { id: number; userId: string | null; userName: string | null; action: string; entity: string; entityId: string | null; summary: string | null; ip: string | null; createdAt: string };
type Facets = {
  actions: { value: string; n: number }[];
  entities: { value: string; n: number }[];
  users: { value: string; label: string; n: number }[];
  stats: { today: number; week: number; total: number };
};

export const ACTION_LABEL: Record<string, { label: string; tone: Tone }> = {
  login: { label: "Đăng nhập", tone: "gray" },
  create: { label: "Tạo mới", tone: "green" },
  update: { label: "Cập nhật", tone: "blue" },
  delete: { label: "Xoá", tone: "red" },
  publish: { label: "Xuất bản", tone: "violet" },
  approve: { label: "Duyệt", tone: "green" },
  reply: { label: "Trả lời", tone: "pink" },
  assign: { label: "Phân công", tone: "amber" },
  send: { label: "Gửi", tone: "violet" },
  schedule: { label: "Hẹn giờ", tone: "blue" },
  block: { label: "Khoá", tone: "red" },
  unblock: { label: "Mở khoá", tone: "green" },
  refund: { label: "Hoàn tiền", tone: "orange" },
  export: { label: "Xuất dữ liệu", tone: "amber" },
  upload: { label: "Tải lên", tone: "blue" },
  reset_password: { label: "Đặt lại mật khẩu", tone: "orange" },
  deactivate: { label: "Vô hiệu hoá", tone: "red" },
  activate: { label: "Kích hoạt", tone: "green" },
  complete: { label: "Hoàn thành", tone: "green" },
  reopen: { label: "Mở lại", tone: "amber" },
};
export const ENTITY_LABEL: Record<string, string> = {
  auth: "Tài khoản",
  student: "Học viên",
  staff: "Nhân sự",
  role: "Nhóm quyền",
  course: "Khóa học",
  lesson: "Bài học",
  quiz: "Bài tập",
  post: "Bài viết",
  media: "Media",
  video: "Video",
  order: "Đơn hàng",
  coupon: "Mã giảm giá",
  plan: "Gói học",
  notification: "Thông báo",
  ticket: "Ticket",
  review: "Đánh giá",
  report: "Báo lỗi",
  setting: "Cài đặt",
  service: "Dịch vụ",
  task: "Công việc",
  teacher: "Giáo viên",
  log: "Nhật ký",
};


/** Tải tệp (CSV) qua thẻ <a> tạm — cookie đăng nhập đi kèm. */
function download(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function LogsPage() {
  const t = useTable<Log>("/admin/logs", { pageSize: 20 });
  const { data: f } = useApi<Facets>("/admin/logs/facets");
  const exportCsv = () => {
    download(`/api/admin/logs/export.csv${qs({ q: t.state.q, ...t.state.filters })}`);
  };
  const columns: Column<Log>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      sortable: true,
      cell: (r) => (
        <div className="whitespace-nowrap">
          <p className="text-xs font-medium">{fmtDate(r.createdAt, true)}</p>
          <p className="text-[11px] text-muted">{timeAgo(r.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "userName",
      header: "Người thực hiện",
      sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Avatar name={r.userName ?? "Hệ thống"} size={28} />
          <span className="truncate text-sm">{r.userName ?? "Hệ thống"}</span>
        </div>
      ),
    },
    {
      key: "action",
      header: "Hành động",
      sortable: true,
      cell: (r) => <Badge tone={ACTION_LABEL[r.action]?.tone ?? "gray"}>{ACTION_LABEL[r.action]?.label ?? r.action}</Badge>,
    },
    { key: "entity", header: "Đối tượng", sortable: true, cell: (r) => <span className="text-xs">{ENTITY_LABEL[r.entity] ?? r.entity}</span> },
    { key: "summary", header: "Nội dung", cell: (r) => <span className="line-clamp-2 max-w-md text-sm">{r.summary ?? "—"}</span> },
    { key: "ip", header: "IP", hideOnMobile: true, cell: (r) => <span className="font-mono text-[11px] text-muted">{r.ip ?? "—"}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Log hoạt động"
        subtitle="Nhật ký thao tác của nhân sự trên hệ thống quản trị"
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Log hoạt động" }]}
        actions={
          <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
            Xuất CSV
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard index={0} icon={<Activity className="size-5" />} label="Hôm nay" value={f ? num(f.stats.today) : "…"} />
        <StatCard index={1} tone="blue" icon={<CalendarDays className="size-5" />} label="7 ngày qua" value={f ? num(f.stats.week) : "…"} />
        <StatCard index={2} tone="violet" icon={<History className="size-5" />} label="Tổng bản ghi" value={f ? num(f.stats.total) : "…"} />
      </div>
      <TableCard
        table={t}
        columns={columns}
        rowKey={(r) => String(r.id)}
        placeholder="Tìm nội dung, người thực hiện, IP…"
        filters={[
          { key: "userId", label: "Người thực hiện", options: (f?.users ?? []).map((u) => ({ value: u.value, label: `${u.label} (${u.n})` })) },
          { key: "action", label: "Hành động", options: (f?.actions ?? []).map((a) => ({ value: a.value, label: `${ACTION_LABEL[a.value]?.label ?? a.value} (${a.n})` })) },
          { key: "entity", label: "Đối tượng", options: (f?.entities ?? []).map((a) => ({ value: a.value, label: `${ENTITY_LABEL[a.value] ?? a.value} (${a.n})` })) },
        ]}
        actions={
          <div className="flex items-center gap-1.5">
            <Input type="date" aria-label="Từ ngày" className="w-[150px]" value={t.state.filters.from ?? ""} onChange={(e) => t.setFilter("from", e.target.value)} />
            <span className="text-xs text-muted">→</span>
            <Input type="date" aria-label="Đến ngày" className="w-[150px]" value={t.state.filters.to ?? ""} onChange={(e) => t.setFilter("to", e.target.value)} />
          </div>
        }
      />
    </>
  );
}
