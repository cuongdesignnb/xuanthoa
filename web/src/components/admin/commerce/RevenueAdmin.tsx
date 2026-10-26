"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, CreditCard, Download, Percent, RotateCcw, ShoppingBag, UserPlus, Wallet } from "lucide-react";
import { Badge, Button, Card, ErrorState, Level, Panel, Skeleton, cx } from "@/components/admin/ui";
import { BarChart, DONUT_COLORS, Donut, ProgressBar } from "@/components/admin/charts";
import { DataTable } from "@/components/admin/table";
import { PageHeader, StatCard } from "@/components/admin/page";
import { num, qs, vnd, vndShort } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { METHOD, RangePicker, TYPE_TONE, downloadCsv, pctFmt, rangeQuery, type RangeValue } from "./shared";

type Totals = {
  revenue: number;
  gross: number;
  discount: number;
  orders: number;
  customers: number;
  newCustomers: number;
  aov: number;
  arpu: number;
  refunded: number;
  refundedAmount: number;
  refundRequested: number;
  refundRate: number;
  pending: number;
  conversion: number;
};
type RevenueData = {
  range: { label: string; unit: "day" | "month"; start: string; end: string };
  totals: Totals;
  previous: Totals;
  growth: Record<"revenue" | "orders" | "aov" | "arpu" | "customers" | "newCustomers" | "refundRate", number>;
  series: { key: string; label: string; full: string; revenue: number; orders: number; growth: number }[];
  byType: { type: string; revenue: number; orders: number; share: number }[];
  byMethod: { method: string; label: string; revenue: number; orders: number; share: number }[];
  topCourses: { id: string; slug: string; title: string; level: string | null; revenue: number; orders: number }[];
  topPlans: { id: string; code: string; name: string; revenue: number; orders: number; yearly: number }[];
  topOther: { type: string; item: string; revenue: number; orders: number }[];
};

const TYPE_COLORS = [DONUT_COLORS[0], DONUT_COLORS[1], DONUT_COLORS[2], DONUT_COLORS[3]];

