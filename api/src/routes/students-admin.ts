import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, schema } from "../db/index.js";
import { HttpError, allOf, countAll, listQuery, notFound, orderOf, pageOf, parse, searchWhere } from "../lib/http.js";
import { hashPassword, logActivity, requirePerm } from "../lib/auth.js";
import { sendCsv, toCsv } from "../lib/csv.js";

const { users } = schema;
const zLevel = z.enum(["N5", "N4", "N3", "N2", "N1"]);

const filterQuery = listQuery.extend({
  level: zLevel.optional().or(z.literal("")),
  status: z.enum(["active", "blocked", "pending"]).optional().or(z.literal("")),
  joinedFrom: z.string().optional(),
  joinedTo: z.string().optional(),
});

function whereOf(q: z.infer<typeof filterQuery>) {
  return allOf(
    eq(users.role, "student"),
    searchWhere(q.q, [users.name, users.email, users.phone]),
    q.level ? eq(users.level, q.level) : undefined,
    q.status ? eq(users.status, q.status) : undefined,
    q.joinedFrom ? gte(users.createdAt, new Date(q.joinedFrom)) : undefined,
    q.joinedTo ? lte(users.createdAt, new Date(new Date(q.joinedTo).getTime() + 86400000 - 1)) : undefined,
  );
}

const enrollCount = sql<number>`(select count(*)::int from enrollments e where e.user_id = ${users.id})`;
const paidTotal = sql<number>`(select coalesce(sum(o.amount - o.discount), 0)::int from orders o where o.user_id = ${users.id} and o.status = 'paid')`;

const listCols = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  avatarUrl: users.avatarUrl,
  level: users.level,
  targetLevel: users.targetLevel,
  status: users.status,
  streak: users.streak,
  xp: users.xp,
  lastActiveAt: users.lastActiveAt,
  createdAt: users.createdAt,
  enrollments: enrollCount,
  totalPaid: paidTotal,
};

const sortCols = {
  name: users.name,
  email: users.email,
  level: users.level,
  createdAt: users.createdAt,
  lastActiveAt: users.lastActiveAt,
  xp: users.xp,
  streak: users.streak,
};

const createBody = z.object({
  name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự"),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  phone: z.string().trim().optional().nullable(),
  level: zLevel.optional().nullable(),
  targetLevel: zLevel.optional().nullable(),
  targetDate: z.string().trim().optional().nullable(),
  status: z.enum(["active", "blocked", "pending"]).default("active"),
  bio: z.string().optional().nullable(),
});
const updateBody = createBody.partial().extend({ password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").optional() });

async function getStudent(id: string) {
  const [u] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "student"))).limit(1);
  if (!u) throw notFound("Không tìm thấy học viên");
  return u;
}

