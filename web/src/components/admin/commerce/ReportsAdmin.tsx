"use client";

import { useState } from "react";
import { Activity, BookOpen, CheckCircle2, Clock, Download, FileSpreadsheet, GraduationCap, Repeat, ShoppingBag, Target, UserPlus, Wallet } from "lucide-react";
import { Button, Card, Dropdown, ErrorState, Level, Panel, Skeleton, cx } from "@/components/admin/ui";
import { BarChart, ProgressBar } from "@/components/admin/charts";
import { DataTable } from "@/components/admin/table";
import { PageHeader, StatCard } from "@/components/admin/page";
import { num, qs, vndShort } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { RangePicker, downloadCsv, pctFmt, rangeQuery, type RangeValue } from "./shared";

type Kpis = {
  newStudents: number;
  activeLearners: number;
  completionRate: number;
  lessonsCompleted: number;
  revenue: number;
  orders: number;
  enrollments: number;
  attempts: number;
  quizPassRate: number;
  avgScore: number;
  studyHours: number;
};
type ReportData = {
  range: { label: string; unit: "day" | "month" };
  kpis: Kpis;
  previous: Kpis;
  growth: Record<keyof Kpis, number>;
  topCourses: { id: string; title: string; level: string | null; teacher: string | null; enrolled: number; total: number; revenue: number; completion: number }[];
  quizzes: { id: string; title: string; level: string; kind: string; attempts: number; pass_rate: number; avg_score: number }[];
  cohorts: { cohort: string; label: string; size: number; values: number[]; counts: (number | null)[] }[];
  series: { key: string; label: string; full: string; active: number; registrations: number }[];
};

const EXPORTS = [
  { key: "kpis", label: "Chỉ số tổng hợp (KPI)" },
  { key: "activity", label: "Hoạt động & đăng ký theo thời gian" },
  { key: "courses", label: "Khóa học theo ghi danh" },
  { key: "quizzes", label: "Bài tập & đề thi" },
  { key: "cohorts", label: "Giữ chân theo cohort" },
];

/** Màu ô heatmap theo % giữ chân. */
const heat = (v: number) => {
  if (v >= 80) return "bg-brand-500 text-white";
  if (v >= 60) return "bg-brand-400 text-white";
  if (v >= 40) return "bg-brand-300 text-white";
  if (v >= 25) return "bg-brand-200 text-brand-700";
  if (v >= 10) return "bg-brand-100 text-brand-700";
  return "bg-brand-50 text-brand-600";
};

