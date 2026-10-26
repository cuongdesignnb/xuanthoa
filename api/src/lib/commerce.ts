/**
 * Nghiệp vụ thương mại dùng chung: mã đơn, giá, mã giảm giá, ghi danh khi thanh toán / huỷ ghi danh khi hoàn tiền.
 */
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { badRequest } from "./http.js";
import { enrollUser as enrollOne, unenrollUser } from "./enroll.js";

const { orders, plans, courses, coupons } = schema;

export const PAYMENT_METHODS = ["vnpay", "momo", "bank", "card"] as const;
export const METHOD_LABEL: Record<string, string> = { vnpay: "VNPAY", momo: "MoMo", bank: "Chuyển khoản", card: "Thẻ" };
export const ORDER_TYPES = ["Khóa học", "Subscription", "Workshop", "Tài liệu"] as const;

/** Loại doanh thu suy ra từ đơn hàng. */
export const orderType = sql<string>`case
  when ${orders.itemName} ilike 'Workshop%' then 'Workshop'
  when ${orders.itemName} ilike 'Tài liệu%' then 'Tài liệu'
  when ${orders.planId} is not null then 'Subscription'
  else 'Khóa học' end`;

/** Doanh thu thực (sau giảm giá). */
export const netAmount = sql<number>`(${orders.amount} - ${orders.discount})`;

/** Mã đơn duy nhất: NH + yymmdd + 4 chữ số. */
export async function newOrderCode(d = new Date()) {
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 20; i++) {
    const code = `NH${ymd}${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    const [hit] = await db.select({ id: orders.id }).from(orders).where(eq(orders.code, code)).limit(1);
    if (!hit) return code;
  }
  return `NH${ymd}${Date.now().toString().slice(-6)}`;
}

/** Giá hiện tại của khóa học (giá khuyến mãi nếu còn hạn). */
export function coursePrice(c: { price: number; salePrice: number | null; saleEndsAt: Date | null }) {
  if (c.salePrice != null && c.salePrice < c.price && (!c.saleEndsAt || c.saleEndsAt > new Date())) return c.salePrice;
  return c.price;
}

/** Tổng tiền gói: theo tháng = giá tháng; theo năm = giá/tháng (năm) × 12. */
export const planAmount = (p: { priceMonthly: number; priceYearly: number }, billing: "month" | "year") =>
  billing === "year" ? p.priceYearly * 12 : p.priceMonthly;

export type CouponCheck = { valid: true; code: string; discount: number; type: "percent" | "fixed"; value: number; couponId: string } | { valid: false; reason: string };

/** Kiểm tra mã giảm giá cho số tiền `amount`. */
export async function checkCoupon(code: string, amount: number): Promise<CouponCheck> {
  const [c] = await db.select().from(coupons).where(sql`upper(${coupons.code}) = ${code.trim().toUpperCase()}`).limit(1);
  if (!c) return { valid: false, reason: "Mã giảm giá không tồn tại" };
  const now = new Date();
  if (!c.active) return { valid: false, reason: "Mã giảm giá đã bị vô hiệu hoá" };
  if (c.startsAt && c.startsAt > now) return { valid: false, reason: "Mã giảm giá chưa đến thời gian áp dụng" };
  if (c.endsAt && c.endsAt < now) return { valid: false, reason: "Mã giảm giá đã hết hạn" };
  if (c.maxUses != null && c.used >= c.maxUses) return { valid: false, reason: "Mã giảm giá đã hết lượt sử dụng" };
  if (amount < c.minAmount) return { valid: false, reason: `Đơn tối thiểu ${c.minAmount.toLocaleString("vi-VN")}đ để dùng mã này` };
  const discount = Math.min(amount, c.type === "percent" ? Math.round((amount * c.value) / 100 / 1000) * 1000 : c.value);
  return { valid: true, code: c.code, discount, type: c.type, value: c.value, couponId: c.id };
}

export async function requireCoupon(code: string, amount: number) {
  const r = await checkCoupon(code, amount);
  if (!r.valid) throw badRequest(r.reason, [{ path: "couponCode", message: r.reason }]);
  return r;
}

/** Danh sách khóa học (đã xuất bản) mà một gói mở khoá. */
export async function planCourseIds(planId: string) {
  const [p] = await db.select({ levels: plans.levels }).from(plans).where(eq(plans.id, planId));
  if (!p) return [];
  const rows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(
      and(
        eq(courses.status, "published"),
        p.levels.length ? inArray(courses.level, p.levels as ("N5" | "N4" | "N3" | "N2" | "N1")[]) : undefined,
      ),
    );
  return rows.map((r) => r.id);
}

/** Các khóa học mà đơn hàng mở khoá. */
export async function orderCourseIds(o: { courseId: string | null; planId: string | null }) {
  if (o.courseId) return [o.courseId];
  if (o.planId) return planCourseIds(o.planId);
  return [];
}

/** Ghi danh vào nhiều khóa (dùng `enrollUser` của lib/enroll). Trả về số ghi danh mới. */
export async function enrollUser(userId: string, courseIds: string[]) {
  let n = 0;
  for (const id of courseIds) if (await enrollOne(userId, id)) n++;
  return n;
}

/** Huỷ ghi danh các khóa của đơn, trừ khóa vẫn được đơn đã thanh toán khác mở khoá. */
export async function unenrollForOrder(order: { id: string; userId: string; courseId: string | null; planId: string | null }) {
  const ids = await orderCourseIds(order);
  if (!ids.length) return 0;
  const others = await db
    .select({ courseId: orders.courseId, planId: orders.planId })
    .from(orders)
    .where(and(eq(orders.userId, order.userId), inArray(orders.status, ["paid", "refund_requested"]), ne(orders.id, order.id)));
  const keep = new Set<string>();
  for (const o of others) for (const id of await orderCourseIds(o)) keep.add(id);
  const drop = ids.filter((id) => !keep.has(id));
  for (const id of drop) await unenrollUser(order.userId, id);
  return drop.length;
}

/** Đánh dấu đơn đã thanh toán: tăng lượt dùng mã, ghi danh. Trả về số khóa được ghi danh. */
export async function markPaid(orderId: string) {
  const [o] = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date() })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["pending", "cancelled"])))
    .returning();
  if (!o) throw badRequest("Đơn hàng không ở trạng thái chờ thanh toán");
  if (o.couponCode)
    await db.update(coupons).set({ used: sql`${coupons.used} + 1` }).where(sql`upper(${coupons.code}) = ${o.couponCode.toUpperCase()}`);
  const enrolled = await enrollUser(o.userId, await orderCourseIds(o));
  return { order: o, enrolled };
}

/** Hướng dẫn thanh toán (cổng giả lập). */
export function paymentInstructions(o: { code: string; amount: number; discount: number; paymentMethod: string }) {
  const total = o.amount - o.discount;
  const base = { method: o.paymentMethod, methodLabel: METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod, total, content: o.code, expiresInSec: 15 * 60 };
  if (o.paymentMethod === "bank")
    return { ...base, bank: { name: "Vietcombank", account: "0451 0000 68686", holder: "CONG TY TNHH NIHONGO PLUS", branch: "CN Hà Nội" } };
  if (o.paymentMethod === "card") return { ...base, note: "Bạn sẽ được chuyển tới cổng thanh toán thẻ quốc tế (Visa/Master/JCB)." };
  return { ...base, qr: `${o.paymentMethod.toUpperCase()}|NIHONGO|${o.code}|${total}`, note: `Mở ứng dụng ${base.methodLabel} và quét mã QR để thanh toán.` };
}
