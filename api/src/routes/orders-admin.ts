import type { FastifyInstance, FastifyReply } from "fastify";
import { and, asc, desc, eq, getTableColumns, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { allOf, badRequest, countAll, listQuery, notFound, orderOf, pageOf, parse, searchWhere } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";
import { crudRoutes, zDate } from "../lib/crud.js";
import { METHOD_LABEL, markPaid, netAmount, orderCourseIds, orderType, unenrollForOrder } from "../lib/commerce.js";

const { orders, users, plans, courses, coupons } = schema;

/* ------------------------------------------------------------------ */
/* Tiện ích                                                            */
/* ------------------------------------------------------------------ */

export function csvReply(reply: FastifyReply, filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  return reply
    .header("content-type", "text/csv; charset=utf-8")
    .header("content-disposition", `attachment; filename="${filename}"`)
    .send(body);
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  refund_requested: "Yêu cầu hoàn tiền",
  refunded: "Đã hoàn tiền",
  cancelled: "Đã huỷ",
};

const orderFilters = z.object({
  status: z.string().optional(),
  method: z.string().optional(),
  planId: z.string().optional(),
  courseId: z.string().optional(),
  type: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().optional(),
});
type OrderFilters = z.infer<typeof orderFilters>;

function filterWhere(f: OrderFilters, withStatus = true): SQL | undefined {
  const to = f.to ? new Date(f.to.getTime() + 864e5) : undefined; // bao gồm cả ngày "đến"
  return allOf(
    withStatus && f.status ? inArray(orders.status, f.status.split(",") as never) : undefined,
    f.method ? eq(orders.paymentMethod, f.method) : undefined,
    f.planId ? eq(orders.planId, f.planId) : undefined,
    f.courseId ? eq(orders.courseId, f.courseId) : undefined,
    f.type ? sql`${orderType} = ${f.type}` : undefined,
    f.from ? gte(orders.createdAt, f.from) : undefined,
    to ? lt(orders.createdAt, to) : undefined,
    searchWhere(f.q, [orders.code, orders.itemName, users.name, users.email]),
  );
}

const orderCols = {
  id: orders.id,
  code: orders.code,
  itemName: orders.itemName,
  billing: orders.billing,
  amount: orders.amount,
  discount: orders.discount,
  total: sql<number>`${netAmount}::int`,
  couponCode: orders.couponCode,
  paymentMethod: orders.paymentMethod,
  status: orders.status,
  note: orders.note,
  paidAt: orders.paidAt,
  createdAt: orders.createdAt,
  planId: orders.planId,
  courseId: orders.courseId,
  type: orderType,
  userId: users.id,
  userName: users.name,
  userEmail: users.email,
  userAvatar: users.avatarUrl,
};

/* ------------------------------------------------------------------ */

export default async function ordersAdminRoutes(app: FastifyInstance) {
  const ordersRead = { preHandler: requirePerm("orders.read") };
  const ordersWrite = { preHandler: requirePerm("orders.write") };

  /* ------------------------------ Đơn hàng ------------------------------ */

  app.get("/api/admin/orders", ordersRead, async (req) => {
    const q = parse(listQuery.extend(orderFilters.shape), req.query);
    const where = filterWhere(q);
    const whereNoStatus = filterWhere(q, false);
    const { limit, offset } = pageOf(q);
    const [items, [{ total }], byStatus] = await Promise.all([
      db
        .select(orderCols)
        .from(orders)
        .innerJoin(users, eq(users.id, orders.userId))
        .where(where)
        .orderBy(orderOf(q, { code: orders.code, amount: orders.amount, total: netAmount as never, createdAt: orders.createdAt, paidAt: orders.paidAt, status: orders.status }, orders.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(orders).innerJoin(users, eq(users.id, orders.userId)).where(where),
      db
        .select({
          status: orders.status,
          count: countAll,
          revenue: sql<number>`coalesce(sum(${netAmount}), 0)::bigint`,
          discount: sql<number>`coalesce(sum(${orders.discount}), 0)::bigint`,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.userId))
        .where(whereNoStatus)
        .groupBy(orders.status),
    ]);
    const st = (s: string) => byStatus.find((b) => b.status === s);
    const statuses = q.status ? q.status.split(",") : null;
    const inFilter = byStatus.filter((b) => !statuses || statuses.includes(b.status));
    return {
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
      summary: {
        /** Doanh thu (đơn đã thanh toán) theo bộ lọc. */
        revenue: Number(st("paid")?.revenue ?? 0),
        /** Tổng giá trị các đơn khớp bộ lọc (mọi trạng thái đang lọc). */
        amount: inFilter.reduce((s, b) => s + Number(b.revenue), 0),
        discount: inFilter.reduce((s, b) => s + Number(b.discount), 0),
        count: inFilter.reduce((s, b) => s + b.count, 0),
        paid: st("paid")?.count ?? 0,
        pending: st("pending")?.count ?? 0,
        pendingAmount: Number(st("pending")?.revenue ?? 0),
        refundRequested: st("refund_requested")?.count ?? 0,
        refunded: st("refunded")?.count ?? 0,
        refundedAmount: Number(st("refunded")?.revenue ?? 0),
        cancelled: st("cancelled")?.count ?? 0,
      },
    };
  });

  app.get("/api/admin/orders/export.csv", ordersRead, async (req, reply) => {
    const q = parse(orderFilters, req.query);
    const rows = await db
      .select(orderCols)
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(filterWhere(q))
      .orderBy(desc(orders.createdAt))
      .limit(50000);
    await logActivity(req, "export", "order", null, `Xuất CSV ${rows.length} đơn hàng`);
    return csvReply(
      reply,
      `don-hang-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Mã đơn", "Học viên", "Email", "Sản phẩm", "Loại", "Giá", "Giảm giá", "Thành tiền", "Mã giảm giá", "Phương thức", "Trạng thái", "Ngày tạo", "Ngày thanh toán", "Ghi chú"],
      rows.map((r) => [
        r.code,
        r.userName,
        r.userEmail,
        r.itemName,
        r.type,
        r.amount,
        r.discount,
        r.total,
        r.couponCode,
        METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod,
        STATUS_LABEL[r.status] ?? r.status,
        r.createdAt.toISOString(),
        r.paidAt?.toISOString(),
        r.note,
      ]),
    );
  });

  app.get<{ Params: { id: string } }>("/api/admin/orders/:id", ordersRead, async (req) => {
    const [o] = await db
      .select({
        ...orderCols,
        userPhone: users.phone,
        userLevel: users.level,
        userCreatedAt: users.createdAt,
        planName: plans.name,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        courseLevel: courses.level,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .leftJoin(plans, eq(plans.id, orders.planId))
      .leftJoin(courses, eq(courses.id, orders.courseId))
      .where(eq(orders.id, req.params.id));
    if (!o) throw notFound("Không tìm thấy đơn hàng");
    const [history, [stats], unlocked] = await Promise.all([
      db
        .select({ id: orders.id, code: orders.code, itemName: orders.itemName, total: sql<number>`${netAmount}::int`, status: orders.status, createdAt: orders.createdAt })
        .from(orders)
        .where(and(eq(orders.userId, o.userId), sql`${orders.id} <> ${o.id}`))
        .orderBy(desc(orders.createdAt))
        .limit(8),
      db
        .select({ orders: countAll, spent: sql<number>`coalesce(sum(${netAmount}) filter (where ${orders.status} = 'paid'), 0)::bigint` })
        .from(orders)
        .where(eq(orders.userId, o.userId)),
      orderCourseIds(o).then((ids) => ids.length),
    ]);
    return { ...o, history, customer: { orders: stats.orders, spent: Number(stats.spent) }, unlockedCourses: unlocked };
  });

  app.post<{ Params: { id: string } }>("/api/admin/orders/:id/mark-paid", ordersWrite, async (req) => {
    const r = await markPaid(req.params.id);
    await logActivity(req, "update", "order", r.order.id, `Xác nhận thanh toán đơn ${r.order.code}`);
    return { ...r.order, enrolled: r.enrolled };
  });

  app.post<{ Params: { id: string } }>("/api/admin/orders/:id/cancel", ordersWrite, async (req) => {
    const b = parse(z.object({ note: z.string().trim().optional() }), req.body ?? {});
    const [o] = await db
      .update(orders)
      .set({ status: "cancelled", ...(b.note ? { note: b.note } : {}) })
      .where(and(eq(orders.id, req.params.id), eq(orders.status, "pending")))
      .returning();
    if (!o) throw badRequest("Chỉ huỷ được đơn đang chờ thanh toán");
    await logActivity(req, "update", "order", o.id, `Huỷ đơn ${o.code}`);
    return o;
  });

  app.post<{ Params: { id: string } }>("/api/admin/orders/:id/refund-approve", ordersWrite, async (req) => {
    const b = parse(z.object({ note: z.string().trim().optional(), unenroll: z.boolean().default(true) }), req.body ?? {});
    const [o] = await db
      .update(orders)
      .set({ status: "refunded", ...(b.note ? { note: b.note } : {}) })
      .where(and(eq(orders.id, req.params.id), inArray(orders.status, ["refund_requested", "paid"])))
      .returning();
    if (!o) throw badRequest("Đơn hàng không thể hoàn tiền");
    const removed = b.unenroll ? await unenrollForOrder(o) : 0;
    await logActivity(req, "update", "order", o.id, `Duyệt hoàn tiền đơn ${o.code}`, { unenrolled: removed });
    return { ...o, unenrolled: removed };
  });

  app.post<{ Params: { id: string } }>("/api/admin/orders/:id/refund-reject", ordersWrite, async (req) => {
    const b = parse(z.object({ note: z.string().trim().optional() }), req.body ?? {});
    const [o] = await db
      .update(orders)
      .set({ status: "paid", ...(b.note ? { note: b.note } : {}) })
      .where(and(eq(orders.id, req.params.id), eq(orders.status, "refund_requested")))
      .returning();
    if (!o) throw badRequest("Đơn hàng không có yêu cầu hoàn tiền");
    await logActivity(req, "update", "order", o.id, `Từ chối hoàn tiền đơn ${o.code}`);
    return o;
  });

  app.patch<{ Params: { id: string } }>("/api/admin/orders/:id", ordersWrite, async (req) => {
    const b = parse(z.object({ note: z.string().trim().nullable().optional() }), req.body);
    const [o] = await db.update(orders).set(b).where(eq(orders.id, req.params.id)).returning();
    if (!o) throw notFound("Không tìm thấy đơn hàng");
    await logActivity(req, "update", "order", o.id, `Cập nhật ghi chú đơn ${o.code}`);
    return o;
  });

  /* ------------------------------ Gói học ------------------------------ */

  const planSchema = z.object({
    code: z
      .string()
      .trim()
      .min(2, "Mã gói tối thiểu 2 ký tự")
      .regex(/^[a-z0-9-]+$/, "Chỉ dùng chữ thường, số và dấu gạch ngang"),
    name: z.string().trim().min(2, "Nhập tên gói"),
    description: z.string().trim().optional().nullable(),
    priceMonthly: z.coerce.number().int().min(0, "Giá không hợp lệ"),
    priceYearly: z.coerce.number().int().min(0, "Giá không hợp lệ"),
    features: z.array(z.string().trim().min(1)).optional(),
    levels: z.array(z.enum(["N5", "N4", "N3", "N2", "N1"])).optional(),
    highlighted: z.boolean().optional(),
    active: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
  });

  app.get("/api/admin/plans", { preHandler: requirePerm("plans.read") }, async (req) => {
    const q = parse(listQuery.extend({ active: z.string().optional() }), req.query);
    const where = allOf(searchWhere(q.q, [plans.name, plans.code]), q.active ? eq(plans.active, q.active === "true") : undefined);
    const items = await db
      .select({
        ...getTableColumns(plans),
        orders: sql<number>`(select count(*)::int from ${orders} o where o.plan_id = "plans"."id" and o.status = 'paid')`,
        revenue: sql<number>`(select coalesce(sum(o.amount - o.discount), 0)::bigint from ${orders} o where o.plan_id = "plans"."id" and o.status = 'paid')`,
        subscribers: sql<number>`(select count(distinct o.user_id)::int from ${orders} o where o.plan_id = "plans"."id" and o.status = 'paid' and o.paid_at >= now() - interval '1 year')`,
      })
      .from(plans)
      .where(where)
      .orderBy(asc(plans.order), asc(plans.priceMonthly));
    return { items: items.map((i) => ({ ...i, revenue: Number(i.revenue) })), total: items.length, page: 1, pageSize: items.length };
  });

  app.post("/api/admin/plans/reorder", { preHandler: requirePerm("plans.write") }, async (req) => {
    const b = parse(z.object({ ids: z.array(z.string()).min(1) }), req.body);
    await db.transaction(async (tx) => {
      for (const [i, id] of b.ids.entries()) await tx.update(plans).set({ order: i }).where(eq(plans.id, id));
    });
    await logActivity(req, "update", "plan", null, "Sắp xếp lại thứ tự gói học");
    return { ok: true };
  });

  crudRoutes(app, {
    path: "/api/admin/plans",
    table: plans,
    perm: "plans",
    entity: "plan",
    schema: planSchema,
    defaultSort: plans.order,
    only: ["get", "create", "update", "delete"],
  });

  /* ---------------------------- Mã giảm giá ---------------------------- */

  const couponBase = z.object({
    code: z
      .string()
      .trim()
      .min(3, "Mã tối thiểu 3 ký tự")
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, "Chỉ dùng chữ, số, - và _")
      .transform((s) => s.toUpperCase()),
    type: z.enum(["percent", "fixed"]).optional(),
    value: z.coerce.number().int().min(1, "Giá trị phải lớn hơn 0"),
    maxUses: z.coerce.number().int().min(1).optional().nullable(),
    minAmount: z.coerce.number().int().min(0).optional(),
    startsAt: zDate,
    endsAt: zDate,
    active: z.boolean().optional(),
  });

  const couponState = sql<string>`case
    when not ${coupons.active} then 'inactive'
    when ${coupons.endsAt} is not null and ${coupons.endsAt} < now() then 'expired'
    when ${coupons.maxUses} is not null and ${coupons.used} >= ${coupons.maxUses} then 'used_up'
    when ${coupons.startsAt} is not null and ${coupons.startsAt} > now() then 'scheduled'
    else 'active' end`;

  const randomCode = (prefix = "", len = 8) => {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < len; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return (prefix ? prefix.toUpperCase() : "") + s;
  };

  app.get("/api/admin/coupons", { preHandler: requirePerm("coupons.read") }, async (req) => {
    const q = parse(listQuery.extend({ state: z.string().optional(), type: z.string().optional() }), req.query);
    const where = allOf(
      searchWhere(q.q, [coupons.code]),
      q.state ? sql`${couponState} = ${q.state}` : undefined,
      q.type ? eq(coupons.type, q.type as "percent") : undefined,
    );
    const { limit, offset } = pageOf(q);
    const [items, [{ total }], states] = await Promise.all([
      db
        .select({
          id: coupons.id,
          code: coupons.code,
          type: coupons.type,
          value: coupons.value,
          maxUses: coupons.maxUses,
          used: coupons.used,
          minAmount: coupons.minAmount,
          startsAt: coupons.startsAt,
          endsAt: coupons.endsAt,
          active: coupons.active,
          createdAt: coupons.createdAt,
          state: couponState,
          orders: sql<number>`(select count(*)::int from ${orders} o where upper(o.coupon_code) = "coupons"."code" and o.status = 'paid')`,
          discountTotal: sql<number>`(select coalesce(sum(o.discount), 0)::bigint from ${orders} o where upper(o.coupon_code) = "coupons"."code" and o.status = 'paid')`,
          revenue: sql<number>`(select coalesce(sum(o.amount - o.discount), 0)::bigint from ${orders} o where upper(o.coupon_code) = "coupons"."code" and o.status = 'paid')`,
        })
        .from(coupons)
        .where(where)
        .orderBy(orderOf(q, { code: coupons.code, value: coupons.value, used: coupons.used, endsAt: coupons.endsAt, createdAt: coupons.createdAt }, coupons.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(coupons).where(where),
      db.select({ state: couponState, count: countAll }).from(coupons).groupBy(sql`1`),
    ]);
    const [usage] = await db
      .select({
        used: sql<number>`coalesce(sum(${coupons.used}), 0)::int`,
        discount: sql<number>`(select coalesce(sum(discount), 0)::bigint from ${orders} where coupon_code is not null and status = 'paid')`,
        revenue: sql<number>`(select coalesce(sum(amount - discount), 0)::bigint from ${orders} where coupon_code is not null and status = 'paid')`,
      })
      .from(coupons);
    return {
      items: items.map((i) => ({ ...i, discountTotal: Number(i.discountTotal), revenue: Number(i.revenue) })),
      total,
      page: q.page,
      pageSize: q.pageSize,
      summary: {
        states: Object.fromEntries(states.map((s) => [s.state, s.count])),
        used: usage.used,
        discount: Number(usage.discount),
        revenue: Number(usage.revenue),
      },
    };
  });

  app.get("/api/admin/coupons/random-code", { preHandler: requirePerm("coupons.read") }, async (req) => {
    const q = parse(z.object({ prefix: z.string().trim().max(12).optional(), length: z.coerce.number().int().min(4).max(16).default(8) }), req.query);
    for (let i = 0; i < 10; i++) {
      const code = randomCode(q.prefix, q.length);
      const [hit] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code));
      if (!hit) return { code };
    }
    throw badRequest("Không tạo được mã, hãy thử lại");
  });

  /** Tạo hàng loạt mã ngẫu nhiên cùng cấu hình. */
  app.post("/api/admin/coupons/generate", { preHandler: requirePerm("coupons.write") }, async (req, reply) => {
    const b = parse(
      couponBase.omit({ code: true }).extend({
        count: z.coerce.number().int().min(1).max(500),
        prefix: z.string().trim().max(12).regex(/^[A-Za-z0-9_-]*$/, "Chỉ dùng chữ, số, - và _").default(""),
        length: z.coerce.number().int().min(4).max(16).default(8),
      }),
      req.body,
    );
    if (b.type !== "fixed" && b.value > 100) throw badRequest("Dữ liệu không hợp lệ", [{ path: "value", message: "Phần trăm tối đa 100" }]);
    const { count, prefix, length, ...rest } = b;
    const codes = new Set<string>();
    while (codes.size < count) codes.add(randomCode(prefix, length));
    const rows = await db
      .insert(coupons)
      .values([...codes].map((code) => ({ ...rest, code })))
      .onConflictDoNothing()
      .returning();
    await logActivity(req, "create", "coupon", null, `Tạo ${rows.length} mã giảm giá ngẫu nhiên`);
    return reply.code(201).send({ items: rows, count: rows.length });
  });

  app.get<{ Params: { id: string } }>("/api/admin/coupons/:id/orders", { preHandler: requirePerm("coupons.read") }, async (req) => {
    const [c] = await db.select({ code: coupons.code }).from(coupons).where(eq(coupons.id, req.params.id));
    if (!c) throw notFound();
    const items = await db
      .select(orderCols)
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(sql`upper(${orders.couponCode}) = ${c.code}`)
      .orderBy(desc(orders.createdAt))
      .limit(50);
    return { items };
  });

  crudRoutes(app, {
    path: "/api/admin/coupons",
    table: coupons,
    perm: "coupons",
    entity: "coupon",
    schema: couponBase as never,
    defaultSort: coupons.createdAt,
    beforeWrite: (d, mode) => {
      if ((d.type === "percent" || (mode === "create" && d.type !== "fixed")) && Number(d.value) > 100) throw badRequest("Dữ liệu không hợp lệ", [{ path: "value", message: "Phần trăm tối đa 100" }]);
      return d;
    },
    only: ["get", "create", "update", "delete"],
    label: (r) => String(r.code),
  });
}