export default function RevenueAdmin() {
  const [range, setRange] = useState<RangeValue>({ range: "12m" });
  const ready = range.range !== "custom" || (!!range.from && !!range.to);
  const { data, loading, error, reload } = useApi<RevenueData>(ready ? `/admin/revenue${qs(rangeQuery(range))}` : null);
  const d = data;
  const unitLabel = d?.range.unit === "month" ? "tháng" : "ngày";
  const series = d?.series ?? [];
  // Đường xu hướng: trung bình trượt 3 kỳ
  const chart = series.map((s, i) => {
    const w = series.slice(Math.max(0, i - 2), i + 1);
    return { label: s.label, value: s.revenue, line: Math.round(w.reduce((a, b) => a + b.revenue, 0) / w.length) };
  });
  const last = series.at(-1);
  const topMax = Math.max(0, ...(d?.topCourses ?? []).map((c) => c.revenue));

  return (
    <div>
      <PageHeader
        title="Doanh thu"
        subtitle="Phân tích doanh thu, đơn hàng và hiệu quả bán hàng theo thời gian."
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Doanh thu" }]}
        actions={
          <Button
            variant="outline"
            icon={<Download className="size-4" />}
            disabled={!d}
            onClick={() =>
              d &&
              downloadCsv("/admin/orders/export.csv", {
                status: "paid",
                from: d.range.start.slice(0, 10),
                to: new Date(new Date(d.range.end).getTime() - 864e5).toISOString().slice(0, 10),
              })
            }
          >
            Xuất CSV
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
        <RangePicker value={range} onChange={setRange} />
        {d && <span className="text-xs text-muted">So sánh với kỳ trước cùng độ dài</span>}
      </Card>

      {error && !d ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
            <StatCard index={0} icon={<Wallet className="size-5" />} label="Doanh thu thực" value={d ? vndShort(d.totals.revenue) : "…"} delta={d?.growth.revenue} spark={series.map((s) => s.revenue)} sub={d ? `Kỳ trước ${vndShort(d.previous.revenue)}` : undefined} />
            <StatCard index={1} tone="violet" icon={<ShoppingBag className="size-5" />} label="Đơn đã thanh toán" value={d ? num(d.totals.orders) : "…"} delta={d?.growth.orders} spark={series.map((s) => s.orders)} sub={d ? `${num(d.totals.pending)} đơn đang chờ` : undefined} />
            <StatCard index={2} tone="blue" icon={<CreditCard className="size-5" />} label="Giá trị TB / đơn" value={d ? vndShort(d.totals.aov) : "…"} delta={d?.growth.aov} sub={d ? `Giảm giá ${vndShort(d.totals.discount)}` : undefined} />
            <StatCard index={3} tone="amber" icon={<BarChart3 className="size-5" />} label="ARPU (doanh thu / khách)" value={d ? vndShort(d.totals.arpu) : "…"} delta={d?.growth.arpu} sub={d ? `${num(d.totals.customers)} khách mua` : undefined} />
            <StatCard index={4} tone="green" icon={<UserPlus className="size-5" />} label="Khách hàng mới" value={d ? num(d.totals.newCustomers) : "…"} delta={d?.growth.newCustomers} sub="Lần đầu thanh toán" />
            <StatCard index={5} tone="pink" icon={<RotateCcw className="size-5" />} label="Tỉ lệ hoàn tiền" value={d ? pctFmt(d.totals.refundRate) : "…"} delta={d ? -d.growth.refundRate : undefined} sub={d ? `${num(d.totals.refundRequested)} yêu cầu chờ duyệt` : undefined} href="/admin/don-hang?status=refund_requested" />
          </div>

          <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_360px]">
            <Panel
              title={`Doanh thu theo ${unitLabel}`}
              icon={<BarChart3 className="size-4" />}
              subtitle={d ? `${d.range.label} · tổng ${vnd(d.totals.revenue)}` : undefined}
              action={
                d && (
                  <Badge tone={d.growth.revenue >= 0 ? "green" : "red"}>
                    {d.growth.revenue >= 0 ? "↑" : "↓"} {Math.abs(d.growth.revenue)}% so với kỳ trước
                  </Badge>
                )
              }
            >
              {loading && !d ? (
                <Skeleton className="h-[260px]" />
              ) : (
                <BarChart
                  data={chart}
                  height={260}
                  format={vndShort}
                  legend={{ bar: "Doanh thu", line: "Xu hướng (TB 3 kỳ)" }}
                  tooltip={(_, i) => (
                    <>
                      <p className="text-muted">{series[i].full}</p>
                      <p className="font-bold text-brand-600">{vndShort(series[i].revenue)}</p>
                      <p className="text-muted">{num(series[i].orders)} đơn</p>
                      {i > 0 && <p className={series[i].growth >= 0 ? "text-emerald-600" : "text-red-500"}>{series[i].growth >= 0 ? "↑" : "↓"} {Math.abs(series[i].growth)}%</p>}
                    </>
                  )}
                />
              )}
              {last && d?.range.unit === "month" && (
                <p className="mt-2 text-center text-xs text-muted">
                  {last.full}: <b className="text-brand-600">{vndShort(last.revenue)}</b> ({last.growth >= 0 ? "+" : ""}
                  {last.growth}% so với tháng trước)
                </p>
              )}
            </Panel>

            <Panel title="Phân bổ doanh thu" icon={<Percent className="size-4" />} subtitle={d?.range.label}>
              {loading && !d ? (
                <Skeleton className="h-[260px]" />
              ) : d ? (
                <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
                  <Donut
                    data={d.byType.map((t, i) => ({ label: t.type, value: t.revenue, color: TYPE_COLORS[i] }))}
                    center={
                      <div>
                        <p className="text-xl font-extrabold">{vndShort(d.totals.revenue)}</p>
                        <p className="text-[11px] text-muted">Tổng doanh thu</p>
                      </div>
                    }
                  />
                  <ul className="w-full flex-1 space-y-3">
                    {d.byType.map((t, i) => (
                      <li key={t.type} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: TYPE_COLORS[i] }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted">{t.type}</p>
                          <p className="font-bold">{vndShort(t.revenue)}</p>
                        </div>
                        <span className="text-xs font-semibold text-muted">{pctFmt(t.share)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Panel>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Theo phương thức thanh toán" icon={<CreditCard className="size-4" />}>
              {loading && !d ? (
                <Skeleton className="h-48" />
              ) : (
                <ul className="space-y-4">
                  {d?.byMethod.map((m) => (
                    <li key={m.method}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className={cx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold", METHOD[m.method]?.cls)}>
                          {METHOD[m.method]?.icon}
                          {m.label}
                        </span>
                        <span className="text-xs text-muted">
                          {num(m.orders)} đơn · <b className="text-ink">{vndShort(m.revenue)}</b> · {pctFmt(m.share)}
                        </span>
                      </div>
                      <ProgressBar value={m.share} tone="brand" className="h-2" />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Số đơn đã thanh toán" icon={<ShoppingBag className="size-4" />} subtitle={d ? `${num(d.totals.orders)} đơn · tỉ lệ thanh toán thành công ${pctFmt(d.totals.conversion)}` : undefined}>
              {loading && !d ? <Skeleton className="h-48" /> : <BarChart data={series.map((s) => ({ label: s.label, value: s.orders }))} height={190} format={(v) => num(Math.round(v))} />}
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Khóa học bán chạy" className="xl:col-span-2" action={<Link href="/admin/don-hang?status=paid" className="text-xs font-semibold text-brand-500">Xem đơn hàng →</Link>}>
              <DataTable
                rows={d?.topCourses ?? []}
                loading={loading}
                rowKey={(r) => r.id}
                compact
                columns={[
                  { key: "rank", header: "#", cell: (_, i) => <span className="font-bold text-muted">{i + 1}</span> },
                  {
                    key: "title",
                    header: "Khóa học",
                    cell: (r) => (
                      <span className="flex items-center gap-2">
                        <Level level={r.level} />
                        <span className="font-medium">{r.title}</span>
                      </span>
                    ),
                  },
                  { key: "orders", header: "Đơn", cell: (r) => num(r.orders) },
                  { key: "revenue", header: "Doanh thu", cell: (r) => <b className="text-brand-600">{vndShort(r.revenue)}</b> },
                  {
                    key: "share",
                    header: "Tỉ trọng",
                    hideOnMobile: true,
                    cell: (r) => <ProgressBar value={topMax ? (r.revenue / topMax) * 100 : 0} tone="brand" className="w-24" />,
                  },
                ]}
                empty={<p className="py-8 text-center text-sm text-muted">Chưa có đơn khóa học trong kỳ.</p>}
              />
            </Panel>
            <div className="space-y-5">
              <Panel title="Gói Subscription">
                {loading && !d ? (
                  <Skeleton className="h-32" />
                ) : !d?.topPlans.length ? (
                  <p className="py-6 text-center text-sm text-muted">Chưa có đơn gói trong kỳ.</p>
                ) : (
                  <ul className="space-y-3">
                    {d.topPlans.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-[11px] text-muted">
                            {num(p.orders)} đơn · {num(p.yearly)} gói năm
                          </p>
                        </div>
                        <b className="text-brand-600">{vndShort(p.revenue)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Workshop & Tài liệu">
                {loading && !d ? (
                  <Skeleton className="h-32" />
                ) : !d?.topOther.length ? (
                  <p className="py-6 text-center text-sm text-muted">Chưa có đơn trong kỳ.</p>
                ) : (
                  <ul className="space-y-3">
                    {d.topOther.slice(0, 6).map((x) => (
                      <li key={x.item} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{x.item.replace(/^(Workshop|Tài liệu)\s+/, "")}</p>
                          <p className="text-[11px] text-muted">
                            <Badge tone={TYPE_TONE[x.type]}>{x.type}</Badge> · {num(x.orders)} đơn
                          </p>
                        </div>
                        <b className="whitespace-nowrap">{vndShort(x.revenue)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
