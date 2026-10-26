import type { FastifyInstance } from "fastify";
import { and, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { parse } from "../lib/http.js";
import { requirePerm } from "../lib/auth.js";
import { METHOD_LABEL, ORDER_TYPES, netAmount, orderType } from "../lib/commerce.js";

const { orders, users, courses, plans } = schema;

export type Range = { start: Date; end: Date; prevStart: Date; prevEnd: Date; unit: "day" | "month"; label: string };

const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur ? 100 : 0);
const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const rangeQuery = z.object({
  range: z.enum(["7d", "30d", "90d", "12m", "ytd", "custom"]).default("12m"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Khoảng thời gian [start, end) + kỳ trước cùng độ dài + đơn vị chia cột. */
export function resolveRange(q: z.infer<typeof rangeQuery>): Range {
  const now = new Date();
  const tomorrow = addDays(day0(now), 1);
  let start: Date;
  let end = tomorrow;
  let unit: "day" | "month" = "day";
  let label = "";
  if (q.from || q.to || q.range === "custom") {
    start = day0(q.from ?? addDays(now, -29));
    end = addDays(day0(q.to ?? now), 1);
    label = "Tuỳ chọn";
  } else if (q.range === "7d") {
    start = addDays(tomorrow, -7);
    label = "7 ngày qua";
  } else if (q.range === "30d") {
    start = addDays(tomorrow, -30);
    label = "30 ngày qua";
  } else if (q.range === "90d") {
    start = addDays(tomorrow, -90);
    label = "90 ngày qua";
  } else if (q.range === "ytd") {
    start = new Date(now.getFullYear(), 0, 1);
    unit = "month";
    label = "Từ đầu năm";
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    unit = "month";
    label = "12 tháng qua";
  }
  const days = Math.round((end.getTime() - start.getTime()) / 864e5);
  if (days > 92) unit = "month";
  let prevStart: Date;
  let prevEnd: Date;
  if (unit === "month" && start.getDate() === 1) {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + (end.getDate() > 1 ? 1 : 0);
    prevStart = new Date(start.getFullYear(), start.getMonth() - months, 1);
    // Kỳ trước kết thúc ở cùng "vị trí" (vd YTD so với cùng kỳ năm trước)
    prevEnd = new Date(end.getFullYear(), end.getMonth() - months, end.getDate());
  } else {
    prevStart = addDays(start, -days);
    prevEnd = start;
  }
  return { start, end, prevStart, prevEnd, unit, label };
}

/** Danh sách bucket (khóa YYYY-MM hoặc YYYY-MM-DD) trong khoảng. */
export function buckets(r: Range) {
  const out: { key: string; label: string; full: string }[] = [];
  if (r.unit === "month") {
    for (let d = new Date(r.start.getFullYear(), r.start.getMonth(), 1); d < r.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `Th${d.getMonth() + 1}`,
        full: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
      });
  } else {
    for (let d = r.start; d < r.end; d = addDays(d, 1))
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        full: d.toLocaleDateString("vi-VN"),
      });
  }
  return out;
}

const bucketSql = (unit: "day" | "month", col: unknown) =>
  unit === "month"
    ? sql<string>`to_char(date_trunc('month', ${col} at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM')`
    : sql<string>`to_char(date_trunc('day', ${col} at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD')`;

const paidIn = (a: Date, b: Date) => and(eq(orders.status, "paid"), gte(orders.paidAt, a), lt(orders.paidAt, b));

async function totals(a: Date, b: Date) {
  const [[t], [ref], [first]] = await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint`,
        gross: sql<number>`coalesce(sum(${orders.amount}), 0)::bigint`,
        discount: sql<number>`coalesce(sum(${orders.discount}), 0)::bigint`,
        orders: sql<number>`count(*)::int`,
        customers: sql<number>`count(distinct ${orders.userId})::int`,
      })
      .from(orders)
      .where(paidIn(a, b)),
    db
      .select({
        refunded: sql<number>`count(*) filter (where ${orders.status} = 'refunded')::int`,
        refundedAmount: sql<number>`coalesce(sum(${netAmount}) filter (where ${orders.status} = 'refunded'), 0)::bigint`,
        requested: sql<number>`count(*) filter (where ${orders.status} = 'refund_requested')::int`,
        settled: sql<number>`count(*) filter (where ${orders.status} in ('paid','refunded','refund_requested'))::int`,
        pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')::int`,
        all: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, a), lt(orders.createdAt, b))),
    db.execute<{ n: number }>(sql`
      select count(*)::int as n from (
        select user_id, min(paid_at) as first from ${orders} where status = 'paid' group by user_id
      ) f where f.first >= ${a.toISOString()} and f.first < ${b.toISOString()}`),
  ]);
  const revenue = Number(t.revenue);
  return {
    revenue,
    gross: Number(t.gross),
    discount: Number(t.discount),
    orders: t.orders,
    customers: t.customers,
    newCustomers: first?.n ?? 0,
    aov: t.orders ? Math.round(revenue / t.orders) : 0,
    arpu: t.customers ? Math.round(revenue / t.customers) : 0,
    refunded: ref.refunded,
    refundedAmount: Number(ref.refundedAmount),
    refundRequested: ref.requested,
    refundRate: ref.settled ? Math.round(((ref.refunded + ref.requested) / ref.settled) * 1000) / 10 : 0,
    pending: ref.pending,
    conversion: ref.all ? Math.round((ref.settled / ref.all) * 1000) / 10 : 0,
  };
}