export default function ReportsAdmin() {
  const [range, setRange] = useState<RangeValue>({ range: "30d" });
  const ready = range.range !== "custom" || (!!range.from && !!range.to);
  const q = rangeQuery(range);
  const { data, loading, error, reload } = useApi<ReportData>(ready ? `/admin/reports/summary${qs(q)}` : null);
  const d = data;
  const k = d?.kpis;
  const g = d?.growth;
  const exp = (key: string) => downloadCsv(`/admin/reports/export/${key}.csv`, q);
  const exportBtn = (key: string) => (
    <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => exp(key)}>
      CSV
    </Button>
  );

  const cards: { key: keyof Kpis; label: string; icon: React.ReactNode; tone: "red" | "green" | "violet" | "amber" | "blue" | "pink"; fmt: (v: number) => string; sub?: string }[] = [
    { key: "newStudents", label: "Học viên mới", icon: <UserPlus className="size-5" />, tone: "red", fmt: num },
    { key: "activeLearners", label: "Học viên hoạt động", icon: <Activity className="size-5" />, tone: "green", fmt: num, sub: "Có phiên học, làm bài hoặc truy cập" },
    { key: "completionRate", label: "Tỉ lệ hoàn thành bài học", icon: <CheckCircle2 className="size-5" />, tone: "violet", fmt: pctFmt, sub: k ? `${num(k.lessonsCompleted)} bài hoàn thành` : undefined },
    { key: "quizPassRate", label: "Tỉ lệ đạt bài tập", icon: <Target className="size-5" />, tone: "amber", fmt: pctFmt, sub: k ? `${num(k.attempts)} lượt · điểm TB ${pctFmt(k.avgScore)}` : undefined },
    { key: "revenue", label: "Doanh thu", icon: <Wallet className="size-5" />, tone: "pink", fmt: vndShort },
    { key: "orders", label: "Đơn đã thanh toán", icon: <ShoppingBag className="size-5" />, tone: "blue", fmt: num },
    { key: "enrollments", label: "Lượt ghi danh", icon: <GraduationCap className="size-5" />, tone: "green", fmt: num },
    { key: "studyHours", label: "Tổng giờ học", icon: <Clock className="size-5" />, tone: "violet", fmt: num },
  ];

  return (
    <div>
      <PageHeader
        title="Báo cáo"
        subtitle="Tổng hợp chỉ số học tập, kinh doanh và giữ chân học viên toàn nền tảng."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Báo cáo" }]}
        actions={
          <Dropdown
            trigger={
              <Button variant="outline" icon={<FileSpreadsheet className="size-4" />}>
                Xuất CSV
              </Button>
            }
            items={EXPORTS.map((e) => ({ label: e.label, icon: <Download className="size-4 text-muted" />, onClick: () => exp(e.key) }))}
          />
        }
      />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
        <RangePicker value={range} onChange={setRange} />
        {d && <span className="text-xs text-muted">{d.range.label} · so với kỳ trước cùng độ dài</span>}
      </Card>

      {error && !d ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {cards.map((c, i) => (
              <StatCard
                key={c.key}
                index={i}
                icon={c.icon}
                tone={c.tone}
                label={c.label}
                value={k ? c.fmt(k[c.key]) : "…"}
                delta={g ? Math.round(g[c.key]) : undefined}
                sub={c.sub ?? (d ? `Kỳ trước: ${c.fmt(d.previous[c.key])}` : undefined)}
              />
            ))}
          </div>

          <Panel
            className="mb-5"
            title="Hoạt động học viên"
            icon={<Activity className="size-4" />}
            subtitle="Học viên hoạt động (cột) và đăng ký mới (đường)"
            action={exportBtn("activity")}
          >
            {loading && !d ? (
              <Skeleton className="h-[240px]" />
            ) : (
              <BarChart
                data={(d?.series ?? []).map((s) => ({ label: s.label, value: s.active, line: s.registrations }))}
                height={240}
                format={(v) => num(Math.round(v))}
                legend={{ bar: "Học viên hoạt động", line: "Đăng ký mới" }}
                tooltip={(_, i) => {
                  const s = d!.series[i];
                  return (
                    <>
                      <p className="text-muted">{s.full}</p>
                      <p className="font-bold text-brand-600">{num(s.active)} hoạt động</p>
                      <p className="text-muted">{num(s.registrations)} đăng ký mới</p>
                    </>
                  );
                }}
              />
            )}
          </Panel>

          <div className="mb-5 grid gap-5 xl:grid-cols-2">
            <Panel title="Khóa học theo lượt ghi danh" icon={<BookOpen className="size-4" />} action={exportBtn("courses")}>
              <DataTable
                rows={d?.topCourses ?? []}
                loading={loading}
                compact
                rowKey={(r) => r.id}
                columns={[
                  { key: "rank", header: "#", cell: (_, i) => <span className="font-bold text-muted">{i + 1}</span> },
                  {
                    key: "title",
                    header: "Khóa học",
                    cell: (r) => (
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium">
                          <Level level={r.level} /> <span className="truncate">{r.title}</span>
                        </p>
                        {r.teacher && <p className="text-[11px] text-muted">{r.teacher}</p>}
                      </div>
                    ),
                  },
                  { key: "enrolled", header: "Trong kỳ", cell: (r) => <b>{num(r.enrolled)}</b> },
                  { key: "total", header: "Tổng", hideOnMobile: true, cell: (r) => num(r.total) },
                  {
                    key: "completion",
                    header: "Hoàn thành",
                    cell: (r) => (
                      <div className="flex items-center gap-2">
                        <ProgressBar value={r.completion} tone={r.completion >= 70 ? "green" : r.completion >= 40 ? "amber" : "red"} className="w-16" />
                        <span className="text-xs">{r.completion}%</span>
                      </div>
                    ),
                  },
                ]}
                empty={<p className="py-8 text-center text-sm text-muted">Chưa có dữ liệu khóa học.</p>}
              />
            </Panel>

            <Panel title="Bài tập & đề thi được làm nhiều" icon={<Target className="size-4" />} action={exportBtn("quizzes")}>
              <DataTable
                rows={d?.quizzes ?? []}
                loading={loading}
                compact
                rowKey={(r) => r.id}
                columns={[
                  {
                    key: "title",
                    header: "Bài tập / đề thi",
                    cell: (r) => (
                      <p className="flex items-center gap-1.5 font-medium">
                        <Level level={r.level} /> <span className="truncate">{r.title}</span>
                      </p>
                    ),
                  },
                  { key: "kind", header: "Loại", hideOnMobile: true, cell: (r) => <span className="text-xs text-muted">{r.kind === "jlpt" ? "Đề JLPT" : "Bài tập"}</span> },
                  { key: "attempts", header: "Lượt làm", cell: (r) => num(r.attempts) },
                  {
                    key: "pass",
                    header: "Tỉ lệ đạt",
                    cell: (r) => <span className={cx("font-semibold", r.pass_rate >= 70 ? "text-emerald-600" : r.pass_rate >= 50 ? "text-amber-600" : "text-red-500")}>{pctFmt(r.pass_rate)}</span>,
                  },
                  { key: "avg", header: "Điểm TB", hideOnMobile: true, cell: (r) => pctFmt(r.avg_score) },
                ]}
                empty={<p className="py-8 text-center text-sm text-muted">Chưa có lượt làm bài trong kỳ.</p>}
              />
            </Panel>
          </div>

          <Panel
            title="Giữ chân học viên theo cohort"
            icon={<Repeat className="size-4" />}
            subtitle="% học viên đăng ký trong tháng còn hoạt động ở các tháng tiếp theo"
            action={exportBtn("cohorts")}
          >
            {loading && !d ? (
              <Skeleton className="h-56" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-xs">
                  <thead>
                    <tr className="text-muted">
                      <th className="px-2 py-1.5 text-left font-semibold">Cohort</th>
                      <th className="px-2 py-1.5 font-semibold">Học viên</th>
                      {Array.from({ length: 6 }, (_, i) => (
                        <th key={i} className="px-2 py-1.5 font-semibold">
                          Tháng {i === 0 ? "đầu" : `+${i}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d?.cohorts.map((c) => (
                      <tr key={c.cohort}>
                        <td className="whitespace-nowrap px-2 py-2 text-left font-semibold">{c.label}</td>
                        <td className="px-2 py-2 font-bold">{num(c.size)}</td>
                        {Array.from({ length: 6 }, (_, i) =>
                          i < c.values.length ? (
                            <td key={i} className={cx("rounded-md px-2 py-2 font-semibold", c.size ? heat(c.values[i]) : "bg-ink/[.03] text-muted")} title={`${num(c.counts[i] ?? 0)} học viên`}>
                              {c.size ? `${Math.round(c.values[i])}%` : "—"}
                            </td>
                          ) : (
                            <td key={i} className="rounded-md bg-ink/[.02]" />
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
                  Thấp
                  {[5, 15, 30, 50, 70, 90].map((v) => (
                    <span key={v} className={cx("size-4 rounded", heat(v))} />
                  ))}
                  Cao
                </div>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
