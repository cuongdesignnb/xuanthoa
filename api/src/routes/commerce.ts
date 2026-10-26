import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { badRequest, notFound, parse } from "../lib/http.js";
import { requireUser } from "../lib/auth.js";
import { isEnrolled } from "../lib/enroll.js";
import {
  PAYMENT_METHODS,
  checkCoupon,
  coursePrice,
  markPaid,
  newOrderCode,
  orderCourseIds,
  paymentInstructions,
  planAmount,
  requireCoupon,
} from "../lib/commerce.js";

const { plans, courses, orders } = schema;

const publicPlan = {
  id: plans.id,
  code: plans.code,
  name: plans.name,
  description: plans.description,
  priceMonthly: plans.priceMonthly,
  priceYearly: plans.priceYearly,
  features: plans.features,
  levels: plans.levels,
  highlighted: plans.highlighted,
  order: plans.order,
};

async function findCourse(ref: { courseId?: string; courseSlug?: string }) {
  const where = ref.courseId ? eq(courses.id, ref.courseId) : ref.courseSlug ? eq(courses.slug, ref.courseSlug) : undefined;
  if (!where) return null;
  const [c] = await db.select().from(courses).where(and(where, eq(courses.status, "published"))).limit(1);
  return c ?? null;
}

async function findPlan(ref: { planId?: string; planCode?: string }) {
  const where = ref.planId ? or(eq(plans.id, ref.planId), eq(plans.code, ref.planId)) : ref.planCode ? eq(plans.code, ref.planCode) : undefined;
  if (!where) return null;
  const [p] = await db.select().from(plans).where(and(where, eq(plans.active, true))).limit(1);
  return p ?? null;
}

const itemRef = {
  planId: z.string().optional(),
  planCode: z.string().optional(),
  billing: z.enum(["month", "year"]).default("month"),
  courseId: z.string().optional(),
  courseSlug: z.string().optional(),
};

/** Xác định mặt hàng + số tiền từ body. */
async function resolveItem(b: { planId?: string; planCode?: string; billing: "month" | "year"; courseId?: string; courseSlug?: string }) {
  if (b.planId || b.planCode) {
    const p = await findPlan(b);
    if (!p) throw notFound("Gói học không tồn tại hoặc đã ngừng bán");
    return {
      planId: p.id,
      courseId: null,
      itemName: `${p.name} ${b.billing === "year" ? "12 tháng" : "1 tháng"}`,
      billing: b.billing,
      amount: planAmount(p, b.billing),
    };
  }
  if (b.courseId || b.courseSlug) {
    const c = await findCourse(b);
    if (!c) throw notFound("Khóa học không tồn tại");
    return { planId: null, courseId: c.id, itemName: c.title, billing: "lifetime", amount: coursePrice(c) };
  }
  throw badRequest("Vui lòng chọn gói học hoặc khóa học");
}

