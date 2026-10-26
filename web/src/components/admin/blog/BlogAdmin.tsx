"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Copy, Crown, ExternalLink, Eye, FilePen, FileText, MoreHorizontal, Pencil, Plus, Send, Trash2, Undo2 } from "lucide-react";
import { Avatar, Badge, Button, Dropdown, IconButton, StatusBadge, Tabs, toast, useConfirm } from "@/components/admin/ui";
import { TableCard, type Column } from "@/components/admin/table";
import { PageHeader, StatCard } from "@/components/admin/page";
import { PostCover } from "@/components/blog/Cover";
import { catLabel, type CoverKind } from "@/components/blog/types";
import { api, compact, fmtDate, num } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { avatar } from "@/components/ui";
import ResourcesTab from "./ResourcesTab";

export type AdminPost = {
  id: string;
  slug: string;
  title: string;
  category: string;
  coverUrl: string | null;
  coverStyle: { kind?: CoverKind } | null;
  status: "draft" | "review" | "published" | "archived";
  scheduled: boolean;
  views: number;
  featured: boolean;
  guide: boolean;
  publishedAt: string | null;
  updatedAt: string;
  authorId: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorAvatarSeed: string | null;
};
type Counts = { all: number; published: number; scheduled: number; review: number; draft: number; archived: number };
export type PostMeta = { categories: { value: string; label: string }[]; authors: { value: string; label: string }[] };

export function PostStatus({ p }: { p: Pick<AdminPost, "status" | "scheduled"> }) {
  if (p.scheduled)
    return (
      <Badge tone="blue" dot>
        Hẹn giờ
      </Badge>
    );
  return <StatusBadge status={p.status} />;
}

export default function BlogAdmin() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = sp.get("tab") === "resources" ? "resources" : "posts";

  // /admin/blog?new=1 → trình soạn thảo bài mới.
  useEffect(() => {
    if (sp.get("new") === "1") router.replace(tab === "resources" ? `${pathname}?tab=resources&new=1` : "/admin/blog/new");
  }, [sp, router, pathname, tab]);

  return (
    <div>
      <PageHeader
        title="Blog & Tài nguyên"
        subtitle="Quản lý bài viết, lịch xuất bản, cẩm nang người mới và tài liệu miễn phí."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Blog & Tài nguyên" }]}
        actions={
          tab === "posts" ? (
            <Link href="/admin/blog/new">
              <Button icon={<Plus className="size-4" />}>Viết bài mới</Button>
            </Link>
          ) : undefined
        }
      />
      <Tabs
        className="mb-4 w-fit"
        value={tab}
        onChange={(v) => router.replace(v === "posts" ? pathname : `${pathname}?tab=resources`, { scroll: false })}
        tabs={[
          { value: "posts", label: "Bài viết" },
          { value: "resources", label: "Tài nguyên" },
        ]}
      />
      {tab === "posts" ? <PostsTab /> : <ResourcesTab />}
    </div>
  );
}

