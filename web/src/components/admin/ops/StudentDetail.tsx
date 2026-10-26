"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, BookOpen, CalendarDays, ClipboardList, Clock, Flame, KeyRound, Mail, Megaphone, Pencil, Phone, Receipt, Sparkles, Trash2, UserCheck } from "lucide-react";
import { api, fmtDate, num, timeAgo, vnd } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, Level, Modal, Panel, Skeleton, StatusBadge, Tabs, toast, useConfirm } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/table";
import { BarChart, ProgressBar } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/page";
import { StudentFormDrawer } from "./StudentsPage";

type Detail = {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    level: string | null;
    targetLevel: string | null;
    targetDate: string | null;
    streak: number;
    xp: number;
    bio: string | null;
    lastActiveAt: string | null;
    createdAt: string;
  };
  stats: { enrollments: number; totalPaid: number; studyMinutes30: number; attempts: { total: number; graded: number; avg: number | null; best: number | null } };
  enrollments: { courseId: string; title: string; slug: string; level: string | null; status: string; enrolledAt: string; total: number; done: number; percent: number; lastAt: string | null }[];
  orders: { id: string; code: string; itemName: string; amount: number; discount: number; paymentMethod: string; status: string; createdAt: string; paidAt: string | null }[];
  attempts: { id: string; quizTitle: string; quizSlug: string; kind: string; level: string; score: number | null; maxScore: number | null; status: string; durationSec: number | null; startedAt: string; submittedAt: string | null }[];
  study: { day: string; minutes: number }[];
  activity: { type: string; title: string; at: string; meta?: string }[];
};

type TabKey = "courses" | "orders" | "attempts" | "activity";
const PAY: Record<string, string> = { vnpay: "VNPAY", momo: "MoMo", bank: "Chuyển khoản", card: "Thẻ" };
const ACT_ICON: Record<string, React.ReactNode> = {
  lesson: <BookOpen className="size-3.5" />,
  attempt: <ClipboardList className="size-3.5" />,
  order: <Receipt className="size-3.5" />,
  log: <Sparkles className="size-3.5" />,
};