export default async function revenueRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("orders.read") };

  app.get("/api/admin/revenue", read, async (req) => {
    const q = parse(rangeQuery, req.query);
    const r = resolveRange(q);
    const bk = bucketSql(r.unit, orders.paidAt);
    const [cur, prev, series, prevSeries, byType, byMethod, topCourses, topPlans, recent] = await Promise.all([
      totals(r.start, r.end),
      totals(r.prevStart, r.prevEnd),
      db
        .select({ k: bk, revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint`, orders: sql<number>`count(*)::int` })
        .from(orders)
        .where(paidIn(r.start, r.end))
        .groupBy(sql`1`),
      db
        .select({ revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint` })
        .from(orders)
        .where(paidIn(r.prevStart, r.prevEnd)),
      db
        .select({ type: orderType, revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint`, orders: sql<number>`count(*)::int` })
        .from(orders)
        .where(paidIn(r.start, r.end))
        .groupBy(sql`1`),
      db
        .select({ method: orders.paymentMethod, revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint`, orders: sql<number>`count(*)::int` })
        .from(orders)
        .where(paidIn(r.start, r.end))
        .groupBy(orders.paymentMethod),
      db
        .select({
          id: courses.id,
          slug: courses.slug,
          title: courses.title,
          level: courses.level,
          revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint`,
          orders: sql<number>`count(*)::int`,
        })
        .from(orders)
        .innerJoin(courses, eq(courses.id, orders.courseId))
        .where(and(paidIn(r.start, r.end), isNotNull(orders.courseId)))
        .groupBy(courses.id)
        .orderBy(sql`coalesce(sum(${netAmount}), 0) desc`)
        .limit(8),
      db
        .select({
          id: plans.id,
          code: plans.code,
          name: plans.name,
          revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint`,
          orders: sql<number>`count(*)::int`,
          yearly: sql<number>`count(*) filter (where ${orders.billing} = 'year')::int`,
        })
        .from(orders)
        .innerJoin(plans, eq(plans.id, orders.planId))
        .where(paidIn(r.start, r.end))
        .groupBy(plans.id)
        .orderBy(sql`coalesce(sum(${netAmount}), 0) desc`),
      db
        .select({ type: orderType, item: orders.itemName, revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint`, orders: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(paidIn(r.start, r.end), inArray(orderType, ["Workshop", "Tài liệu"])))
        .groupBy(sql`1`, sql`2`)
        .orderBy(sql`3 desc`)
        .limit(8),
    ]);

    const map = Object.fromEntries(series.map((s) => [s.k, s]));
    const bs = buckets(r);
    const seriesOut = bs.map((b, i) => {
      const v = Number(map[b.key]?.revenue ?? 0);
      const p = i ? Number(map[bs[i - 1].key]?.revenue ?? 0) : 0;
      return { key: b.key, label: b.label, full: b.full, revenue: v, orders: map[b.key]?.orders ?? 0, growth: i ? pct(v, p) : 0 };
    });
    const totalRev = cur.revenue || 1;

    return {
      range: { ...q, label: r.label, unit: r.unit, start: r.start, end: r.end, prevStart: r.prevStart, prevEnd: r.prevEnd },
      totals: cur,
      previous: prev,
      growth: {
        revenue: pct(cur.revenue, prev.revenue),
        orders: pct(cur.orders, prev.orders),
        aov: pct(cur.aov, prev.aov),
        arpu: pct(cur.arpu, prev.arpu),
        customers: pct(cur.customers, prev.customers),
        newCustomers: pct(cur.newCustomers, prev.newCustomers),
        refundRate: Math.round((cur.refundRate - prev.refundRate) * 10) / 10,
      },
      previousRevenue: Number(prevSeries[0]?.revenue ?? 0),
      series: seriesOut,
      byType: ORDER_TYPES.map((t) => {
        const x = byType.find((b) => b.type === t);
        const revenue = Number(x?.revenue ?? 0);
        return { type: t, revenue, orders: x?.orders ?? 0, share: Math.round((revenue / totalRev) * 1000) / 10 };
      }),
      byMethod: ["vnpay", "momo", "bank", "card"].map((m) => {
        const x = byMethod.find((b) => b.method === m);
        const revenue = Number(x?.revenue ?? 0);
        return { method: m, label: METHOD_LABEL[m], revenue, orders: x?.orders ?? 0, share: Math.round((revenue / totalRev) * 1000) / 10 };
      }),
      topCourses: topCourses.map((c) => ({ ...c, revenue: Number(c.revenue) })),
      topPlans: topPlans.map((p) => ({ ...p, revenue: Number(p.revenue) })),
      topOther: recent.map((x) => ({ ...x, revenue: Number(x.revenue) })),
    };
  });

  /** Học viên đăng ký mới theo tháng/ngày (biểu đồ "Học viên đăng ký mới"). */
  app.get("/api/admin/revenue/registrations", { preHandler: requirePerm("dashboard.read") }, async (req) => {
    const q = parse(rangeQuery, req.query);
    const r = resolveRange(q);
    const bk = bucketSql(r.unit, users.createdAt);
    const student = eq(users.role, "student");
    const [rows, [prev], [all]] = await Promise.all([
      db
        .select({ k: bk, count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(student, gte(users.createdAt, r.start), lt(users.createdAt, r.end)))
        .groupBy(sql`1`),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(student, gte(users.createdAt, r.prevStart), lt(users.createdAt, r.prevEnd))),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(student),
    ]);
    const map = Object.fromEntries(rows.map((x) => [x.k, x.count]));
    const bs = buckets(r);
    const series = bs.map((b, i) => {
      const v = map[b.key] ?? 0;
      return { key: b.key, label: b.label, full: b.full, value: v, growth: i ? pct(v, map[bs[i - 1].key] ?? 0) : 0 };
    });
    const total = series.reduce((s, x) => s + x.value, 0);
    return { range: { ...q, label: r.label, unit: r.unit }, total, previous: prev.count, growth: pct(total, prev.count), allStudents: all.count, series };
  });
}
