import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

/**
 * Ghi danh học viên vào khóa học (idempotent). Dùng cho:
 * - đăng ký khóa miễn phí (`POST /api/me/courses/:id/enroll`)
 * - commerce: khi đơn hàng chuyển sang "paid" → `await enrollUser(order.userId, order.courseId)`
 * Trả về true nếu là ghi danh mới.
 */
export async function enrollUser(userId: string, courseId: string, status = "active"): Promise<boolean> {
  const inserted = await db
    .insert(schema.enrollments)
    .values({ userId, courseId, status })
    .onConflictDoNothing()
    .returning({ userId: schema.enrollments.userId });
  if (inserted.length) {
    await db
      .update(schema.courses)
      .set({ studentCount: sql`${schema.courses.studentCount} + 1` })
      .where(eq(schema.courses.id, courseId));
    return true;
  }
  await db
    .update(schema.enrollments)
    .set({ status })
    .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId)));
  return false;
}

/** Huỷ ghi danh (vd khi hoàn tiền) — giữ lại tiến độ học. */
export async function unenrollUser(userId: string, courseId: string) {
  await db
    .update(schema.enrollments)
    .set({ status: "cancelled" })
    .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId)));
}

export async function isEnrolled(userId: string, courseId: string) {
  const [r] = await db
    .select({ s: schema.enrollments.status })
    .from(schema.enrollments)
    .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId)));
  return r?.s === "active";
}

/** Tiến độ (số bài hoàn thành / tổng bài đã xuất bản) cho nhiều khóa của một học viên. */
export async function courseProgress(userId: string, courseIds: string[]) {
  const out = new Map<string, { completed: number; total: number; percent: number }>();
  if (!courseIds.length) return out;
  const rows = await db
    .select({
      courseId: schema.modules.courseId,
      total: sql<number>`count(${schema.lessons.id})::int`,
      completed: sql<number>`count(${schema.lessonProgress.completedAt})::int`,
    })
    .from(schema.lessons)
    .innerJoin(schema.modules, eq(schema.modules.id, schema.lessons.moduleId))
    .leftJoin(
      schema.lessonProgress,
      and(
        eq(schema.lessonProgress.lessonId, schema.lessons.id),
        eq(schema.lessonProgress.userId, userId),
        isNotNull(schema.lessonProgress.completedAt),
      ),
    )
    .where(and(inArray(schema.modules.courseId, courseIds), eq(schema.lessons.status, "published")))
    .groupBy(schema.modules.courseId);
  for (const id of courseIds) out.set(id, { completed: 0, total: 0, percent: 0 });
  for (const r of rows)
    out.set(r.courseId, { completed: r.completed, total: r.total, percent: r.total ? Math.round((r.completed / r.total) * 100) : 0 });
  return out;
}
