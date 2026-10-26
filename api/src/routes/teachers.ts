import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { allOf, countAll, listQuery, notFound, pageOf, parse, slugify, badRequest } from "../lib/http.js";
import { logActivity, optionalUser, requirePerm, requireUser } from "../lib/auth.js";
import { zOptStr } from "../lib/crud.js";
import { vnSearch } from "../lib/vn.js";

const { teachers, courses, enrollments, reviews, lessonProgress, lessons, modules, bookmarks, tickets, users } = schema;

/* Cấp độ đầu/cuối trong levelRange "N5 – N3" (số lớn = dễ). */
const lvA = sql`coalesce((regexp_match(${teachers.levelRange}, 'N(\\d)'))[1]::int, 5)`;
const lvB = sql`coalesce((regexp_match(${teachers.levelRange}, 'N(\\d)\\D*$'))[1]::int, 1)`;
const skillsText = sql`array_to_string(${teachers.skills}, ' ')`;

/** Bộ lọc chip ở trang /giao-vien — suy ra từ native/skills/levelRange/badge. */
const CHIP: Record<string, SQL> = {
  native: sql`${teachers.native} = true`,
  jlpt: sql`${skillsText} ilike '%jlpt%'`,
  "giao-tiep": sql`(${skillsText} ilike '%giao tiếp%' or ${skillsText} ilike '%hội thoại%')`,
  kanji: sql`${skillsText} ilike '%kanji%'`,
  n5n3: sql`greatest(${lvA}, ${lvB}) >= 3`,
  n2n1: sql`least(${lvA}, ${lvB}) <= 2`,
};

/** Chỉ số thật: học viên ghi danh khóa của GV, tỉ lệ hoàn thành bài học (chỉ khi đủ ≥ 30 lượt tiến độ), điểm đánh giá đã duyệt. */
const enrolledExpr = sql<number>`(select count(distinct e.user_id)::int from ${enrollments} e join ${courses} c on c.id = e.course_id where c.teacher_id = ${teachers.id})`;
const completionExpr = sql<number | null>`(
  select case when count(*) >= 30 then round(avg(case when lp.completed_at is not null then 100 else lp.percent end))::int end
  from ${lessonProgress} lp
  join ${lessons} l on l.id = lp.lesson_id
  join ${modules} m on m.id = l.module_id
  join ${courses} c on c.id = m.course_id
  where c.teacher_id = ${teachers.id})`;
const ratingExpr = sql<number | null>`(
  select round(avg(r.rating)::numeric, 1)::float from ${reviews} r
  left join ${courses} c on c.id = r.course_id
  where r.status = 'approved' and (r.teacher_id = ${teachers.id} or c.teacher_id = ${teachers.id}))`;
const reviewsExpr = sql<number>`(
  select count(*)::int from ${reviews} r
  left join ${courses} c on c.id = r.course_id
  where r.status = 'approved' and (r.teacher_id = ${teachers.id} or c.teacher_id = ${teachers.id}))`;
const coursesExpr = sql<number>`(select count(*)::int from ${courses} c where c.teacher_id = ${teachers.id})`;

const publicCols = {
  id: teachers.id,
  slug: teachers.slug,
  name: teachers.name,
  title: teachers.title,
  avatarUrl: teachers.avatarUrl,
  avatarSeed: teachers.avatarSeed,
  avatarBg: teachers.avatarBg,
  levelRange: teachers.levelRange,
  badge: teachers.badge,
  native: teachers.native,
  skills: teachers.skills,
  yearsExp: teachers.yearsExp,
  bio: teachers.bio,
  rating: teachers.rating,
  reviewCount: teachers.reviewCount,
  studentCount: teachers.studentCount,
  featured: teachers.featured,
};

const fullCols = {
  ...publicCols,
  quote: teachers.quote,
  education: teachers.education,
  highlights: teachers.highlights,
  completionRate: teachers.completionRate,
};

