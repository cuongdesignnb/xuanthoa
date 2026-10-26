"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, BookOpen, Copy, ExternalLink, Eye, GraduationCap, MoreHorizontal, Pencil, Plus, Send, Star, Trash2, Undo2, Users } from "lucide-react";
import { Avatar, Badge, Button, Dropdown, IconButton, Level, StatusBadge, toast, useConfirm } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, StatCard } from "@/components/admin/page";
import { CourseCover } from "@/components/courses/art";
import type { CoverStyle } from "@/components/courses/types";
import { api, compact, num, vnd } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { avatar } from "@/components/ui";

export type AdminCourseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  level: string | null;
  category: string;
  coverUrl: string | null;
  coverStyle: CoverStyle | null;
  price: number;
  salePrice: number | null;
  saleEndsAt: string | null;
  rating: number;
  ratingCount: number;
  studentCount: number;
  featured: boolean;
  status: "draft" | "review" | "published" | "archived";
  order: number;
  updatedAt: string;
  teacher: { id: string | null; name: string | null; avatarUrl: string | null; avatarSeed: string | null; avatarBg: string | null } | null;
  lessonsCount: number;
  enrolled: number;
};

export const CATEGORIES = [
  { value: "level", label: "Lộ trình theo cấp độ" },
  { value: "basic", label: "Nhập môn" },
  { value: "jlpt", label: "Luyện thi JLPT" },
  { value: "communication", label: "Giao tiếp" },
  { value: "kanji", label: "Kanji" },
  { value: "business", label: "Tiếng Nhật công việc" },
];
export const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const LEVEL_OPTIONS = ["N5", "N4", "N3", "N2", "N1"].map((v) => ({ value: v, label: v }));
export const STATUS_OPTIONS = [
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
  { value: "review", label: "Chờ duyệt" },
  { value: "archived", label: "Lưu trữ" },
];

type Stats = { total: number; published: number; draft: number; lessons: number; students: number; rating: number };

export function PriceCell({ c }: { c: Pick<AdminCourseRow, "price" | "salePrice"> }) {
  if (!c.price) return <Badge tone="green">Miễn phí</Badge>;
  const sale = c.salePrice != null && c.salePrice < c.price;
  return (
    <div className="leading-tight">
      <p className="font-semibold">{vnd(sale ? c.salePrice : c.price)}</p>
      {sale && <p className="text-[11px] text-muted line-through">{vnd(c.price)}</p>}
    </div>
  );
}