export default async function studentsAdminRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("students.read") };
  const write = { preHandler: requirePerm("students.write") };

  app.get("/api/admin/students/stats", read, async () => {
    const [r] = await db.execute<{ total: number; active30: number; newMonth: number; newPrevMonth: number; blocked: number }>(sql`
      select
        count(*)::int as total,
        count(*) filter (where last_active_at >= now() - interval '30 days')::int as "active30",
        count(*) filter (where created_at >= date_trunc('month', now()))::int as "newMonth",
        count(*) filter (where created_at >= date_trunc('month', now()) - interval '1 month' and created_at < date_trunc('month', now()))::int as "newPrevMonth",
        count(*) filter (where status = 'blocked')::int as blocked
      from users where role = 'student'
    `);
    const months = await db.execute<{ m: string; n: number }>(sql`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as m, count(*)::int as n
      from users where role = 'student' and created_at >= date_trunc('month', now()) - interval '11 months'
      group by 1 order by 1
    `);
    return { ...r, monthly: months.map((x) => x.n) };
  });

  app.get("/api/admin/students", read, async (req) => {
    const q = parse(filterQuery, req.query);
    const where = whereOf(q);
    const { limit, offset } = pageOf(q);
    const [items, [{ total }]] = await Promise.all([
      db.select(listCols).from(users).where(where).orderBy(orderOf(q, sortCols, users.createdAt)).limit(limit).offset(offset),
      db.select({ total: countAll }).from(users).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  app.get("/api/admin/students/export.csv", read, async (req, reply) => {
    const q = parse(filterQuery, req.query);
    const rows = await db.select(listCols).from(users).where(whereOf(q)).orderBy(orderOf(q, sortCols, users.createdAt)).limit(20000);
    await logActivity(req, "export", "student", null, `Xuất CSV ${rows.length} học viên`);
    const csv = toCsv(
      [
        { key: "name", label: "Họ tên" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Điện thoại" },
        { key: "level", label: "Trình độ" },
        { key: "targetLevel", label: "Mục tiêu" },
        { key: "status", label: "Trạng thái" },
        { key: "enrollments", label: "Số khóa học" },
        { key: "totalPaid", label: "Đã thanh toán (VND)" },
        { key: "xp", label: "XP" },
        { key: "streak", label: "Chuỗi ngày" },
        { key: "createdAt", label: "Ngày tham gia" },
        { key: "lastActiveAt", label: "Hoạt động cuối" },
      ],
      rows,
    );
    return sendCsv(reply, `hoc-vien-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  });

  app.get<{ Params: { id: string } }>("/api/admin/students/:id", read, async (req) => {
    const u = await getStudent(req.params.id);
    const { passwordHash: _ph, ...profile } = u;
    const id = u.id;
    const [enrollments, orders, attemptStats, recentAttempts, study, logs, recentLessons] = await Promise.all([
      db.execute<{
        courseId: string; title: string; slug: string; level: string | null; coverUrl: string | null; status: string;
        enrolledAt: string; total: number; done: number; lastAt: string | null;
      }>(sql`
        select c.id as "courseId", c.title, c.slug, c.level, c.cover_url as "coverUrl", e.status, to_json(e.created_at)#>>'{}' as "enrolledAt",
          (select count(*)::int from lessons l join modules m on m.id = l.module_id where m.course_id = c.id) as total,
          (select count(*)::int from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
             where m.course_id = c.id and lp.user_id = ${id} and lp.completed_at is not null) as done,
          (select to_json(max(lp.updated_at)) from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
             where m.course_id = c.id and lp.user_id = ${id})#>>'{}' as "lastAt"
        from enrollments e join courses c on c.id = e.course_id
        where e.user_id = ${id} order by e.created_at desc
      `),
      db
        .select({
          id: schema.orders.id,
          code: schema.orders.code,
          itemName: schema.orders.itemName,
          amount: schema.orders.amount,
          discount: schema.orders.discount,
          paymentMethod: schema.orders.paymentMethod,
          status: schema.orders.status,
          createdAt: schema.orders.createdAt,
          paidAt: schema.orders.paidAt,
        })
        .from(schema.orders)
        .where(eq(schema.orders.userId, id))
        .orderBy(desc(schema.orders.createdAt))
        .limit(50),
      db.execute<{ total: number; graded: number; avg: number | null; best: number | null }>(sql`
        select count(*)::int as total,
          count(*) filter (where status <> 'in_progress')::int as graded,
          round(avg(case when max_score > 0 then score / max_score * 100 end))::int as avg,
          round(max(case when max_score > 0 then score / max_score * 100 end))::int as best
        from attempts where user_id = ${id}
      `),
      db
        .select({
          id: schema.attempts.id,
          quizTitle: schema.quizzes.title,
          quizSlug: schema.quizzes.slug,
          kind: schema.quizzes.kind,
          level: schema.quizzes.level,
          score: schema.attempts.score,
          maxScore: schema.attempts.maxScore,
          status: schema.attempts.status,
          durationSec: schema.attempts.durationSec,
          startedAt: schema.attempts.startedAt,
          submittedAt: schema.attempts.submittedAt,
        })
        .from(schema.attempts)
        .innerJoin(schema.quizzes, eq(schema.quizzes.id, schema.attempts.quizId))
        .where(eq(schema.attempts.userId, id))
        .orderBy(desc(schema.attempts.startedAt))
        .limit(30),
      db.execute<{ day: string; minutes: number }>(sql`
        select d::date::text as day, coalesce(sum(s.minutes), 0)::int as minutes
        from generate_series(current_date - 29, current_date, interval '1 day') d
        left join study_sessions s on s.day = d::date and s.user_id = ${id}
        group by d order by d
      `),
      db
        .select()
        .from(schema.activityLogs)
        .where(sql`${schema.activityLogs.userId} = ${id} or ${schema.activityLogs.entityId} = ${id}`)
        .orderBy(desc(schema.activityLogs.createdAt))
        .limit(20),
      db
        .select({ title: schema.lessons.title, slug: schema.lessons.slug, percent: schema.lessonProgress.percent, completedAt: schema.lessonProgress.completedAt, at: schema.lessonProgress.updatedAt })
        .from(schema.lessonProgress)
        .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId))
        .where(eq(schema.lessonProgress.userId, id))
        .orderBy(desc(schema.lessonProgress.updatedAt))
        .limit(15),
    ]);

    type Act = { type: string; title: string; at: string | Date; meta?: string };
    const activity: Act[] = [
      ...recentLessons.map((l) => ({ type: "lesson", title: `${l.completedAt ? "Hoàn thành" : "Học"} bài “${l.title}”`, at: l.at, meta: `${l.percent}%` })),
      ...recentAttempts.slice(0, 10).map((a) => ({
        type: "attempt",
        title: `Làm bài “${a.quizTitle}”`,
        at: a.submittedAt ?? a.startedAt,
        meta: a.maxScore ? `${Math.round(((a.score ?? 0) / a.maxScore) * 100)}%` : undefined,
      })),
      ...orders.slice(0, 10).map((o) => ({ type: "order", title: `Đơn hàng ${o.code} · ${o.itemName}`, at: o.createdAt, meta: o.status })),
      ...logs.map((l) => ({ type: "log", title: l.summary ?? `${l.action} ${l.entity}`, at: l.createdAt, meta: l.userName ?? undefined })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 30);

    const studyMinutes30 = study.reduce((a, s) => a + s.minutes, 0);
    return {
      profile,
      stats: {
        enrollments: enrollments.length,
        totalPaid: orders.filter((o) => o.status === "paid").reduce((a, o) => a + o.amount - o.discount, 0),
        studyMinutes30,
        attempts: attemptStats[0],
      },
      enrollments: enrollments.map((e) => ({ ...e, percent: e.total ? Math.round((e.done / e.total) * 100) : 0 })),
      orders,
      attempts: recentAttempts,
      study: study.map((s) => ({ day: s.day, minutes: s.minutes })),
      activity,
    };
  });

  app.post("/api/admin/students", write, async (req, reply) => {
    const b = parse(createBody, req.body);
    const email = b.email.toLowerCase();
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists) throw new HttpError(400, "Dữ liệu không hợp lệ", [{ path: "email", message: "Email đã được sử dụng" }]);
    const { password, ...rest } = b;
    const [u] = await db
      .insert(users)
      .values({ ...rest, email, role: "student", passwordHash: await hashPassword(password) })
      .returning({ id: users.id, name: users.name, email: users.email });
    await logActivity(req, "create", "student", u.id, `Tạo học viên ${u.name}`);
    return reply.code(201).send(u);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/students/:id", write, async (req) => {
    const cur = await getStudent(req.params.id);
    const b = parse(updateBody, req.body);
    const { password, email, ...rest } = b;
    const data: Partial<typeof users.$inferInsert> = { ...rest };
    if (email && email.toLowerCase() !== cur.email) {
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      if (exists) throw new HttpError(400, "Dữ liệu không hợp lệ", [{ path: "email", message: "Email đã được sử dụng" }]);
      data.email = email.toLowerCase();
    }
    if (password) data.passwordHash = await hashPassword(password);
    const [u] = await db.update(users).set(data).where(eq(users.id, cur.id)).returning({ id: users.id, name: users.name, status: users.status });
    const action = b.status && b.status !== cur.status ? (b.status === "blocked" ? "block" : "unblock") : password ? "reset_password" : "update";
    const label = { block: "Khoá", unblock: "Mở khoá", reset_password: "Đặt lại mật khẩu", update: "Cập nhật" }[action];
    await logActivity(req, action, "student", u.id, `${label} học viên ${u.name}`);
    return u;
  });

  /** Đặt lại mật khẩu: nếu không truyền `password` sẽ sinh ngẫu nhiên và trả về một lần. */
  app.post<{ Params: { id: string } }>("/api/admin/students/:id/reset-password", write, async (req) => {
    const cur = await getStudent(req.params.id);
    const b = parse(z.object({ password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").optional() }), req.body ?? {});
    const password = b.password ?? `Nh${randomBytes(4).toString("hex")}!`;
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, cur.id));
    await logActivity(req, "reset_password", "student", cur.id, `Đặt lại mật khẩu học viên ${cur.name}`);
    return { ok: true, password };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/students/:id", write, async (req, reply) => {
    const cur = await getStudent(req.params.id);
    await db.delete(users).where(eq(users.id, cur.id));
    await logActivity(req, "delete", "student", cur.id, `Xoá học viên ${cur.name}`);
    return reply.code(204).send();
  });

  app.post("/api/admin/students/bulk", write, async (req) => {
    const b = parse(z.object({ ids: z.array(z.string()).min(1).max(500), action: z.enum(["block", "unblock", "delete"]) }), req.body);
    const where = and(inArray(users.id, b.ids), eq(users.role, "student"));
    let n = 0;
    if (b.action === "delete") n = (await db.delete(users).where(where).returning({ id: users.id })).length;
    else
      n = (await db.update(users).set({ status: b.action === "block" ? "blocked" : "active" }).where(where).returning({ id: users.id })).length;
    const label = { block: "Khoá", unblock: "Mở khoá", delete: "Xoá" }[b.action];
    await logActivity(req, `bulk_${b.action}`, "student", null, `${label} ${n} học viên`, { ids: b.ids });
    return { ok: true, count: n };
  });
}
