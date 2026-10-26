"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Crown,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Drawer,
  Dropdown,
  Field,
  IconButton,
  ImageInput,
  Input,
  Panel,
  Select,
  Skeleton,
  Switch,
  TagInput,
  Textarea,
  cx,
  toast,
  useConfirm,
} from "@/components/admin/ui";
import { DataTable, Pagination, TableToolbar, type Column } from "@/components/admin/table";
import { ProgressBar } from "@/components/admin/charts";
import { PageHeader, StatCard, useForm } from "@/components/admin/page";
import { avatar } from "@/components/ui";
import { api, num } from "@/lib/api";
import { invalidate, useApi, useTable } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

type AdminTeacher = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  avatarSeed: string | null;
  avatarBg: string | null;
  levelRange: string | null;
  badge: string | null;
  native: boolean;
  skills: string[];
  yearsExp: number;
  bio: string | null;
  quote: string | null;
  education: string | null;
  highlights: string[];
  rating: number;
  reviewCount: number;
  studentCount: number;
  completionRate: number;
  featured: boolean;
  status: "draft" | "review" | "published" | "archived";
  order: number;
  userId: string | null;
  userEmail: string | null;
  enrolled: number;
  realCompletion: number | null;
  realRating: number | null;
  approvedReviews: number;
  courseCount: number;
};
type Summary = { total: number; published: number; native: number; featured: number; avgRating: number; students: number; avgCompletion: number };
type Perf = { rank: number; id: string; name: string; avatarUrl: string | null; avatarSeed: string | null; avatarBg: string | null; students: number; completionRate: number; rating: number };

const teacherImg = (t: { avatarUrl: string | null; avatarSeed: string | null; avatarBg?: string | null; name: string }) =>
  t.avatarUrl || avatar(t.avatarSeed || t.name, t.avatarBg || "ffe3e3");
const badgeText = (t: { badge: string | null; native: boolean }) => (t.native || t.badge === "native" ? "Bản ngữ" : t.badge || "—");
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