export default function CourseList() {
  const router = useRouter();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("courses.write");
  const t = useTable<AdminCourseRow>("/admin/courses", { sort: "order", order: "asc" });
  const stats = useApi<Stats>("/admin/courses/stats");
  const teachers = useApi<{ value: string; label: string }[]>("/admin/options/teachers");

  const refresh = () => {
    invalidate("/admin/courses");
    invalidate("/public/courses");
  };

  const patch = async (c: AdminCourseRow, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/admin/courses/${c.id}`, { method: "PATCH", body });
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const duplicate = async (c: AdminCourseRow) => {
    try {
      const r = await api<{ id: string }>(`/admin/courses/${c.id}/duplicate`, { method: "POST" });
      toast.success("Đã nhân bản khóa học (bản nháp)");
      refresh();
      router.push(`/admin/khoa-hoc/${r.id}`);
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (c: AdminCourseRow) => {
    const ok = await confirm({
      title: `Xoá khóa học “${c.title}”?`,
      message: "Toàn bộ chương, bài học, từ vựng và tiến độ của học viên trong khóa sẽ bị xoá vĩnh viễn. Khóa đã có đơn hàng thanh toán không thể xoá.",
      confirmText: "Xoá khóa học",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/admin/courses/${c.id}`, { method: "DELETE" });
      toast.success("Đã xoá khóa học");
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const bulk = async (ids: string[], action: string, clear: () => void) => {
    try {
      const r = await api<{ updated: number }>("/admin/courses/bulk", { body: { ids, action } });
      toast.success(`Đã cập nhật ${r.updated} khóa học`);
      clear();
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  /** Đổi chỗ với khóa liền kề theo thứ tự hiển thị toàn cục. */
  const move = async (c: AdminCourseRow, dir: -1 | 1) => {
    try {
      const all = await api<{ items: { id: string }[] }>("/admin/courses?pageSize=200&sort=order&order=asc");
      const ids = all.items.map((x) => x.id);
      const i = ids.indexOf(c.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await api("/admin/courses/reorder", { body: { ids } });
      toast.success("Đã sắp xếp lại");
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const columns: Column<AdminCourseRow>[] = [
    {
      key: "title",
      header: "Khóa học",
      sortable: true,
      cell: (c) => (
        <div className="flex min-w-[260px] items-center gap-3">
          <CourseCover course={c} className="h-12 w-20 shrink-0 rounded-lg [&_span]:!text-[10px] [&_svg]:hidden" />
          <div className="min-w-0">
            <p className="line-clamp-1 font-semibold">{c.title}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              {catLabel(c.category)}
              {c.featured && (
                <span className="inline-flex items-center gap-0.5 text-amber-500">
                  <Star className="size-3 fill-amber-400" /> Nổi bật
                </span>
              )}
            </p>
          </div>
        </div>
      ),
    },
    { key: "level", header: "Cấp độ", cell: (c) => <Level level={c.level} /> },
    {
      key: "teacher",
      header: "Giáo viên",
      hideOnMobile: true,
      cell: (c) =>
        c.teacher?.name ? (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Avatar src={c.teacher.avatarUrl || avatar(c.teacher.avatarSeed || c.teacher.name, c.teacher.avatarBg || "ffe3e3")} name={c.teacher.name} size={26} />
            <span className="text-xs">{c.teacher.name}</span>
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    { key: "lessons", header: "Bài học", sortable: true, cell: (c) => <span className="font-semibold">{c.lessonsCount}</span> },
    {
      key: "enrolled",
      header: "Học viên",
      sortable: true,
      cell: (c) => (
        <span className="whitespace-nowrap" title={`${num(c.enrolled)} ghi danh thực tế · ${num(c.studentCount)} hiển thị`}>
          <b>{compact(c.enrolled)}</b>
        </span>
      ),
    },
    {
      key: "rating",
      header: "Đánh giá",
      sortable: true,
      hideOnMobile: true,
      cell: (c) => (
        <span className="flex items-center gap-1 whitespace-nowrap text-xs">
          <Star className="size-3.5 fill-amber-400 text-amber-400" /> <b>{c.rating}</b> <span className="text-muted">({compact(c.ratingCount)})</span>
        </span>
      ),
    },
    { key: "price", header: "Giá", sortable: true, cell: (c) => <PriceCell c={c} /> },
    { key: "status", header: "Trạng thái", cell: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (c) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-0.5">
          <IconButton label="Sửa" onClick={() => router.push(`/admin/khoa-hoc/${c.id}`)}>
            <Pencil className="size-4" />
          </IconButton>
          {canWrite && (
            <Dropdown
              trigger={
                <IconButton label="Thao tác khác">
                  <MoreHorizontal className="size-4" />
                </IconButton>
              }
              items={[
                { label: "Xem trên trang", icon: <ExternalLink className="size-4" />, onClick: () => window.open(`/khoa-hoc/${c.slug}`, "_blank") },
                c.status === "published"
                  ? { label: "Ẩn (chuyển nháp)", icon: <Undo2 className="size-4" />, onClick: () => patch(c, { status: "draft" }, "Đã ẩn khóa học") }
                  : { label: "Xuất bản", icon: <Send className="size-4" />, onClick: () => patch(c, { status: "published" }, "Đã xuất bản khóa học") },
                { label: c.featured ? "Bỏ nổi bật" : "Đánh dấu nổi bật", icon: <Star className="size-4" />, onClick: () => patch(c, { featured: !c.featured }, "Đã cập nhật") },
                { label: "Nhân bản", icon: <Copy className="size-4" />, onClick: () => duplicate(c) },
                { label: "Đưa lên", icon: <span className="w-4 text-center">↑</span>, onClick: () => move(c, -1) },
                { label: "Đưa xuống", icon: <span className="w-4 text-center">↓</span>, onClick: () => move(c, 1) },
                "divider",
                { label: "Lưu trữ", icon: <Archive className="size-4" />, onClick: () => patch(c, { status: "archived" }, "Đã lưu trữ khóa học") },
                { label: "Xoá", icon: <Trash2 className="size-4" />, danger: true, onClick: () => remove(c) },
              ]}
            />
          )}
        </div>
      ),
    },
  ];

  const s = stats.data;
  return (
    <div>
      <PageHeader
        title="Khóa học"
        subtitle="Quản lý danh mục khóa học, chương trình học, giá bán và học viên."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Khóa học" }]}
        actions={
          canWrite && (
            <Link href="/admin/khoa-hoc/moi">
              <Button icon={<Plus className="size-4" />}>Tạo khóa học</Button>
            </Link>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} icon={<BookOpen className="size-5" />} label="Tổng khóa học" value={s ? num(s.total) : "…"} sub={s ? `${s.published} đang mở · ${s.draft} nháp` : undefined} tone="red" />
        <StatCard index={1} icon={<GraduationCap className="size-5" />} label="Bài học" value={s ? num(s.lessons) : "…"} sub="Trên tất cả khóa học" tone="violet" href="/admin/bai-hoc" />
        <StatCard index={2} icon={<Users className="size-5" />} label="Lượt ghi danh" value={s ? compact(s.students) : "…"} sub="Ghi danh đang hoạt động" tone="green" />
        <StatCard index={3} icon={<Star className="size-5" />} label="Đánh giá trung bình" value={s ? s.rating.toFixed(2) : "…"} sub="Các khóa đã xuất bản" tone="amber" />
      </div>
      <TableCard
        table={t}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/khoa-hoc/${r.id}`)}
        placeholder="Tìm theo tên, slug…"
        filters={[
          { key: "status", label: "Trạng thái", options: STATUS_OPTIONS },
          { key: "level", label: "Cấp độ", options: LEVEL_OPTIONS },
          { key: "category", label: "Danh mục", options: CATEGORIES },
          { key: "teacherId", label: "Giáo viên", options: teachers.data ?? [] },
        ]}
        bulk={
          canWrite
            ? (ids, clear) => (
                <>
                  <Button size="sm" variant="soft" icon={<Send className="size-3.5" />} onClick={() => bulk(ids, "publish", clear)}>
                    Xuất bản
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" />} onClick={() => bulk(ids, "draft", clear)}>
                    Chuyển nháp
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Archive className="size-3.5" />} onClick={() => bulk(ids, "archive", clear)}>
                    Lưu trữ
                  </Button>
                </>
              )
            : undefined
        }
      />
    </div>
  );
}