export default async function commerceRoutes(app: FastifyInstance) {
  /* ------------------------------ Public ------------------------------ */

  app.get("/api/public/plans", async () => {
    const items = await db.select(publicPlan).from(plans).where(eq(plans.active, true)).orderBy(asc(plans.order), asc(plans.priceMonthly));
    return { items };
  });

  app.post("/api/public/coupons/validate", async (req) => {
    const b = parse(
      z.object({ code: z.string().trim().min(1, "Nhập mã giảm giá"), amount: z.coerce.number().int().min(0).optional(), ...itemRef }),
      req.body,
    );
    let amount = b.amount;
    if (amount === undefined) amount = (await resolveItem(b)).amount;
    const r = await checkCoupon(b.code, amount);
    if (!r.valid) return { valid: false, reason: r.reason, discount: 0, total: amount };
    return { valid: true, code: r.code, type: r.type, value: r.value, discount: r.discount, total: amount - r.discount };
  });

  /* -------------------------------- Me -------------------------------- */

  app.post("/api/me/checkout", async (req, reply) => {
    const u = await requireUser(req);
    const b = parse(
      z.object({
        ...itemRef,
        couponCode: z.string().trim().optional().nullable(),
        paymentMethod: z.enum(PAYMENT_METHODS, { message: "Chọn phương thức thanh toán" }).default("vnpay"),
      }),
      req.body,
    );
    const item = await resolveItem(b);
    if (item.courseId) {
      if (await isEnrolled(u.id, item.courseId)) throw badRequest("Bạn đã sở hữu khóa học này");
    }
    let discount = 0;
    let couponCode: string | null = null;
    if (b.couponCode) {
      const c = await requireCoupon(b.couponCode, item.amount);
      discount = c.discount;
      couponCode = c.code;
    }
    const [o] = await db
      .insert(orders)
      .values({ ...item, code: await newOrderCode(), userId: u.id, discount, couponCode, paymentMethod: b.paymentMethod, status: "pending" })
      .returning();
    return reply.code(201).send({ order: o, payment: paymentInstructions(o) });
  });

  app.get("/api/me/orders", async (req) => {
    const u = await requireUser(req);
    const items = await db
      .select({
        id: orders.id,
        code: orders.code,
        itemName: orders.itemName,
        billing: orders.billing,
        amount: orders.amount,
        discount: orders.discount,
        couponCode: orders.couponCode,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        note: orders.note,
        paidAt: orders.paidAt,
        createdAt: orders.createdAt,
        planId: orders.planId,
        courseId: orders.courseId,
        courseSlug: courses.slug,
        courseLevel: courses.level,
      })
      .from(orders)
      .leftJoin(courses, eq(courses.id, orders.courseId))
      .where(eq(orders.userId, u.id))
      .orderBy(desc(orders.createdAt));
    return { items };
  });

  app.get<{ Params: { id: string } }>("/api/me/orders/:id", async (req) => {
    const u = await requireUser(req);
    const [o] = await db.select().from(orders).where(and(eq(orders.id, req.params.id), eq(orders.userId, u.id)));
    if (!o) throw notFound("Không tìm thấy đơn hàng");
    return { order: o, payment: o.status === "pending" ? paymentInstructions(o) : null };
  });

  /** Cổng thanh toán giả lập: mô phỏng callback thành công. */
  app.post<{ Params: { id: string } }>("/api/me/orders/:id/pay", async (req) => {
    const u = await requireUser(req);
    const [o] = await db.select().from(orders).where(and(eq(orders.id, req.params.id), eq(orders.userId, u.id)));
    if (!o) throw notFound("Không tìm thấy đơn hàng");
    if (o.status !== "pending") throw badRequest("Đơn hàng không ở trạng thái chờ thanh toán");
    const r = await markPaid(o.id);
    const courseIds = await orderCourseIds(r.order);
    let course: { slug: string; title: string } | null = null;
    if (r.order.courseId) {
      const [c] = await db.select({ slug: courses.slug, title: courses.title }).from(courses).where(eq(courses.id, r.order.courseId));
      course = c ?? null;
    }
    return { order: r.order, enrolled: r.enrolled, courseCount: courseIds.length, course };
  });

  app.post<{ Params: { id: string } }>("/api/me/orders/:id/cancel", async (req) => {
    const u = await requireUser(req);
    const [o] = await db
      .update(orders)
      .set({ status: "cancelled" })
      .where(and(eq(orders.id, req.params.id), eq(orders.userId, u.id), eq(orders.status, "pending")))
      .returning();
    if (!o) throw badRequest("Chỉ huỷ được đơn đang chờ thanh toán");
    return o;
  });

  app.post<{ Params: { id: string } }>("/api/me/orders/:id/refund-request", async (req) => {
    const u = await requireUser(req);
    const b = parse(z.object({ note: z.string().trim().min(5, "Vui lòng cho biết lý do (tối thiểu 5 ký tự)").max(1000) }), req.body);
    const [o] = await db
      .update(orders)
      .set({ status: "refund_requested", note: b.note })
      .where(and(eq(orders.id, req.params.id), eq(orders.userId, u.id), eq(orders.status, "paid")))
      .returning();
    if (!o) throw badRequest("Chỉ gửi yêu cầu hoàn tiền cho đơn đã thanh toán");
    return o;
  });
}
