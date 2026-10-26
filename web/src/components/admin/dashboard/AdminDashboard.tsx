"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  Cloud,
  CreditCard,
  Crown,
  FileText,
  GraduationCap,
  Headphones,
  Mail,
  MessageSquareText,
  Plus,
  RotateCcw,
  Send,
  Server,
  Smartphone,
  Star,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import { api, compact, fmtDate, vnd, vndShort } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { avatar } from "@/components/ui";
import { AdminHero, StatCard } from "../page";
import { BarChart, Donut, ProgressBar, DONUT_COLORS } from "../charts";
import { Avatar, Badge, Button, Card, Checkbox, ErrorState, Field, Input, Modal, Panel, Select, Skeleton, StatusBadge, Textarea, cx, toast } from "../ui";

type Series = { label: string; value: number; growth: number; orders?: number };
type Stat = { value: number; delta: number; spark: number[] } & Record<string, unknown>;
type Dashboard = {
  stats: Record<"students" | "active" | "teachers" | "courses" | "revenue" | "completion", Stat>;
  revenue: { total: number; growth: number; series: Series[] };
  registrations: { total: number; growth: number; series: Series[] };
  breakdown: { total: number; items: { label: string; value: number }[] };
  recentOrders: { id: string; code: string; itemName: string; amount: number; discount: number; status: string; createdAt: string; userId: string; userName: string; avatarUrl: string | null }[];
  featuredCourses: {
    id: string;
    slug: string;
    title: string;
    level: string | null;
    coverUrl: string | null;
    rating: number;
    studentCount: number;
    enrolled: number;
    teacherName: string | null;
    teacherSeed: string | null;
    teacherAvatar: string | null;
  }[];
  todo: { reviews: number; reports: number; refunds: number; posts: number; tickets: number };
  tasks: { id: string; title: string; note: string | null; dueAt: string; color: string; done: boolean; state: string }[];
  teacherPerformance: { id: string; name: string; avatarSeed: string | null; avatarUrl: string | null; avatarBg: string | null; students: number; completion: number; rating: number }[];
  services: { key: string; name: string; uptime: number; status: string }[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const { data, error, reload } = useApi<Dashboard>("/admin/dashboard");

  return (
    <div className="space-y-5">
      <AdminHero
        script={
          <>
            Kết nối tri thức
            <br />
            Mở ra tương lai
            <br />
            cùng tiếng Nhật
          </>
        }
      >
        <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-extrabold tracking-tight sm:text-[2rem]">
          Tổng quan hệ thống <span className="text-brand-500">Nihongo+</span>
        </motion.h2>
        <p className="mt-1 text-lg font-medium">Theo dõi vận hành nền tảng học tiếng Nhật theo thời gian thực</p>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Quản lý học viên, khóa học, nội dung và doanh thu trên một nền tảng duy nhất. Cùng nhau mang tiếng Nhật đến gần hơn với hàng triệu người Việt!
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button icon={<Plus className="size-4" />} onClick={() => router.push("/admin/khoa-hoc/moi")}>
            Tạo khóa học
          </Button>
          <Button variant="outline" icon={<Send className="size-4" />} onClick={() => router.push("/admin/thong-bao?new=1")}>
            Gửi thông báo
          </Button>
          <Button variant="outline" icon={<Upload className="size-4" />} onClick={() => router.push("/admin/bao-cao")}>
            Xuất báo cáo
          </Button>
        </div>
      </AdminHero>

      {error && !data ? <ErrorState error={error} onRetry={reload} /> : <Body data={data} onChanged={reload} />}
    </div>
  );
}

type Perf = { items: { id: string; name: string; avatarUrl: string | null; avatarSeed: string | null; avatarBg: string | null; students: number; completionRate: number; rating: number }[] };

function Body({ data, onChanged }: { data?: Dashboard; onChanged: () => void }) {
  const s = data?.stats;
  // Hiệu suất tính từ ghi danh / tiến độ / đánh giá thật (fallback về số liệu hồ sơ giáo viên).
  const { data: perf } = useApi<Perf>("/admin/teachers/performance?limit=5&by=students");
  const teachers =
    perf?.items.map((t) => ({ ...t, completion: t.completionRate })) ?? data?.teacherPerformance;
  return (
    <>
      {/* Thẻ số liệu */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[1360px]:grid-cols-6">
        {!s ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-2xl" />)
        ) : (
          <>
            <StatCard index={0} href="/admin/hoc-vien" icon={<Users className="size-5" />} label="Tổng học viên" value={s.students.value.toLocaleString("vi-VN")} delta={s.students.delta} spark={s.students.spark} sub={`+${Number(s.students.newThisMonth).toLocaleString("vi-VN")} so với tháng trước`} />
            <StatCard index={1} tone="green" icon={<UserCheck className="size-5" />} label="Học viên đang hoạt động" value={s.active.value.toLocaleString("vi-VN")} delta={Math.min(s.active.delta, 999)} spark={s.active.spark} sub={`Chiếm ${s.active.share}% tổng học viên`} />
            <StatCard index={2} href="/admin/giao-vien" icon={<GraduationCap className="size-5" />} label="Giáo viên" value={s.teachers.value} delta={s.teachers.delta} spark={s.teachers.spark} sub={`+${s.teachers.newThisMonth} giáo viên mới`} />
            <StatCard index={3} tone="violet" href="/admin/khoa-hoc" icon={<BookOpen className="size-5" />} label="Khóa học đang mở" value={s.courses.value} delta={s.courses.delta} spark={s.courses.spark} sub={`${s.courses.drafts} khóa đang biên soạn`} />
            <StatCard index={4} tone="amber" href="/admin/doanh-thu" icon={<CircleDollarSign className="size-5" />} label="Doanh thu tháng này" value={vndShort(s.revenue.value)} delta={s.revenue.delta} spark={s.revenue.spark} sub={`${Number(s.revenue.diff) >= 0 ? "+" : "−"}${vndShort(Math.abs(Number(s.revenue.diff)))} so với tháng trước`} />
            <StatCard index={5} tone="green" icon={<CircleCheck className="size-5" />} label="Tỉ lệ hoàn thành bài học" value={`${s.completion.value}%`} delta={s.completion.delta} spark={s.completion.spark} sub={`${s.completion.delta >= 0 ? "+" : ""}${s.completion.delta}% so với tháng trước`} />
          </>
        )}
      </div>

      {/* Biểu đồ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr_0.9fr]">
        <Panel
          title="Doanh thu 12 tháng"
          icon={<BarIcon />}
          action={<RangeSelect />}
          className="min-w-0"
        >
          {!data ? (
            <Skeleton className="h-64" />
          ) : (
            <>
              <ChartTotal label="Tổng doanh thu" value={vndShort(data.revenue.total)} growth={data.revenue.growth} />
              <BarChart
                data={data.revenue.series.map((d) => ({ label: d.label, value: d.value, line: d.value }))}
                format={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(1).replace(".", ",")} tỷ` : `${Math.round(v / 1e6)}tr`)}
                legend={{ bar: "Doanh thu", line: "Tăng trưởng" }}
                tooltip={(d, i) => (
                  <>
                    <p className="text-muted">Tháng {d.label.replace("Th", "")}</p>
                    <p className="font-bold text-brand-600">{vndShort(d.value)}</p>
                    <GrowthTag v={data.revenue.series[i].growth} />
                  </>
                )}
              />
            </>
          )}
        </Panel>

        <Panel title="Học viên đăng ký mới" icon={<Users className="size-4" />} action={<RangeSelect />} className="min-w-0">
          {!data ? (
            <Skeleton className="h-64" />
          ) : (
            <>
              <ChartTotal label="Tổng đăng ký mới" value={data.registrations.total.toLocaleString("vi-VN")} growth={data.registrations.growth} />
              <BarChart
                data={data.registrations.series.map((d) => ({ label: d.label, value: d.value }))}
                format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(Math.round(v)))}
                legend={{ bar: "Học viên mới" }}
                tooltip={(d, i) => (
                  <>
                    <p className="text-muted">Tháng {d.label.replace("Th", "")}</p>
                    <p className="font-bold text-brand-600">{d.value.toLocaleString("vi-VN")}</p>
                    <GrowthTag v={data.registrations.series[i].growth} />
                  </>
                )}
              />
            </>
          )}
        </Panel>

        <Panel title="Phân bổ doanh thu" icon={<CircleDollarSign className="size-4" />} action={<Badge tone="gray">Tháng này</Badge>} className="min-w-0">
          {!data ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
              <Donut
                size={190}
                thickness={34}
                data={data.breakdown.items.map((b, i) => ({ ...b, color: DONUT_COLORS[i] }))}
                center={
                  <div>
                    <p className="text-xl font-extrabold">{vndShort(data.breakdown.total)}</p>
                    <p className="text-[11px] text-muted">Tổng doanh thu</p>
                  </div>
                }
              />
              <ul className="w-full flex-1 space-y-3">
                {data.breakdown.items.map((b, i) => (
                  <li key={b.label} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    <span className="flex-1">
                      <span className="block text-muted">{b.label}</span>
                      <span className="font-bold">{vndShort(b.value)}</span>
                    </span>
                    <span className="font-semibold text-muted">{data.breakdown.total ? Math.round((b.value / data.breakdown.total) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Danh sách */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr_0.9fr]">
        <Panel title="Đăng ký gần đây" icon={<CalendarDays className="size-4" />} action={<SeeAll href="/admin/don-hang" />} className="min-w-0" bodyClassName="px-2 sm:px-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-ink/[.02] text-left text-xs text-muted">
                  {["Học viên", "Gói học", "Trạng thái", "Thanh toán", "Ngày đăng ký"].map((h) => (
                    <th key={h} className="px-2 py-2 font-semibold first:rounded-l-lg last:rounded-r-lg">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!data
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-2 py-2.5">
                          <Skeleton className="h-6" />
                        </td>
                      </tr>
                    ))
                  : data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-b border-ink/5 last:border-0 hover:bg-brand-50/40">
                        <td className="px-2 py-2.5">
                          <Link href={`/admin/hoc-vien/${o.userId}`} className="flex items-center gap-2 font-medium hover:text-brand-500">
                            <Avatar src={o.avatarUrl} name={o.userName} size={30} />
                            <span className="truncate">{o.userName}</span>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-ink/80">{o.itemName}</td>
                        <td className="px-2 py-2.5">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-2 py-2.5 font-semibold">{o.status === "pending" ? "—" : vnd(o.amount - o.discount)}</td>
                        <td className="px-2 py-2.5 text-xs text-muted">{fmtDate(o.createdAt, true)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {data && !data.recentOrders.length && <p className="py-8 text-center text-sm text-muted">Chưa có đơn hàng</p>}
          </div>
        </Panel>

        <Panel title="Khóa học nổi bật" icon={<BookOpen className="size-4" />} action={<SeeAll href="/admin/khoa-hoc" />} className="min-w-0">
          <ul className="space-y-2.5">
            {!data
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
              : data.featuredCourses.map((c, i) => (
                  <motion.li key={c.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <Link href={`/admin/khoa-hoc/${c.id}`} className="group flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-brand-50/50">
                      <CourseThumb level={c.level} cover={c.coverUrl} teacherSeed={c.teacherSeed ?? c.teacherName} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold group-hover:text-brand-600">{c.title}</span>
                        <span className="block truncate text-xs text-muted">{c.teacherName ?? "—"}</span>
                      </span>
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {c.rating.toFixed(1)}
                      </span>
                      <span className="hidden w-16 items-center justify-end gap-1 text-xs text-muted sm:flex">
                        <Users className="size-3.5" />
                        {compact(Math.max(c.studentCount, c.enrolled))}
                      </span>
                    </Link>
                  </motion.li>
                ))}
            {data && !data.featuredCourses.length && <p className="py-8 text-center text-sm text-muted">Chưa có khóa học xuất bản</p>}
          </ul>
        </Panel>

        <Panel title="Cần xử lý hôm nay" icon={<AlertTriangle className="size-4" />} action={<SeeAll href="/admin/danh-gia" />} className="min-w-0">
          <div id="can-xu-ly" className="space-y-2">
            {!data ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)
            ) : (
              <>
                <TodoRow href="/admin/danh-gia" icon={<MessageSquareText className="size-4" />} tone="bg-amber-100 text-amber-600" n={data.todo.reviews} label="đánh giá chờ duyệt" />
                <TodoRow href="/admin/danh-gia?tab=reports" icon={<AlertTriangle className="size-4" />} tone="bg-red-100 text-red-600" n={data.todo.reports} label="báo lỗi nội dung" />
                <TodoRow href="/admin/don-hang?status=refund_requested" icon={<RotateCcw className="size-4" />} tone="bg-pink-100 text-pink-600" n={data.todo.refunds} label="yêu cầu hoàn tiền" />
                <TodoRow href="/admin/blog?status=review" icon={<FileText className="size-4" />} tone="bg-orange-100 text-orange-600" n={data.todo.posts} label="bài blog chờ xuất bản" />
                <TodoRow href="/admin/ho-tro" icon={<Headphones className="size-4" />} tone="bg-sky-100 text-sky-600" n={data.todo.tickets} label="ticket hỗ trợ mới" />
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* Hàng cuối */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <TasksPanel tasks={data?.tasks} onChanged={onChanged} />

        <Panel title="Hiệu suất giáo viên" icon={<Users className="size-4" />} action={<SeeAll href="/admin/giao-vien" />} className="min-w-0" bodyClassName="px-2 sm:px-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="bg-ink/[.02] text-left text-xs text-muted">
                  {["#", "Giáo viên", "Số học viên", "Tỉ lệ hoàn thành", "Đánh giá"].map((h) => (
                    <th key={h} className="px-2 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(teachers ?? []).map((t, i) => (
                  <tr key={t.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-2 py-2 text-muted">{i + 1}</td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2 font-medium">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.avatarUrl || avatar(t.avatarSeed ?? t.name, t.avatarBg ?? "ffe3e3")} alt="" className="size-7 rounded-full" />
                        <span className="truncate">{t.name.replace(/^(Cô|Thầy) /, "")}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2">{t.students.toLocaleString("vi-VN")}</td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2">
                        <span className="w-8 text-xs">{t.completion}%</span>
                        <ProgressBar value={t.completion} tone={t.completion >= 85 ? "green" : "amber"} className="w-16" />
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {t.rating.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!teachers && <Skeleton className="h-40" />}
          </div>
        </Panel>

        <Panel
          title="Tình trạng hệ thống"
          icon={<Server className="size-4" />}
          action={
            data && (
              <Badge tone={data.services.every((x) => x.status === "ok") ? "green" : "amber"} dot>
                {data.services.every((x) => x.status === "ok") ? "Tất cả hoạt động tốt" : "Có dịch vụ cần chú ý"}
              </Badge>
            )
          }
          className="min-w-0"
        >
          <ul className="divide-y divide-ink/5">
            {(data?.services ?? []).map((sv) => (
              <li key={sv.key} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">{SERVICE_ICON[sv.key] ?? <Server className="size-4" />}</span>
                <span className="flex-1 font-medium">{sv.name}</span>
                <span className="hidden text-xs text-muted sm:block">{sv.uptime}% uptime</span>
                <Badge tone={sv.status === "ok" ? "green" : sv.status === "degraded" ? "amber" : "red"} dot>
                  {sv.status === "ok" ? "Hoạt động tốt" : sv.status === "degraded" ? "Chậm" : "Gián đoạn"}
                </Badge>
              </li>
            ))}
            {!data && <Skeleton className="h-40" />}
          </ul>
        </Panel>
      </div>
    </>
  );
}

const SERVICE_ICON: Record<string, React.ReactNode> = {
  api: <Server className="size-4" />,
  payment: <CreditCard className="size-4" />,
  email: <Mail className="size-4" />,
  cdn: <Cloud className="size-4" />,
  mobile: <Smartphone className="size-4" />,
};

/* ------------------------------------------------------------------ */

function TasksPanel({ tasks, onChanged }: { tasks?: Dashboard["tasks"]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const today = new Date(now).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const toggle = async (id: string, done: boolean) => {
    try {
      await api(`/admin/dashboard/tasks/${id}`, { method: "PATCH", body: { done } });
      onChanged();
    } catch (e) {
      toast.error(e);
    }
  };
  const DOT: Record<string, string> = { red: "bg-red-500", blue: "bg-sky-500", amber: "bg-amber-400", violet: "bg-violet-500", green: "bg-emerald-500", orange: "bg-orange-400" };
  return (
    <Panel
      title="Lịch & nhắc việc hôm nay"
      subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      icon={<CalendarDays className="size-4" />}
      action={
        <Button size="sm" variant="soft" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>
          Thêm việc
        </Button>
      }
      className="min-w-0"
    >
      <ul className="space-y-1">
        {!tasks
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11" />)
          : tasks.map((t) => {
              const time = new Date(t.dueAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
              const late = !t.done && new Date(t.dueAt).getTime() < now;
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-ink/[.02]">
                  <Checkbox checked={t.done} onChange={(v) => toggle(t.id, v)} />
                  <span className="w-11 text-xs font-semibold text-muted">{time}</span>
                  <span className={cx("h-8 w-1 rounded-full", DOT[t.color] ?? "bg-brand-500")} />
                  <span className="min-w-0 flex-1">
                    <span className={cx("block truncate text-sm font-semibold", t.done && "text-muted line-through")}>{t.title}</span>
                    {t.note && <span className="block truncate text-[11px] text-muted">{t.note}</span>}
                  </span>
                  <Badge tone={t.done ? "green" : late || t.state === "in_progress" ? "pink" : "gray"}>{t.done ? "Đã xong" : t.state === "in_progress" || late ? "Đang xử lý" : "Sắp tới"}</Badge>
                </li>
              );
            })}
        {tasks && !tasks.length && <p className="py-8 text-center text-sm text-muted">Không có việc nào hôm nay 🌸</p>}
      </ul>
      <NewTaskModal open={open} onClose={() => setOpen(false)} onCreated={onChanged} />
    </Panel>
  );
}

function NewTaskModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState("09:00");
  const [color, setColor] = useState("red");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const [h, m] = time.split(":").map(Number);
    const due = new Date();
    due.setHours(h, m, 0, 0);
    setSaving(true);
    try {
      await api("/admin/tasks", { body: { title, note: note || null, dueAt: due.toISOString(), color } });
      toast.success("Đã thêm việc");
      invalidate("/admin/tasks");
      onCreated();
      onClose();
      setTitle("");
      setNote("");
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm việc hôm nay"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button loading={saving} disabled={!title.trim()} onClick={save}>
            Thêm
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Tiêu đề" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Họp team nội dung" autoFocus />
        </Field>
        <Field label="Ghi chú">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Giờ">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Màu">
            <Select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              options={[
                { value: "red", label: "Đỏ" },
                { value: "blue", label: "Xanh dương" },
                { value: "amber", label: "Vàng" },
                { value: "violet", label: "Tím" },
                { value: "green", label: "Xanh lá" },
              ]}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function ChartTotal({ label, value, growth }: { label: string; value: string; growth: number }) {
  return (
    <div className="mb-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-extrabold">{value}</span>
        <GrowthTag v={growth} />
        <span className="text-xs text-muted">so với 12 tháng trước</span>
      </div>
    </div>
  );
}

function GrowthTag({ v }: { v: number }) {
  return (
    <span className={cx("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold", v >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
      <ArrowUp className={cx("size-3", v < 0 && "rotate-180")} />
      {Math.abs(v)}%
    </span>
  );
}

function RangeSelect() {
  return <Badge tone="gray">12 tháng qua</Badge>;
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-500">
      Xem tất cả <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function TodoRow({ href, icon, tone, n, label }: { href: string; icon: React.ReactNode; tone: string; n: number; label: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl bg-brand-50/50 px-3 py-2.5 transition hover:bg-brand-50">
      <span className={cx("grid size-8 place-items-center rounded-lg", tone)}>{icon}</span>
      <span className="w-8 text-lg font-extrabold text-brand-600">{n}</span>
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="size-4 text-brand-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

const LEVEL_GRAD: Record<string, string> = {
  N5: "from-rose-400 to-pink-300",
  N4: "from-amber-400 to-orange-300",
  N3: "from-emerald-500 to-teal-300",
  N2: "from-sky-500 to-indigo-300",
  N1: "from-violet-500 to-fuchsia-300",
};

function CourseThumb({ level, cover, teacherSeed }: { level: string | null; cover: string | null; teacherSeed: string | null }) {
  if (cover)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />;
  return (
    <span className={cx("relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br", LEVEL_GRAD[level ?? ""] ?? "from-brand-400 to-brand-200")}>
      <span className="absolute left-1.5 top-1 text-sm font-extrabold text-white drop-shadow">{level ?? <Crown className="size-4" />}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {teacherSeed && <img src={avatar(teacherSeed, "transparent")} alt="" className="absolute -bottom-1 right-0 h-11" />}
    </span>
  );
}

function BarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

export { Card };