const teacherBody = z.object({
  name: z.string().trim().min(2, "Nhập tên giáo viên"),
  slug: z.string().trim().optional().nullable(),
  title: zOptStr,
  userId: zOptStr,
  avatarUrl: zOptStr,
  avatarSeed: zOptStr,
  avatarBg: zOptStr,
  levelRange: zOptStr,
  badge: zOptStr,
  native: z.boolean().optional(),
  skills: z.array(z.string().trim().min(1)).optional(),
  yearsExp: z.coerce.number().int().min(0).max(60).optional(),
  bio: zOptStr,
  quote: zOptStr,
  education: zOptStr,
  highlights: z.array(z.string().trim().min(1)).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().min(0).optional(),
  studentCount: z.coerce.number().int().min(0).optional(),
  completionRate: z.coerce.number().int().min(0).max(100).optional(),
  featured: z.boolean().optional(),
  status: z.enum(["draft", "review", "published", "archived"]).optional(),
  order: z.coerce.number().int().optional(),
});

async function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base.replace(/^(cô|thầy)\s+/i, "")) || "giao-vien";
  let slug = root;
  for (let i = 2; ; i++) {
    const [hit] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(and(eq(teachers.slug, slug), exceptId ? ne(teachers.id, exceptId) : undefined))
      .limit(1);
    if (!hit) return slug;
    slug = `${root}-${i}`;
  }
}

/** Sắp xếp "Phổ biến" ưu tiên số học viên; "Tên" bỏ danh xưng Cô/Thầy. */
const bareName = sql`regexp_replace(${teachers.name}, '^(Cô|Thầy)\\s+', '')`;