function PostsTab() {
  const t = useTable<AdminPost>("/admin/posts", { sort: "updatedAt" });
  const counts = (t.data as unknown as { counts?: Counts } | undefined)?.counts;
  const meta = useApi<PostMeta>("/admin/posts/meta");
  const router = useRouter();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("posts.write");
  const refresh = () => {
    invalidate("/admin/posts");
    invalidate("/public/posts");
  };

  const patch = async (p: AdminPost, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/admin/posts/${p.id}`, { method: "PATCH", body });
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const duplicate = async (p: AdminPost) => {
    try {
      const r = await api<{ id: string }>(`/admin/posts/${p.id}/duplicate`, { method: "POST" });
      toast.success("Đã nhân bản thành bản nháp");
      refresh();
      router.push(`/admin/blog/${r.id}`);
    } catch (e) {
      toast.error(e);
    }
  };
  const remove = async (ids: string[], clear?: () => void) => {
    if (!(await confirm({ title: `Xoá ${ids.length} bài viết?`, message: "Bài viết sẽ bị xoá vĩnh viễn khỏi blog.", danger: true, confirmText: "Xoá" }))) return;
    try {
      for (const id of ids) await api(`/admin/posts/${id}`, { method: "DELETE" });
      toast.success(`Đã xoá ${ids.length} bài viết`);
      clear?.();
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const bulkStatus = async (ids: string[], status: AdminPost["status"], clear: () => void) => {
    try {
      for (const id of ids) await api(`/admin/posts/${id}`, { method: "PATCH", body: { status } });
      toast.success(status === "published" ? `Đã xuất bản ${ids.length} bài` : `Đã chuyển ${ids.length} bài về nháp`);
      clear();
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  const cols: Column<AdminPost>[] = [
    {
      key: "title",
      header: "Bài viết",
      sortable: true,
      cell: (p) => (
        <div className="flex min-w-[280px] items-center gap-3">
          <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg ring-1 ring-ink/5">
            <PostCover post={p} small sizes="80px" />
          </span>
          <div className="min-w-0">
            <p className="line-clamp-1 font-semibold">{p.title}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="truncate">/blog/{p.slug}</span>
              {p.featured && (
                <span title="Nổi bật" className="text-amber-500">
                  <Crown className="size-3.5 fill-amber-400" />
                </span>
              )}
              {p.guide && <Badge tone="violet">Cẩm nang</Badge>}
            </p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Danh mục", cell: (p) => <Badge tone="pink">{catLabel(p.category)}</Badge> },
    {
      key: "author",
      header: "Tác giả",
      hideOnMobile: true,
      cell: (p) =>
        p.authorName ? (
          <span className="flex items-center gap-2 whitespace-nowrap text-xs">
            <Avatar src={p.authorAvatarUrl || avatar(p.authorAvatarSeed || p.authorName)} name={p.authorName} size={26} />
            {p.authorName}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    { key: "status", header: "Trạng thái", cell: (p) => <PostStatus p={p} /> },
    {
      key: "views",
      header: "Lượt xem",
      sortable: true,
      cell: (p) => (
        <span className="flex items-center gap-1 text-xs font-semibold" title={num(p.views)}>
          <Eye className="size-3.5 text-muted" /> {compact(p.views)}
        </span>
      ),
    },
    {
      key: "publishedAt",
      header: "Xuất bản",
      sortable: true,
      hideOnMobile: true,
      cell: (p) => (
        <span className={`whitespace-nowrap text-xs ${p.scheduled ? "font-semibold text-sky-600" : "text-muted"}`}>
          {p.publishedAt ? fmtDate(p.publishedAt, p.scheduled) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={
              <IconButton label="Thao tác">
                <MoreHorizontal className="size-4" />
              </IconButton>
            }
            items={[
              { label: "Chỉnh sửa", icon: <Pencil className="size-4" />, onClick: () => router.push(`/admin/blog/${p.id}`) },
              ...(p.status === "published" && !p.scheduled
                ? [{ label: "Xem trên website", icon: <ExternalLink className="size-4" />, onClick: () => window.open(`/blog/${p.slug}`, "_blank") }]
                : []),
              ...(canWrite
                ? [
                    { label: "Nhân bản", icon: <Copy className="size-4" />, onClick: () => duplicate(p) },
                    p.status === "published"
                      ? { label: "Gỡ xuống (về nháp)", icon: <Undo2 className="size-4" />, onClick: () => patch(p, { status: "draft" }, "Đã gỡ bài về bản nháp") }
                      : { label: "Xuất bản ngay", icon: <Send className="size-4" />, onClick: () => patch(p, { status: "published", publishedAt: new Date().toISOString() }, "Đã xuất bản bài viết") },
                    { label: p.featured ? "Bỏ nổi bật" : "Đặt nổi bật", icon: <Crown className="size-4" />, onClick: () => patch(p, { featured: !p.featured }, p.featured ? "Đã bỏ nổi bật" : "Đã đặt nổi bật") },
                    "divider" as const,
                    { label: "Xoá", icon: <Trash2 className="size-4" />, danger: true, onClick: () => remove([p.id]) },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  const statusCards = [
    { key: "published", label: "Đã xuất bản", icon: <FileText className="size-5" />, tone: "green" as const },
    { key: "scheduled", label: "Hẹn giờ đăng", icon: <CalendarClock className="size-5" />, tone: "blue" as const },
    { key: "review", label: "Chờ duyệt / xuất bản", icon: <Send className="size-5" />, tone: "amber" as const },
    { key: "draft", label: "Bản nháp", icon: <FilePen className="size-5" />, tone: "violet" as const },
  ];

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statusCards.map((c, i) => (
          <button key={c.key} className="text-left" onClick={() => t.setFilter("status", t.state.filters.status === c.key ? "" : c.key)}>
            <StatCard
              index={i}
              icon={c.icon}
              tone={c.tone}
              label={c.label}
              value={counts ? num(counts[c.key as keyof Counts]) : "…"}
              sub={t.state.filters.status === c.key ? "Đang lọc — bấm để bỏ lọc" : "Bấm để lọc"}
            />
          </button>
        ))}
      </div>
      <TableCard
        table={t}
        columns={cols}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/admin/blog/${p.id}`)}
        placeholder="Tìm theo tiêu đề, slug… (không dấu cũng được)"
        filters={[
          {
            key: "status",
            label: "Trạng thái",
            options: [
              { value: "published", label: "Đã xuất bản" },
              { value: "scheduled", label: "Hẹn giờ" },
              { value: "review", label: "Chờ duyệt" },
              { value: "draft", label: "Bản nháp" },
              { value: "archived", label: "Lưu trữ" },
            ],
          },
          { key: "category", label: "Danh mục", options: meta.data?.categories ?? [] },
          { key: "author", label: "Tác giả", options: meta.data?.authors ?? [] },
          {
            key: "featured",
            label: "Gắn cờ",
            options: [
              { value: "1", label: "Nổi bật" },
              { value: "guide", label: "Cẩm nang" },
            ],
          },
        ]}
        bulk={
          canWrite
            ? (ids, clear) => (
                <>
                  <Button size="sm" variant="soft" onClick={() => bulkStatus(ids, "published", clear)}>
                    Xuất bản
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => bulkStatus(ids, "draft", clear)}>
                    Về nháp
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => remove(ids, clear)}>
                    Xoá
                  </Button>
                </>
              )
            : undefined
        }
      />
    </>
  );
}
