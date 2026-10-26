import type { FastifyInstance } from "fastify";
import { eq, ilike, or, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { notFound, parse } from "../lib/http.js";
import { requirePerm, requireUser, can } from "../lib/auth.js";

/** Khóa cài đặt được phép đọc công khai (không cần đăng nhập). */
const PUBLIC_SETTINGS = new Set(["site", "social", "payment"]);

export async function todoCounts() {
  const [r] = await db.execute<{
    reviews: number;
    reports: number;
    refunds: number;
    posts: number;
    tickets: number;
  }>(sql`
    select
      (select count(*)::int from ${schema.reviews} where status = 'pending') as reviews,
      (select count(*)::int from ${schema.reports} where status = 'open') as reports,
      (select count(*)::int from ${schema.orders} where status = 'refund_requested') as refunds,
      (select count(*)::int from ${schema.posts} where status = 'review') as posts,
      (select count(*)::int from ${schema.tickets} where status = 'open') as tickets
  `);
  return r;
}

export default async function coreRoutes(app: FastifyInstance) {
  app.get<{ Params: { key: string } }>("/api/public/settings/:key", async (req) => {
    if (!PUBLIC_SETTINGS.has(req.params.key)) throw notFound();
    const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, req.params.key));
    return row?.value ?? {};
  });

  /** Tổng việc cần xử lý (badge chuông ở topbar). */
  app.get("/api/admin/dashboard/todo-count", { preHandler: requirePerm("dashboard.read") }, async () => {
    const c = await todoCounts();
    return { ...c, total: c.reviews + c.reports + c.refunds + c.posts + c.tickets };
  });

  /** Tìm kiếm toàn cục ⌘K — chỉ trả các nhóm người dùng có quyền xem. */
  app.get("/api/admin/search", async (req) => {
    const u = await requireUser(req);
    const { q } = parse(z.object({ q: z.string().trim().min(2) }), req.query);
    const term = `%${q}%`;
    const tasks: Promise<{ type: string; id: string; title: string; subtitle?: string; href: string }[]>[] = [];

    if (can(u, "students.read"))
      tasks.push(
        db
          .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
          .from(schema.users)
          .where(sql`${schema.users.role} = 'student' and (${ilike(schema.users.name, term)} or ${ilike(schema.users.email, term)})`)
          .limit(5)
          .then((r) => r.map((x) => ({ type: "Học viên", id: x.id, title: x.name, subtitle: x.email, href: `/admin/hoc-vien/${x.id}` }))),
      );
    if (can(u, "courses.read"))
      tasks.push(
        db
          .select({ id: schema.courses.id, title: schema.courses.title, level: schema.courses.level })
          .from(schema.courses)
          .where(ilike(schema.courses.title, term))
          .limit(5)
          .then((r) => r.map((x) => ({ type: "Khóa học", id: x.id, title: x.title, subtitle: x.level ?? undefined, href: `/admin/khoa-hoc/${x.id}` }))),
        db
          .select({ id: schema.lessons.id, title: schema.lessons.title })
          .from(schema.lessons)
          .where(ilike(schema.lessons.title, term))
          .limit(5)
          .then((r) => r.map((x) => ({ type: "Bài học", id: x.id, title: x.title, href: `/admin/bai-hoc/${x.id}` }))),
      );
    if (can(u, "quizzes.read"))
      tasks.push(
        db
          .select({ id: schema.quizzes.id, title: schema.quizzes.title, kind: schema.quizzes.kind, level: schema.quizzes.level })
          .from(schema.quizzes)
          .where(ilike(schema.quizzes.title, term))
          .limit(5)
          .then((r) =>
            r.map((x) => ({
              type: x.kind === "jlpt" ? "Đề thi" : "Bài tập",
              id: x.id,
              title: x.title,
              subtitle: x.level,
              href: `/admin/${x.kind === "jlpt" ? "de-thi" : "bai-tap"}/${x.id}`,
            })),
          ),
      );
    if (can(u, "posts.read"))
      tasks.push(
        db
          .select({ id: schema.posts.id, title: schema.posts.title })
          .from(schema.posts)
          .where(ilike(schema.posts.title, term))
          .limit(5)
          .then((r) => r.map((x) => ({ type: "Bài viết", id: x.id, title: x.title, href: `/admin/blog/${x.id}` }))),
      );
    if (can(u, "teachers.read"))
      tasks.push(
        db
          .select({ id: schema.teachers.id, name: schema.teachers.name })
          .from(schema.teachers)
          .where(ilike(schema.teachers.name, term))
          .limit(5)
          .then((r) => r.map((x) => ({ type: "Giáo viên", id: x.id, title: x.name, href: `/admin/giao-vien?id=${x.id}` }))),
      );
    if (can(u, "orders.read"))
      tasks.push(
        db
          .select({ id: schema.orders.id, code: schema.orders.code, itemName: schema.orders.itemName })
          .from(schema.orders)
          .where(or(ilike(schema.orders.code, term), ilike(schema.orders.itemName, term)))
          .limit(5)
          .then((r) => r.map((x) => ({ type: "Đơn hàng", id: x.id, title: x.code, subtitle: x.itemName, href: `/admin/don-hang?id=${x.id}` }))),
      );

    return { items: (await Promise.all(tasks)).flat() };
  });

  /** Tra cứu nhanh danh sách nhỏ cho ô chọn (teachers, courses, plans…). */
  app.get<{ Params: { entity: string } }>("/api/admin/options/:entity", async (req) => {
    const u = await requireUser(req);
    if (u.role === "student") throw notFound();
    switch (req.params.entity) {
      case "teachers":
        return (await db.select({ value: schema.teachers.id, label: schema.teachers.name }).from(schema.teachers).orderBy(schema.teachers.order));
      case "courses":
        return (await db.select({ value: schema.courses.id, label: schema.courses.title }).from(schema.courses).orderBy(schema.courses.order));
      case "plans":
        return (await db.select({ value: schema.plans.id, label: schema.plans.name }).from(schema.plans).orderBy(schema.plans.order));
      case "roles":
        return (await db.select({ value: schema.roles.id, label: schema.roles.name }).from(schema.roles));
      case "staff":
        return (await db
          .select({ value: schema.users.id, label: schema.users.name })
          .from(schema.users)
          .where(inArray(schema.users.role, ["admin", "staff", "teacher"])));
      default:
        throw notFound();
    }
  });
}