export default async function teacherRoutes(app: FastifyInstance) {
  /* ---------------------------- Public ---------------------------- */
  const live = eq(teachers.status, "published");

  app.get("/api/public/teachers", async (req) => {
    const q = parse(
      listQuery.extend({
        filter: z.string().optional(),
        sort: z.enum(["popular", "rating", "experience", "name"]).default("popular"),
        pageSize: z.coerce.number().int().min(1).max(60).default(6),
      }),
      req.query,
    );
    const where = allOf(
      live,
      q.filter ? CHIP[q.filter] : undefined,
      vnSearch(q.q, [teachers.name, skillsText, teachers.bio, teachers.badge]),
    );
    const order =
      q.sort === "rating"
        ? [desc(teachers.rating), desc(teachers.reviewCount)]
        : q.sort === "experience"
          ? [desc(teachers.yearsExp)]
          : q.sort === "name"
            ? [sql`${bareName} asc`]
            : [desc(teachers.studentCount), desc(teachers.rating)];
    const { limit, offset } = pageOf(q);
    const [items, [{ total }], [{ all }]] = await Promise.all([
      db.select(publicCols).from(teachers).where(where).orderBy(...order, asc(teachers.order)).limit(limit).offset(offset),
      db.select({ total: countAll }).from(teachers).where(where),
      db.select({ all: countAll }).from(teachers).where(live),
    ]);
    return { items, total, all, page: q.page, pageSize: q.pageSize };
  });

  app.get("/api/public/teachers/featured", async (req) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(12).default(1) }), req.query);
    const rows = await db
      .select(fullCols)
      .from(teachers)
      .where(live)
      .orderBy(desc(teachers.featured), asc(teachers.order))
      .limit(limit);
    return { items: rows };
  });

  app.get<{ Params: { slug: string } }>("/api/public/teachers/:slug", async (req) => {
    const [t] = await db.select(fullCols).from(teachers).where(and(eq(teachers.slug, req.params.slug), live));
    if (!t) throw notFound("Không tìm thấy giáo viên");
    const [teacherCourses, teacherReviews] = await Promise.all([
      db
        .select({
          id: courses.id,
          slug: courses.slug,
          title: courses.title,
          level: courses.level,
          coverUrl: courses.coverUrl,
          rating: courses.rating,
          studentCount: courses.studentCount,
        })
        .from(courses)
        .where(and(eq(courses.teacherId, t.id), eq(courses.status, "published")))
        .orderBy(asc(courses.order)),
      db
        .select({ id: reviews.id, authorName: reviews.authorName, authorRole: reviews.authorRole, rating: reviews.rating, content: reviews.content, createdAt: reviews.createdAt, avatarUrl: users.avatarUrl })
        .from(reviews)
        .leftJoin(users, eq(users.id, reviews.userId))
        .where(and(eq(reviews.teacherId, t.id), eq(reviews.status, "approved")))
        .orderBy(desc(reviews.featured), desc(reviews.createdAt))
        .limit(6),
    ]);
    return { ...t, courses: teacherCourses, reviews: teacherReviews };
  });

  /* Yêu thích giáo viên (bookmarks targetType "teacher") */
  app.get("/api/me/teacher-favorites", async (req) => {
    const u = await optionalUser(req);
    if (!u) return { ids: [] };
    const rows = await db
      .select({ id: bookmarks.targetId })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, u.id), eq(bookmarks.targetType, "teacher")));
    return { ids: rows.map((r) => r.id) };
  });

  app.post<{ Params: { id: string } }>("/api/me/teacher-favorites/:id", async (req) => {
    const u = await requireUser(req);
    const [t] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, req.params.id));
    if (!t) throw notFound("Không tìm thấy giáo viên");
    await db.insert(bookmarks).values({ userId: u.id, targetType: "teacher", targetId: t.id }).onConflictDoNothing();
    return { ok: true, favorite: true };
  });

  app.delete<{ Params: { id: string } }>("/api/me/teacher-favorites/:id", async (req) => {
    const u = await requireUser(req);
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, u.id), eq(bookmarks.targetType, "teacher"), eq(bookmarks.targetId, req.params.id)));
    return { ok: true, favorite: false };
  });

  /** Đặt lịch học thử → tạo ticket category "trial". */
  app.post("/api/public/trial-requests", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const u = await optionalUser(req);
    const d = parse(
      z.object({
        teacherId: z.string().optional().nullable(),
        name: z.string().trim().min(2, "Nhập họ tên"),
        phone: z.string().trim().regex(/^[0-9+ .-]{8,15}$/, "Số điện thoại không hợp lệ"),
        email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
        time: z.string().trim().max(120).optional(),
        note: z.string().trim().max(1000).optional(),
      }),
      req.body,
    );
    const [t] = d.teacherId ? await db.select({ name: teachers.name }).from(teachers).where(eq(teachers.id, d.teacherId)) : [];
    const code = `TR${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
    const message = [
      `Họ tên: ${d.name}`,
      `Điện thoại: ${d.phone}`,
      d.email ? `Email: ${d.email}` : null,
      t ? `Giáo viên: ${t.name}` : null,
      d.time ? `Thời gian mong muốn: ${d.time}` : null,
      d.note ? `Ghi chú: ${d.note}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const [row] = await db
      .insert(tickets)
      .values({ code, userId: u?.id ?? null, subject: `Đặt lịch học thử${t ? ` với ${t.name}` : ""}`, message, category: "trial", priority: "normal" })
      .returning({ id: tickets.id, code: tickets.code });
    return reply.code(201).send(row);
  });

  /* ----------------------------- Admin ----------------------------- */
  const read = requirePerm("teachers.read");
  const write = requirePerm("teachers.write");

  const adminCols = {
    ...fullCols,
    userId: teachers.userId,
    status: teachers.status,
    order: teachers.order,
    createdAt: teachers.createdAt,
    userEmail: users.email,
    enrolled: enrolledExpr,
    realCompletion: completionExpr,
    realRating: ratingExpr,
    approvedReviews: reviewsExpr,
    courseCount: coursesExpr,
  };

  app.get("/api/admin/teachers", { preHandler: read }, async (req) => {
    const q = parse(listQuery.extend({ status: z.string().optional(), featured: z.string().optional(), filter: z.string().optional() }), req.query);
    const where = allOf(
      q.status ? eq(teachers.status, q.status as "published") : undefined,
      q.featured === "1" ? eq(teachers.featured, true) : undefined,
      q.filter ? CHIP[q.filter] : undefined,
      vnSearch(q.q, [teachers.name, teachers.slug, skillsText]),
    );
    const sortCols: Record<string, unknown> = {
      name: bareName,
      order: teachers.order,
      rating: teachers.rating,
      studentCount: teachers.studentCount,
      completionRate: teachers.completionRate,
      yearsExp: teachers.yearsExp,
      createdAt: teachers.createdAt,
    };
    const col = (sortCols[q.sort ?? ""] ?? teachers.order) as SQL;
    const dir = q.sort ? q.order : "asc";
    const { limit, offset } = pageOf(q);
    const [items, [{ total }], [summary]] = await Promise.all([
      db
        .select(adminCols)
        .from(teachers)
        .leftJoin(users, eq(users.id, teachers.userId))
        .where(where)
        .orderBy(dir === "asc" ? sql`${col} asc` : sql`${col} desc`, asc(teachers.name))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(teachers).where(where),
      db
        .select({
          total: countAll,
          published: sql<number>`count(*) filter (where ${teachers.status} = 'published')::int`,
          native: sql<number>`count(*) filter (where ${teachers.native})::int`,
          featured: sql<number>`count(*) filter (where ${teachers.featured})::int`,
          avgRating: sql<number>`coalesce(round(avg(${teachers.rating})::numeric, 2), 0)::float`,
          students: sql<number>`coalesce(sum(${teachers.studentCount}), 0)::int`,
          avgCompletion: sql<number>`coalesce(round(avg(${teachers.completionRate})), 0)::int`,
        })
        .from(teachers),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize, summary };
  });

  /** "Hiệu suất giáo viên" (dashboard): xếp hạng theo học viên, tỉ lệ hoàn thành, đánh giá. */
  app.get("/api/admin/teachers/performance", { preHandler: requirePerm("dashboard.read") }, async (req) => {
    const q = parse(
      z.object({ limit: z.coerce.number().int().min(1).max(50).default(5), by: z.enum(["students", "completion", "rating"]).default("students") }),
      req.query,
    );
    const rows = await db
      .select({
        id: teachers.id,
        slug: teachers.slug,
        name: teachers.name,
        avatarUrl: teachers.avatarUrl,
        avatarSeed: teachers.avatarSeed,
        avatarBg: teachers.avatarBg,
        studentCount: teachers.studentCount,
        completionRate: teachers.completionRate,
        rating: teachers.rating,
        reviewCount: teachers.reviewCount,
        enrolled: enrolledExpr,
        realCompletion: completionExpr,
        realRating: ratingExpr,
        approvedReviews: reviewsExpr,
      })
      .from(teachers)
      // join để drizzle luôn ghi rõ "teachers"."id" trong subquery tương quan
      .leftJoin(users, eq(users.id, teachers.userId))
      .where(eq(teachers.status, "published"));
    const items = rows
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        avatarUrl: r.avatarUrl,
        avatarSeed: r.avatarSeed,
        avatarBg: r.avatarBg,
        // Số liệu hồ sơ (tổng tích luỹ, có thể chỉnh ở admin) + dữ liệu thật trên nền tảng.
        students: Math.max(r.studentCount, r.enrolled ?? 0),
        enrolled: r.enrolled ?? 0,
        completionRate: r.realCompletion ?? r.completionRate,
        // Điểm thật chỉ dùng khi đủ mẫu (≥ 5 đánh giá đã duyệt), tránh nhiễu.
        rating: r.realRating != null && r.approvedReviews >= 5 ? r.realRating : r.rating,
        reviewCount: r.reviewCount,
      }))
      .sort((a, b) =>
        q.by === "completion" ? b.completionRate - a.completionRate : q.by === "rating" ? b.rating - a.rating || b.students - a.students : b.students - a.students,
      )
      .slice(0, q.limit)
      .map((r, i) => ({ rank: i + 1, ...r }));
    return { items };
  });

  app.get<{ Params: { id: string } }>("/api/admin/teachers/:id", { preHandler: read }, async (req) => {
    const [row] = await db.select(adminCols).from(teachers).leftJoin(users, eq(users.id, teachers.userId)).where(eq(teachers.id, req.params.id));
    if (!row) throw notFound("Không tìm thấy giáo viên");
    return row;
  });

  /** Tài khoản có thể liên kết (nhân sự/giáo viên). */
  app.get("/api/admin/teachers-accounts", { preHandler: read }, async () => {
    return db
      .select({ value: users.id, label: sql<string>`${users.name} || ' · ' || ${users.email}` })
      .from(users)
      .where(inArray(users.role, ["teacher", "staff", "admin"]))
      .orderBy(users.name);
  });

  const prepare = async (d: Partial<z.infer<typeof teacherBody>>, id?: string) => {
    const data: Record<string, unknown> = { ...d };
    if (d.slug !== undefined || (!id && d.name)) {
      const base = d.slug?.trim() || d.name;
      if (base) data.slug = await uniqueSlug(base, id);
      else delete data.slug;
    }
    if (data.userId === "") data.userId = null;
    if (!id && !d.avatarSeed && d.name) data.avatarSeed = slugify(d.name);
    return data;
  };

  app.post("/api/admin/teachers", { preHandler: write }, async (req, reply) => {
    const d = parse(teacherBody, req.body);
    const data = await prepare(d);
    if (data.order === undefined) {
      const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${teachers.order}), -1)::int` }).from(teachers);
      data.order = max + 1;
    }
    const [row] = await db.insert(teachers).values(data as typeof teachers.$inferInsert).returning();
    await logActivity(req, "create", "teacher", row.id, `Thêm giáo viên ${row.name}`);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/teachers/:id", { preHandler: write }, async (req) => {
    const d = parse(teacherBody.partial(), req.body);
    const data = await prepare(d, req.params.id);
    if (!Object.keys(data).length) throw badRequest("Không có dữ liệu cập nhật");
    const [row] = await db.update(teachers).set(data).where(eq(teachers.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy giáo viên");
    await logActivity(req, "update", "teacher", row.id, `Cập nhật giáo viên ${row.name}`);
    return row;
  });

  /** Sắp xếp lại thứ tự hiển thị: body { ids: [...] } theo thứ tự mới. */
  app.post("/api/admin/teachers/reorder", { preHandler: write }, async (req) => {
    const { ids } = parse(z.object({ ids: z.array(z.string()).min(1) }), req.body);
    await db.transaction(async (tx) => {
      for (const [i, id] of ids.entries()) await tx.update(teachers).set({ order: i }).where(eq(teachers.id, id));
    });
    await logActivity(req, "update", "teacher", null, `Sắp xếp lại thứ tự ${ids.length} giáo viên`);
    return { ok: true };
  });

  /** Đồng bộ điểm đánh giá / số đánh giá / tỉ lệ hoàn thành từ dữ liệu thật (nếu có). */
  app.post<{ Params: { id: string } }>("/api/admin/teachers/:id/sync-stats", { preHandler: write }, async (req) => {
    const [r] = await db
      .select({ name: teachers.name, enrolled: enrolledExpr, realCompletion: completionExpr, realRating: ratingExpr, approvedReviews: reviewsExpr })
      .from(teachers)
      .leftJoin(users, eq(users.id, teachers.userId))
      .where(eq(teachers.id, req.params.id));
    if (!r) throw notFound("Không tìm thấy giáo viên");
    const set: Partial<typeof teachers.$inferInsert> = {};
    if (r.realRating != null) set.rating = r.realRating;
    if (r.realCompletion != null) set.completionRate = r.realCompletion;
    if (!Object.keys(set).length) throw badRequest("Chưa có dữ liệu đánh giá/tiến độ để đồng bộ");
    const [row] = await db.update(teachers).set(set).where(eq(teachers.id, req.params.id)).returning();
    await logActivity(req, "update", "teacher", req.params.id, `Đồng bộ chỉ số giáo viên ${r.name}`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/teachers/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(teachers).where(eq(teachers.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy giáo viên");
    await logActivity(req, "delete", "teacher", row.id, `Xoá giáo viên ${row.name}`);
    return reply.code(204).send();
  });
}