export default function TeachersAdmin() {
  const t = useTable<AdminTeacher>("/admin/teachers", { pageSize: 20 });
  const summary = (t.data as unknown as { summary?: Summary } | undefined)?.summary;
  const perf = useApi<{ items: Perf[] }>("/admin/teachers/performance?limit=5");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<"table" | "grid">("table");
  const [edit, setEdit] = useState<AdminTeacher | null>(null);
  const creating = sp.get("new") === "1";
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("teachers.write");

  // Mở từ tìm kiếm toàn cục: /admin/giao-vien?id=…
  const deepId = sp.get("id");
  const deep = useApi<AdminTeacher>(deepId ? `/admin/teachers/${deepId}` : null);
  const current = edit ?? (deepId ? (deep.data ?? null) : null);

  const refresh = () => {
    invalidate("/admin/teachers");
    invalidate("/public/teachers");
    invalidate("/public/home");
  };
  const patch = async (x: AdminTeacher, body: Partial<AdminTeacher>, msg?: string) => {
    try {
      await api(`/admin/teachers/${x.id}`, { method: "PATCH", body });
      if (msg) toast.success(msg);
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const move = async (x: AdminTeacher, dir: -1 | 1) => {
    const list = t.items;
    const i = list.findIndex((r) => r.id === x.id);
    const other = list[i + dir];
    if (!other) return;
    try {
      await api(`/admin/teachers/${x.id}`, { method: "PATCH", body: { order: other.order } });
      await api(`/admin/teachers/${other.id}`, { method: "PATCH", body: { order: x.order === other.order ? x.order + dir : x.order } });
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const remove = async (x: AdminTeacher) => {
    if (!(await confirm({ title: `Xoá giáo viên ${x.name}?`, message: "Khóa học và bài viết của giáo viên sẽ không còn gắn tác giả.", danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/teachers/${x.id}`, { method: "DELETE" });
      toast.success("Đã xoá giáo viên");
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };
  const sortedByOrder = !t.state.sort || t.state.sort === "order";

  const menu = (x: AdminTeacher) => (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown
        trigger={
          <IconButton label="Thao tác">
            <MoreHorizontal className="size-4" />
          </IconButton>
        }
        items={[
          { label: canWrite ? "Chỉnh sửa" : "Xem chi tiết", icon: <Pencil className="size-4" />, onClick: () => setEdit(x) },
          { label: "Xem trang giáo viên", icon: <ExternalLink className="size-4" />, onClick: () => window.open("/giao-vien", "_blank") },
          ...(canWrite
            ? [
                { label: x.featured ? "Bỏ tiêu biểu" : "Đặt làm tiêu biểu", icon: <Crown className="size-4" />, onClick: () => patch(x, { featured: !x.featured }, x.featured ? "Đã bỏ tiêu biểu" : "Đã đặt làm giáo viên tiêu biểu") },
                {
                  label: x.status === "published" ? "Ẩn khỏi website" : "Hiển thị trên website",
                  icon: <UserRound className="size-4" />,
                  onClick: () => patch(x, { status: x.status === "published" ? "draft" : "published" }, "Đã cập nhật trạng thái"),
                },
                "divider" as const,
                { label: "Xoá", icon: <Trash2 className="size-4" />, danger: true, onClick: () => remove(x) },
              ]
            : []),
        ]}
      />
    </div>
  );

  const cols: Column<AdminTeacher>[] = [
    {
      key: "order",
      header: "#",
      sortable: true,
      className: "w-16",
      cell: (x, i) =>
        canWrite && sortedByOrder ? (
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <IconButton label="Lên" className="size-6" disabled={i === 0} onClick={() => move(x, -1)}>
              <ArrowUp className="size-3.5" />
            </IconButton>
            <IconButton label="Xuống" className="size-6" disabled={i === t.items.length - 1} onClick={() => move(x, 1)}>
              <ArrowDown className="size-3.5" />
            </IconButton>
          </div>
        ) : (
          <span className="text-xs text-muted">{x.order + 1}</span>
        ),
    },
    {
      key: "name",
      header: "Giáo viên",
      sortable: true,
      cell: (x) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <Avatar src={teacherImg(x)} name={x.name} size={40} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{x.name}</span>
              {x.featured && <Crown className="size-3.5 shrink-0 fill-amber-400 text-amber-500" />}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <Badge tone={x.native ? "pink" : x.badge === "N1" ? "violet" : "blue"}>{badgeText(x)}</Badge>
              {x.levelRange} · {x.yearsExp} năm
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "skills",
      header: "Chuyên môn",
      hideOnMobile: true,
      cell: (x) => (
        <div className="flex max-w-[220px] flex-wrap gap-1">
          {x.skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded bg-ink/5 px-1.5 py-0.5 text-[10.5px]">
              {s}
            </span>
          ))}
          {x.skills.length > 3 && <span className="text-[10.5px] text-muted">+{x.skills.length - 3}</span>}
        </div>
      ),
    },
    {
      key: "studentCount",
      header: "Học viên",
      sortable: true,
      cell: (x) => (
        <div className="text-xs">
          <p className="font-bold">{num(x.studentCount)}</p>
          <p className="text-[10.5px] text-muted" title="Học viên đang ghi danh các khóa của giáo viên trên nền tảng">
            {num(x.enrolled)} ghi danh · {x.courseCount} khóa
          </p>
        </div>
      ),
    },
    {
      key: "completionRate",
      header: "Tỉ lệ hoàn thành",
      sortable: true,
      cell: (x) => {
        const v = x.realCompletion ?? x.completionRate;
        return (
          <div className="w-32">
            <p className="text-xs font-semibold">{v}%</p>
            <ProgressBar value={v} tone={v >= 85 ? "green" : v >= 70 ? "amber" : "red"} className="mt-1" />
          </div>
        );
      },
    },
    {
      key: "rating",
      header: "Đánh giá",
      sortable: true,
      cell: (x) => (
        <div className="text-xs">
          <p className="flex items-center gap-1 font-bold">
            <Star className="size-3.5 fill-amber-400 text-amber-400" /> {x.rating.toFixed(1)}
          </p>
          <p className="text-[10.5px] text-muted">
            {num(x.reviewCount)} lượt{x.approvedReviews ? ` · ${x.approvedReviews} trên web (${x.realRating?.toFixed(1)})` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "featured",
      header: "Tiêu biểu",
      cell: (x) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch checked={x.featured} disabled={!canWrite} onChange={(v) => patch(x, { featured: v }, v ? "Đã đặt làm giáo viên tiêu biểu" : "Đã bỏ tiêu biểu")} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Hiển thị",
      hideOnMobile: true,
      cell: (x) => (x.status === "published" ? <Badge tone="green" dot>Công khai</Badge> : <Badge tone="gray">Ẩn</Badge>),
    },
    { key: "actions", header: "", className: "w-10", cell: menu },
  ];

  return (
    <div>
      <PageHeader
        title="Giáo viên"
        subtitle="Hồ sơ, chuyên môn, thứ tự hiển thị và hiệu suất giảng dạy của đội ngũ."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Giáo viên" }]}
        actions={
          canWrite && (
            <Button icon={<Plus className="size-4" />} onClick={() => router.replace(`${pathname}?new=1`, { scroll: false })}>
              Thêm giáo viên
            </Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} icon={<UserRound className="size-5" />} label="Giáo viên" value={summary ? num(summary.total) : "…"} sub={summary ? `${summary.published} đang hiển thị · ${summary.native} bản ngữ` : undefined} />
        <StatCard index={1} tone="blue" icon={<Users className="size-5" />} label="Tổng học viên đã dạy" value={summary ? num(summary.students) : "…"} />
        <StatCard index={2} tone="amber" icon={<Star className="size-5" />} label="Đánh giá trung bình" value={summary ? `${summary.avgRating.toFixed(2)}/5` : "…"} />
        <StatCard index={3} tone="green" icon={<GraduationCap className="size-5" />} label="Tỉ lệ hoàn thành TB" value={summary ? `${summary.avgCompletion}%` : "…"} sub={summary ? `${summary.featured} giáo viên tiêu biểu` : undefined} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
        <Card className="p-4">
          <TableToolbar
            table={t}
            placeholder="Tìm tên, chuyên môn…"
            filters={[
              {
                key: "filter",
                label: "Chuyên môn",
                options: [
                  { value: "native", label: "Bản ngữ" },
                  { value: "jlpt", label: "JLPT" },
                  { value: "giao-tiep", label: "Giao tiếp" },
                  { value: "kanji", label: "Kanji" },
                  { value: "n5n3", label: "N5 – N3" },
                  { value: "n2n1", label: "N2 – N1" },
                ],
              },
              { key: "status", label: "Hiển thị", options: [{ value: "published", label: "Công khai" }, { value: "draft", label: "Ẩn" }] },
              { key: "featured", label: "Tiêu biểu", options: [{ value: "1", label: "Chỉ tiêu biểu" }] },
            ]}
          >
            <div className="flex rounded-lg bg-ink/[.04] p-0.5">
              {(["table", "grid"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-label={v === "table" ? "Dạng bảng" : "Dạng lưới"}
                  className={cx("grid size-8 place-items-center rounded-md", view === v ? "bg-white text-brand-500 shadow-sm" : "text-ink/50")}
                >
                  {v === "table" ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
                </button>
              ))}
            </div>
          </TableToolbar>
          {view === "table" ? (
            <DataTable table={t} columns={cols} rowKey={(x) => x.id} onRowClick={setEdit} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {t.loading && !t.items.length && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
              {t.items.map((x) => (
                <div key={x.id} onClick={() => setEdit(x)} className="group cursor-pointer overflow-hidden rounded-xl border border-ink/5 bg-white transition hover:shadow-lg hover:shadow-brand-500/5">
                  <div className="relative h-28" style={{ background: `#${x.avatarBg ?? "ffe3e3"}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={x.avatarUrl || avatar(x.avatarSeed || x.name, "transparent")} alt="" className={x.avatarUrl ? "size-full object-cover" : "absolute bottom-0 left-1/2 h-[110%] -translate-x-1/2"} />
                    <span className="absolute left-2 top-2">
                      <Badge tone={x.native ? "pink" : "blue"}>{badgeText(x)}</Badge>
                    </span>
                    {x.featured && <Crown className="absolute right-2 top-2 size-5 fill-amber-400 text-amber-500" />}
                    <span className="absolute bottom-1 right-1">{menu(x)}</span>
                  </div>
                  <div className="p-3">
                    <p className="truncate font-bold">{x.name}</p>
                    <p className="text-[11px] text-muted">
                      {x.levelRange} · {x.yearsExp} năm kinh nghiệm
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px]">
                      <span className="rounded-md bg-ink/[.03] py-1">
                        <b className="block text-ink">{num(x.studentCount)}</b>học viên
                      </span>
                      <span className="rounded-md bg-ink/[.03] py-1">
                        <b className="block text-ink">{x.realCompletion ?? x.completionRate}%</b>hoàn thành
                      </span>
                      <span className="rounded-md bg-ink/[.03] py-1">
                        <b className="block text-ink">{x.rating.toFixed(1)}</b>đánh giá
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination table={t as never} />
        </Card>

        <Panel title="Hiệu suất giáo viên" icon={<Trophy className="size-4 text-amber-500" />} subtitle="Xếp hạng theo số học viên">
          <ol className="space-y-3">
            {perf.loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            {perf.data?.items.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className={cx("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold", p.rank === 1 ? "bg-amber-400 text-white" : p.rank <= 3 ? "bg-brand-100 text-brand-600" : "bg-ink/5 text-ink/60")}>
                  {p.rank}
                </span>
                <Avatar src={teacherImg(p)} name={p.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.completionRate} className="flex-1" />
                    <span className="text-[10.5px] text-muted">{p.completionRate}%</span>
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <p className="font-bold">{num(p.students)}</p>
                  <p className="flex items-center justify-end gap-0.5 text-muted">
                    <Star className="size-3 fill-amber-400 text-amber-400" /> {p.rating.toFixed(1)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <TeacherDrawer
        key={current?.id ?? (creating ? "new" : "none")}
        open={!!current || creating}
        item={current}
        canWrite={canWrite}
        onClose={() => {
          setEdit(null);
          if (creating || deepId) router.replace(pathname, { scroll: false });
        }}
        onSaved={refresh}
      />
    </div>
  );
}

function TeacherDrawer({ open, item, canWrite, onClose, onSaved }: { open: boolean; item: AdminTeacher | null; canWrite: boolean; onClose: () => void; onSaved: () => void }) {
  const accounts = useApi<{ value: string; label: string }[]>(open ? "/admin/teachers-accounts" : null);
  const [lvFrom, lvTo] = (item?.levelRange ?? "N5 – N3").split(/\s*[–-]\s*/);
  const f = useForm({
    name: item?.name ?? "",
    slug: item?.slug ?? "",
    title: item?.title ?? "",
    userId: item?.userId ?? "",
    avatarUrl: item?.avatarUrl ?? null,
    avatarSeed: item?.avatarSeed ?? "",
    avatarBg: item?.avatarBg ?? "ffe4e8",
    lvFrom: lvFrom || "N5",
    lvTo: lvTo || "N3",
    badge: item?.native ? "native" : (item?.badge ?? "N2"),
    skills: item?.skills ?? [],
    yearsExp: item?.yearsExp ?? 1,
    bio: item?.bio ?? "",
    quote: item?.quote ?? "",
    education: item?.education ?? "",
    highlights: item?.highlights ?? [],
    rating: item?.rating ?? 5,
    reviewCount: item?.reviewCount ?? 0,
    studentCount: item?.studentCount ?? 0,
    completionRate: item?.completionRate ?? 0,
    featured: item?.featured ?? false,
    status: item?.status ?? "published",
  });
  const v = f.values;
  const [syncing, setSyncing] = useState(false);

  const save = async () => {
    const body = {
      name: v.name,
      slug: v.slug || null,
      title: v.title || null,
      userId: v.userId || null,
      avatarUrl: v.avatarUrl,
      avatarSeed: v.avatarSeed || null,
      avatarBg: v.avatarBg || null,
      levelRange: v.lvFrom === v.lvTo ? v.lvFrom : `${v.lvFrom} – ${v.lvTo}`,
      badge: v.badge,
      native: v.badge === "native",
      skills: v.skills,
      yearsExp: Number(v.yearsExp) || 0,
      bio: v.bio || null,
      quote: v.quote || null,
      education: v.education || null,
      highlights: v.highlights,
      rating: Number(v.rating) || 0,
      reviewCount: Number(v.reviewCount) || 0,
      studentCount: Number(v.studentCount) || 0,
      completionRate: Number(v.completionRate) || 0,
      featured: v.featured,
      status: v.status,
    };
    try {
      await f.submit(() => (item ? api(`/admin/teachers/${item.id}`, { method: "PATCH", body }) : api("/admin/teachers", { body })));
      toast.success(item ? "Đã cập nhật hồ sơ giáo viên" : "Đã thêm giáo viên");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };
  const sync = async () => {
    if (!item) return;
    setSyncing(true);
    try {
      const r = await api<AdminTeacher>(`/admin/teachers/${item.id}/sync-stats`, { method: "POST" });
      f.set("rating", r.rating);
      f.set("completionRate", r.completionRate);
      toast.success("Đã đồng bộ điểm đánh giá và tỉ lệ hoàn thành từ dữ liệu thật");
      onSaved();
    } catch (e) {
      toast.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const preview = v.avatarUrl || avatar(v.avatarSeed || v.name || "giao-vien", v.avatarBg || "ffe4e8");
  const lvOpts = LEVELS.map((l) => ({ value: l, label: l }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={item ? `Hồ sơ: ${item.name}` : "Thêm giáo viên"}
      footer={
        canWrite && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Huỷ
            </Button>
            <Button onClick={save} loading={f.submitting}>
              {item ? "Lưu thay đổi" : "Thêm giáo viên"}
            </Button>
          </>
        )
      }
    >
      <fieldset disabled={!canWrite} className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <div>
            <ImageInput value={v.avatarUrl} onChange={(u) => f.set("avatarUrl", u)} aspect="aspect-square" folder="teachers" />
            {!v.avatarUrl && (
              <div className="mt-2 flex items-center gap-2">
                <Avatar src={preview} name={v.name || "GV"} size={36} />
                <p className="text-[11px] leading-tight text-muted">Chưa có ảnh: dùng avatar minh hoạ</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <Field label="Họ tên (kèm danh xưng)" required error={f.errors.name}>
              <Input value={v.name} onChange={f.input("name")} placeholder="VD: Cô Nguyễn Thị Mai" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Slug" error={f.errors.slug} hint="Để trống để tự tạo">
                <Input value={v.slug} onChange={f.input("slug")} placeholder="mai" />
              </Field>
              <Field label="Chức danh">
                <Input value={v.title} onChange={f.input("title")} placeholder="Giáo viên cao cấp tại Nihongo+" />
              </Field>
            </div>
            {!v.avatarUrl && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Seed avatar minh hoạ">
                  <Input value={v.avatarSeed} onChange={f.input("avatarSeed")} placeholder="Yuki" />
                </Field>
                <Field label="Màu nền (hex)">
                  <div className="flex gap-2">
                    <Input value={v.avatarBg} onChange={f.input("avatarBg")} placeholder="ffe4e8" />
                    <span className="size-10 shrink-0 rounded-lg ring-1 ring-ink/10" style={{ background: `#${v.avatarBg}` }} />
                  </div>
                </Field>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <Field label="Chứng chỉ / huy hiệu">
            <Select
              value={v.badge}
              onChange={f.input("badge")}
              options={[
                { value: "native", label: "Bản ngữ" },
                { value: "N1", label: "JLPT N1" },
                { value: "N2", label: "JLPT N2" },
                { value: "N3", label: "JLPT N3" },
              ]}
            />
          </Field>
          <Field label="Dạy từ">
            <Select value={v.lvFrom} onChange={f.input("lvFrom")} options={lvOpts} />
          </Field>
          <Field label="Đến">
            <Select value={v.lvTo} onChange={f.input("lvTo")} options={lvOpts} />
          </Field>
          <Field label="Năm kinh nghiệm">
            <Input type="number" min={0} value={v.yearsExp ?? ""} onChange={f.input("yearsExp")} />
          </Field>
        </section>

        <Field label="Chuyên môn (Enter để thêm)" hint="Dùng cho bộ lọc: JLPT, Giao tiếp, Kanji…" error={f.errors.skills}>
          <TagInput value={v.skills} onChange={(x) => f.set("skills", x)} placeholder="VD: Giao tiếp" />
        </Field>
        <Field label="Giới thiệu ngắn" error={f.errors.bio}>
          <Textarea rows={3} value={v.bio} onChange={f.input("bio")} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Câu nói truyền cảm hứng">
            <Textarea rows={3} value={v.quote} onChange={f.input("quote")} />
          </Field>
          <Field label="Học vấn" hint="Dùng dấu · để tách dòng phụ">
            <Textarea rows={3} value={v.education} onChange={f.input("education")} placeholder="Cử nhân ĐH Kyoto · Chuyên ngành Sư phạm tiếng Nhật" />
          </Field>
        </div>
        <Field label="Điểm nổi bật (Enter để thêm)">
          <TagInput value={v.highlights} onChange={(x) => f.set("highlights", x)} placeholder="VD: Từng giảng dạy tại nhiều trung tâm quốc tế" />
        </Field>

        <section className="rounded-xl bg-ink/[.025] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-bold">Chỉ số hồ sơ</p>
            {item && canWrite && (
              <Button size="sm" variant="soft" icon={<RefreshCw className="size-3.5" />} loading={syncing} onClick={sync}>
                Đồng bộ từ dữ liệu thật
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Điểm đánh giá">
              <Input type="number" step="0.1" min={0} max={5} value={v.rating ?? ""} onChange={f.input("rating")} />
            </Field>
            <Field label="Số đánh giá">
              <Input type="number" min={0} value={v.reviewCount ?? ""} onChange={f.input("reviewCount")} />
            </Field>
            <Field label="Số học viên">
              <Input type="number" min={0} value={v.studentCount ?? ""} onChange={f.input("studentCount")} />
            </Field>
            <Field label="Hoàn thành (%)">
              <Input type="number" min={0} max={100} value={v.completionRate ?? ""} onChange={f.input("completionRate")} />
            </Field>
          </div>
          {item && (
            <p className="mt-2 text-[11px] text-muted">
              Trên nền tảng: {num(item.enrolled)} học viên ghi danh · {item.courseCount} khóa học · {item.approvedReviews} đánh giá đã duyệt
              {item.realRating != null && ` (TB ${item.realRating.toFixed(1)})`}
              {item.realCompletion != null && ` · hoàn thành bài học ${item.realCompletion}%`}
            </p>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Liên kết tài khoản đăng nhập" hint="Cho phép giáo viên đăng nhập khu quản trị">
            <Select value={v.userId} onChange={f.input("userId")} placeholder="— Không liên kết —" options={accounts.data ?? []} />
          </Field>
          <Field label="Hiển thị">
            <Select
              value={v.status}
              onChange={f.input("status")}
              options={[
                { value: "published", label: "Công khai trên website" },
                { value: "draft", label: "Ẩn" },
              ]}
            />
          </Field>
        </section>
        <Switch checked={v.featured} onChange={(x) => f.set("featured", x)} label="Giáo viên tiêu biểu (hiển thị nổi bật ở trang Giáo viên)" />
      </fieldset>
    </Drawer>
  );
}
