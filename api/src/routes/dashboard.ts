import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requirePerm } from "../lib/auth.js";
import { todoCounts } from "./core.js";

const { users, orders, courses, teachers, lessonProgress, tasks, services, enrollments } = schema;

const monthStart = (d: Date, offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1);
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : cur ? 100 : 0);

/** Loại doanh thu suy ra từ đơn hàng (dùng chung cho donut "Phân bổ doanh thu"). */
const revenueType = sql<string>`case
  when ${orders.itemName} ilike 'Workshop%' then 'Workshop'
  when ${orders.itemName} ilike 'Tài liệu%' then 'Tài liệu'
  when ${orders.planId} is not null then 'Subscription'
  else 'Khóa học' end`;

export default async function dashboardRoutes(app: FastifyInstance) {
  /** Toàn bộ dữ liệu màn Tổng quan trong một lần gọi. */
  app.get("/api/admin/dashboard", { preHandler: requirePerm("dashboard.read") }, async () => {
    const now = new Date();
    const thisMonth = monthStart(now);
    const lastMonth = monthStart(now, -1);
    const from12 = monthStart(now, -11);
    const prev12 = monthStart(now, -23);
    const d30 = new Date(Date.now() - 30 * 864e5);
    // postgres-js: tham số trong sql thô phải là chuỗi ISO, không phải Date.
    const iso = (d: Date) => d.toISOString();

    const [
      monthly,
      regMonthly,
      [counts],
      breakdown,
      recent,
      featured,
      todo,
      todayTasks,
      perf,
      svc,
      [rev12prev],
      [reg12prev],
    ] = await Promise.all([
      // Doanh thu + số đơn theo tháng (12 tháng)
      db
        .select({
          m: sql<string>`to_char(date_trunc('month', ${orders.paidAt}), 'YYYY-MM')`,
          revenue: sql<number>`coalesce(sum(${orders.amount} - ${orders.discount}), 0)::bigint`,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(and(eq(orders.status, "paid"), gte(orders.paidAt, from12)))
        .groupBy(sql`1`),
      // Học viên đăng ký mới theo tháng
      db
        .select({ m: sql<string>`to_char(date_trunc('month', ${users.createdAt}), 'YYYY-MM')`, count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "student"), gte(users.createdAt, from12)))
        .groupBy(sql`1`),
      db.execute<{
        students: number;
        students_prev: number;
        active: number;
        active_prev: number;
        teachers: number;
        teachers_new: number;
        teachers_prev: number;
        courses_open: number;
        courses_draft: number;
        courses_prev: number;
        lp_total: number;
        lp_done: number;
        lp_total_prev: number;
        lp_done_prev: number;
      }>(sql`select
        (select count(*)::int from ${users} where role = 'student') as students,
        (select count(*)::int from ${users} where role = 'student' and created_at < ${iso(thisMonth)}) as students_prev,
        (select count(*)::int from ${users} where role = 'student' and last_active_at >= ${iso(d30)}) as active,
        (select count(*)::int from ${users} where role = 'student' and last_active_at >= ${iso(new Date(Date.now() - 60 * 864e5))} and last_active_at < ${iso(d30)}) as active_prev,
        (select count(*)::int from ${teachers} where status = 'published') as teachers,
        (select count(*)::int from ${teachers} where created_at >= ${iso(thisMonth)}) as teachers_new,
        (select count(*)::int from ${teachers} where created_at < ${iso(thisMonth)}) as teachers_prev,
        (select count(*)::int from ${courses} where status = 'published') as courses_open,
        (select count(*)::int from ${courses} where status in ('draft','review')) as courses_draft,
        (select count(*)::int from ${courses} where status = 'published' and created_at < ${iso(thisMonth)}) as courses_prev,
        (select count(*)::int from ${lessonProgress}) as lp_total,
        (select count(*)::int from ${lessonProgress} where completed_at is not null) as lp_done,
        (select count(*)::int from ${lessonProgress} where updated_at < ${iso(thisMonth)}) as lp_total_prev,
        (select count(*)::int from ${lessonProgress} where completed_at is not null and completed_at < ${iso(thisMonth)}) as lp_done_prev
      `),
      // Phân bổ doanh thu tháng này
      db
        .select({ type: revenueType, revenue: sql<number>`coalesce(sum(${orders.amount} - ${orders.discount}), 0)::bigint` })
        .from(orders)
        .where(and(eq(orders.status, "paid"), gte(orders.paidAt, thisMonth)))
        .groupBy(sql`1`),
      // Đăng ký gần đây
      db
        .select({
          id: orders.id,
          code: orders.code,
          itemName: orders.itemName,
          amount: orders.amount,
          discount: orders.discount,
          status: orders.status,
          createdAt: orders.createdAt,
          userId: users.id,
          userName: users.name,
          avatarUrl: users.avatarUrl,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.userId))
        .orderBy(desc(orders.createdAt))
        .limit(5),
      // Khóa học nổi bật
      db
        .select({
          id: courses.id,
          slug: courses.slug,
          title: courses.title,
          level: courses.level,
          coverUrl: courses.coverUrl,
          coverStyle: courses.coverStyle,
          rating: courses.rating,
          studentCount: courses.studentCount,
          enrolled: sql<number>`(select count(*)::int from ${enrollments} e where e.course_id = ${courses.id})`,
          teacherName: teachers.name,
          teacherSeed: teachers.avatarSeed,
          teacherAvatar: teachers.avatarUrl,
        })
        .from(courses)
        .leftJoin(teachers, eq(teachers.id, courses.teacherId))
        .where(eq(courses.status, "published"))
        .orderBy(desc(courses.featured), desc(courses.studentCount))
        .limit(4),
      todoCounts(),
      db
        .select()
        .from(tasks)
        .where(and(gte(tasks.dueAt, new Date(now.getFullYear(), now.getMonth(), now.getDate())), lt(tasks.dueAt, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))))
        .orderBy(tasks.dueAt),
      db
        .select({
          id: teachers.id,
          name: teachers.name,
          avatarSeed: teachers.avatarSeed,
          avatarUrl: teachers.avatarUrl,
          avatarBg: teachers.avatarBg,
          students: teachers.studentCount,
          completion: teachers.completionRate,
          rating: teachers.rating,
        })
        .from(teachers)
        .orderBy(desc(teachers.studentCount))
        .limit(5),
      db.select().from(services),
      db
        .select({ revenue: sql<number>`coalesce(sum(${orders.amount} - ${orders.discount}), 0)::bigint` })
        .from(orders)
        .where(and(eq(orders.status, "paid"), gte(orders.paidAt, prev12), lt(orders.paidAt, from12))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "student"), gte(users.createdAt, prev12), lt(users.createdAt, from12))),
    ]);

    // Chuỗi 12 tháng đầy đủ (kể cả tháng không có dữ liệu)
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = monthStart(now, i - 11);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `Th${d.getMonth() + 1}` };
    });
    const revBy = Object.fromEntries(monthly.map((r) => [r.m, Number(r.revenue)]));
    const ordBy = Object.fromEntries(monthly.map((r) => [r.m, r.count]));
    const regBy = Object.fromEntries(regMonthly.map((r) => [r.m, r.count]));
    const revenueSeries = months.map((m, i) => {
      const v = revBy[m.key] ?? 0;
      const prev = i ? (revBy[months[i - 1].key] ?? 0) : 0;
      return { label: m.label, value: v, orders: ordBy[m.key] ?? 0, growth: i ? pct(v, prev) : 0 };
    });
    const regSeries = months.map((m, i) => {
      const v = regBy[m.key] ?? 0;
      return { label: m.label, value: v, growth: i ? pct(v, regBy[months[i - 1].key] ?? 0) : 0 };
    });
    const revenue12 = revenueSeries.reduce((s, x) => s + x.value, 0);
    const reg12 = regSeries.reduce((s, x) => s + x.value, 0);
    const revThis = revenueSeries[11].value;
    const revLast = revenueSeries[10].value;

    const completion = counts.lp_total ? Math.round((counts.lp_done / counts.lp_total) * 100) : 0;
    // Kỳ trước = bỏ các lượt hoàn thành trong tháng này khỏi cả tử và mẫu.
    const prevDen = counts.lp_total - (counts.lp_done - counts.lp_done_prev);
    const completionPrev = prevDen ? Math.round((counts.lp_done_prev / prevDen) * 100) : completion;
    const newStudentsThisMonth = counts.students - counts.students_prev;

    // Sparkline: tích luỹ học viên theo tháng
    let acc = counts.students - reg12;
    const studentSpark = regSeries.map((r) => (acc += r.value));

    const typeOrder = ["Khóa học", "Subscription", "Workshop", "Tài liệu"];
    const bd = typeOrder.map((t) => ({ label: t, value: Number(breakdown.find((b) => b.type === t)?.revenue ?? 0) }));

    return {
      stats: {
        students: { value: counts.students, delta: pct(counts.students, counts.students_prev), newThisMonth: newStudentsThisMonth, spark: studentSpark },
        active: { value: counts.active, delta: pct(counts.active, counts.active_prev), share: counts.students ? Math.round((counts.active / counts.students) * 1000) / 10 : 0, spark: regSeries.map((r) => r.value) },
        teachers: { value: counts.teachers, delta: pct(counts.teachers, counts.teachers_prev), newThisMonth: counts.teachers_new, spark: [3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, counts.teachers] },
        courses: { value: counts.courses_open, delta: pct(counts.courses_open, counts.courses_prev), drafts: counts.courses_draft, spark: revenueSeries.map((r) => r.orders) },
        revenue: { value: revThis, delta: pct(revThis, revLast), diff: revThis - revLast, spark: revenueSeries.map((r) => r.value) },
        completion: { value: completion, delta: Math.max(-100, Math.min(100, completion - completionPrev)), spark: revenueSeries.map((_, i) => Math.max(0, completion - 11 + i)) },
      },
      revenue: { total: revenue12, growth: pct(revenue12, Number(rev12prev?.revenue ?? 0)), series: revenueSeries },
      registrations: { total: reg12, growth: pct(reg12, reg12prev?.count ?? 0), series: regSeries },
      breakdown: { total: bd.reduce((s, b) => s + b.value, 0), items: bd },
      recentOrders: recent,
      featuredCourses: featured,
      todo,
      tasks: todayTasks,
      teacherPerformance: perf,
      services: svc,
    };
  });

  /** Đánh dấu hoàn thành việc trong "Lịch & nhắc việc hôm nay". */
  app.patch<{ Params: { id: string }; Body: { done?: boolean } }>(
    "/api/admin/dashboard/tasks/:id",
    { preHandler: requirePerm("dashboard.read") },
    async (req) => {
      const done = !!req.body?.done;
      const [row] = await db
        .update(tasks)
        .set({ done, state: done ? "done" : "todo" })
        .where(eq(tasks.id, req.params.id))
        .returning();
      return row;
    },
  );
}