export default function StudentDetail({ id }: { id: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const writable = can("students.write");
  const confirm = useConfirm();
  const { data, error, reload } = useApi<Detail>(`/admin/students/${id}`, { dedupeMs: 0 });
  const [tab, setTab] = useState<TabKey>("courses");
  const [editing, setEditing] = useState(false);
  const [resetPw, setResetPw] = useState<{ open: boolean; value: string; result?: string; busy?: boolean }>({ open: false, value: "" });

  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data)
    return (
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );

  const p = data.profile;
  const blocked = p.status === "blocked";

  const setStatus = async () => {
    const ok = await confirm({
      title: blocked ? `Mở khoá tài khoản ${p.name}?` : `Khoá tài khoản ${p.name}?`,
      message: blocked ? undefined : "Học viên sẽ không thể đăng nhập cho đến khi được mở khoá.",
      danger: !blocked,
      confirmText: blocked ? "Mở khoá" : "Khoá",
    });
    if (!ok) return;
    try {
      await api(`/admin/students/${id}`, { method: "PATCH", body: { status: blocked ? "active" : "blocked" } });
      toast.success(blocked ? "Đã mở khoá" : "Đã khoá tài khoản");
      reload();
      invalidate("/admin/students");
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: `Xoá học viên ${p.name}?`, message: "Toàn bộ dữ liệu học tập và đơn hàng sẽ bị xoá vĩnh viễn.", danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/students/${id}`, { method: "DELETE" });
      toast.success("Đã xoá học viên");
      invalidate("/admin/students");
      router.push("/admin/hoc-vien");
    } catch (e) {
      toast.error(e);
    }
  };

  const doReset = async () => {
    setResetPw((s) => ({ ...s, busy: true }));
    try {
      const r = await api<{ password: string }>(`/admin/students/${id}/reset-password`, { body: resetPw.value ? { password: resetPw.value } : {} });
      setResetPw((s) => ({ ...s, busy: false, result: r.password }));
    } catch (e) {
      toast.error(e);
      setResetPw((s) => ({ ...s, busy: false }));
    }
  };

  const orderCols: Column<Detail["orders"][number]>[] = [
    { key: "code", header: "Mã đơn", cell: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span> },
    { key: "itemName", header: "Sản phẩm" },
    { key: "amount", header: "Thanh toán", cell: (r) => vnd(r.amount - r.discount) },
    { key: "paymentMethod", header: "Phương thức", hideOnMobile: true, cell: (r) => PAY[r.paymentMethod] ?? r.paymentMethod },
    { key: "status", header: "Trạng thái", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", header: "Ngày tạo", cell: (r) => <span className="text-xs">{fmtDate(r.createdAt, true)}</span> },
  ];
  const attemptCols: Column<Detail["attempts"][number]>[] = [
    {
      key: "quizTitle",
      header: "Bài làm",
      cell: (r) => (
        <div>
          <p className="font-semibold">{r.quizTitle}</p>
          <p className="text-xs text-muted">{r.kind === "jlpt" ? "Đề thi JLPT" : "Bài tập"}</p>
        </div>
      ),
    },
    { key: "level", header: "Cấp", cell: (r) => <Level level={r.level} /> },
    {
      key: "score",
      header: "Điểm",
      cell: (r) =>
        r.maxScore ? (
          <span className="font-semibold">
            {Math.round(((r.score ?? 0) / r.maxScore) * 100)}% <span className="text-xs font-normal text-muted">({r.score}/{r.maxScore})</span>
          </span>
        ) : (
          "—"
        ),
    },
    { key: "durationSec", header: "Thời gian", hideOnMobile: true, cell: (r) => (r.durationSec ? `${Math.round(r.durationSec / 60)} phút` : "—") },
    { key: "status", header: "Trạng thái", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "startedAt", header: "Ngày làm", cell: (r) => <span className="text-xs">{fmtDate(r.submittedAt ?? r.startedAt, true)}</span> },
  ];

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle="Hồ sơ và hoạt động học tập"
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Học viên", href: "/admin/hoc-vien" }, { label: p.name }]}
        actions={
          writable && (
            <>
              <Link href={`/admin/thong-bao?new=1&userId=${p.id}&userName=${encodeURIComponent(p.name)}`}>
                <Button variant="outline" icon={<Megaphone className="size-4" />}>
                  Gửi thông báo
                </Button>
              </Link>
              <Button variant="outline" icon={<KeyRound className="size-4" />} onClick={() => setResetPw({ open: true, value: "" })}>
                Đặt lại mật khẩu
              </Button>
              <Button variant={blocked ? "primary" : "danger"} icon={blocked ? <UserCheck className="size-4" /> : <Ban className="size-4" />} onClick={setStatus}>
                {blocked ? "Mở khoá" : "Khoá tài khoản"}
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="p-5 text-center">
            <div className="mx-auto w-fit rounded-full bg-gradient-to-br from-brand-200 via-brand-100 to-white p-1">
              <Avatar src={p.avatarUrl} name={p.name} size={88} />
            </div>
            <p className="mt-3 text-lg font-bold">{p.name}</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <StatusBadge status={p.status} />
              <Level level={p.level} />
              {p.targetLevel && <Badge tone="violet">Mục tiêu {p.targetLevel}</Badge>}
            </div>
            <div className="mt-4 space-y-2 text-left text-sm">
              <p className="flex items-center gap-2 text-ink/80">
                <Mail className="size-4 text-muted" /> <span className="truncate">{p.email}</span>
              </p>
              <p className="flex items-center gap-2 text-ink/80">
                <Phone className="size-4 text-muted" /> {p.phone ?? "—"}
              </p>
              <p className="flex items-center gap-2 text-ink/80">
                <CalendarDays className="size-4 text-muted" /> Tham gia {fmtDate(p.createdAt)}
              </p>
              <p className="flex items-center gap-2 text-ink/80">
                <Clock className="size-4 text-muted" /> Hoạt động {timeAgo(p.lastActiveAt)}
              </p>
              {p.targetDate && (
                <p className="flex items-center gap-2 text-ink/80">
                  <Sparkles className="size-4 text-muted" /> Thi {p.targetLevel ?? ""} dự kiến {p.targetDate}
                </p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-orange-50 p-2.5">
                <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-orange-500">
                  <Flame className="size-4" /> {p.streak}
                </p>
                <p className="text-[11px] text-muted">ngày liên tiếp</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5">
                <p className="text-lg font-extrabold text-amber-600">{num(p.xp)}</p>
                <p className="text-[11px] text-muted">XP</p>
              </div>
            </div>
            {writable && (
              <div className="mt-4 flex gap-2">
                <Button variant="soft" className="flex-1" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                  Sửa hồ sơ
                </Button>
                <Button variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} onClick={remove}>
                  Xoá
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { l: "Khóa học", v: num(data.stats.enrollments) },
              { l: "Đã thanh toán", v: vnd(data.stats.totalPaid) },
              { l: "Học 30 ngày", v: `${Math.round(data.stats.studyMinutes30 / 6) / 10} giờ` },
              { l: "Điểm TB bài làm", v: data.stats.attempts.avg !== null ? `${data.stats.attempts.avg}%` : "—" },
            ].map((x) => (
              <Card key={x.l} className="p-4">
                <p className="text-xs text-muted">{x.l}</p>
                <p className="mt-1 text-xl font-extrabold">{x.v}</p>
              </Card>
            ))}
          </div>

          <Panel title="Thời gian học 30 ngày qua" subtitle={`${num(data.stats.studyMinutes30)} phút`} icon={<Clock className="size-4" />}>
            <BarChart
              data={data.study.map((d) => ({ label: d.day.slice(8, 10), value: d.minutes }))}
              height={160}
              format={(v) => `${Math.round(v)}′`}
              tooltip={(d, i) => (
                <>
                  <p className="text-[10px] text-muted">{fmtDate(data.study[i].day)}</p>
                  <p className="font-bold">{d.value} phút</p>
                </>
              )}
            />
          </Panel>

          <Card className="p-4">
            <Tabs<TabKey>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "courses", label: "Khóa học", count: data.enrollments.length },
                { value: "orders", label: "Đơn hàng", count: data.orders.length },
                { value: "attempts", label: "Bài làm", count: data.stats.attempts.total },
                { value: "activity", label: "Hoạt động" },
              ]}
              className="mb-4 w-fit max-w-full"
            />
            {tab === "courses" &&
              (data.enrollments.length ? (
                <ul className="divide-y divide-ink/5">
                  {data.enrollments.map((e) => (
                    <li key={e.courseId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-semibold">
                          <Level level={e.level} /> <span className="truncate">{e.title}</span>
                        </p>
                        <p className="text-xs text-muted">
                          Ghi danh {fmtDate(e.enrolledAt)} · {e.lastAt ? `học gần nhất ${timeAgo(e.lastAt)}` : "chưa bắt đầu"}
                        </p>
                      </div>
                      <div className="flex w-full items-center gap-2 sm:w-56">
                        <ProgressBar value={e.percent} tone={e.percent >= 100 ? "green" : e.percent > 30 ? "brand" : "amber"} className="flex-1" />
                        <span className="w-24 text-right text-xs">
                          <b>{e.percent}%</b> · {e.done}/{e.total}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Chưa ghi danh khóa học nào" />
              ))}
            {tab === "orders" && <DataTable rows={data.orders} columns={orderCols} rowKey={(r) => r.id} empty={<EmptyState title="Chưa có đơn hàng" />} />}
            {tab === "attempts" && (
              <>
                <p className="mb-3 text-xs text-muted">
                  {data.stats.attempts.total} lượt làm · {data.stats.attempts.graded} đã nộp · cao nhất {data.stats.attempts.best ?? "—"}%
                </p>
                <DataTable rows={data.attempts} columns={attemptCols} rowKey={(r) => r.id} empty={<EmptyState title="Chưa có bài làm" />} />
              </>
            )}
            {tab === "activity" &&
              (data.activity.length ? (
                <ol className="relative ml-2 space-y-4 border-l border-ink/10 pl-5">
                  {data.activity.map((a, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[31px] grid size-6 place-items-center rounded-full bg-brand-50 text-brand-500 ring-4 ring-white">{ACT_ICON[a.type]}</span>
                      <p className="text-sm">{a.title}</p>
                      <p className="text-xs text-muted">
                        {fmtDate(a.at, true)}
                        {a.meta && ` · ${a.type === "order" ? (a.meta in PAY ? PAY[a.meta] : a.meta) : a.meta}`}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="Chưa có hoạt động" />
              ))}
          </Card>
        </div>
      </div>

      <StudentFormDrawer
        open={editing}
        id={p.id}
        initial={{ name: p.name, email: p.email, phone: p.phone ?? "", level: p.level ?? "", targetLevel: p.targetLevel ?? "", targetDate: p.targetDate ?? "", status: p.status }}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          reload();
        }}
      />

      <Modal
        open={resetPw.open}
        onClose={() => setResetPw({ open: false, value: "" })}
        size="sm"
        title="Đặt lại mật khẩu"
        description={p.email}
        footer={
          resetPw.result ? (
            <Button onClick={() => setResetPw({ open: false, value: "" })}>Xong</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResetPw({ open: false, value: "" })}>
                Huỷ
              </Button>
              <Button loading={resetPw.busy} onClick={doReset}>
                Đặt lại
              </Button>
            </>
          )
        }
      >
        {resetPw.result ? (
          <div className="space-y-2">
            <p className="text-sm">Mật khẩu mới (chỉ hiển thị một lần):</p>
            <div className="flex gap-2">
              <Input readOnly value={resetPw.result} className="font-mono" />
              <Button
                variant="soft"
                onClick={() => {
                  navigator.clipboard?.writeText(resetPw.result ?? "");
                  toast.success("Đã sao chép");
                }}
              >
                Sao chép
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">Nhập mật khẩu mới hoặc để trống để hệ thống tạo ngẫu nhiên.</p>
            <Input value={resetPw.value} onChange={(e) => setResetPw((s) => ({ ...s, value: e.target.value }))} placeholder="Để trống = tự tạo" />
          </div>
        )}
      </Modal>
    </>
  );
}
