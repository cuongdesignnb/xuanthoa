import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { allOf, countAll, listQuery, notFound, pageOf, parse, badRequest } from "../lib/http.js";
import { logActivity, requirePerm, requireUser } from "../lib/auth.js";
import { vnSearch } from "../lib/vn.js";

const { reviews, reports, comments, users, teachers, courses, lessons, questions, quizzes, posts } = schema;

const publicReviewCols = {
  id: reviews.id,
  authorName: reviews.authorName,
  authorRole: reviews.authorRole,
  rating: reviews.rating,
  content: reviews.content,
  featured: reviews.featured,
  createdAt: reviews.createdAt,
  avatarUrl: users.avatarUrl,
  teacherId: reviews.teacherId,
  teacherName: teachers.name,
  teacherSlug: teachers.slug,
  courseId: reviews.courseId,
  courseTitle: courses.title,
  courseSlug: courses.slug,
};

/** Truy vấn đánh giá đã duyệt dùng chung cho trang chủ / giáo viên / khóa học. */
export async function publicReviews(opts: { featured?: boolean; teacher?: string; course?: string; limit?: number }) {
  const conds: (SQL | undefined)[] = [eq(reviews.status, "approved")];
  if (opts.featured) conds.push(eq(reviews.featured, true));
  if (opts.teacher === "any") conds.push(isNotNull(reviews.teacherId));
  else if (opts.teacher === "none") conds.push(isNull(reviews.teacherId));
  else if (opts.teacher) conds.push(or(eq(teachers.slug, opts.teacher), eq(reviews.teacherId, opts.teacher)));
  if (opts.course) conds.push(or(eq(courses.slug, opts.course), eq(reviews.courseId, opts.course)));
  return db
    .select(publicReviewCols)
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.userId))
    .leftJoin(teachers, eq(teachers.id, reviews.teacherId))
    .leftJoin(courses, eq(courses.id, reviews.courseId))
    .where(and(...conds))
    .orderBy(desc(reviews.featured), desc(reviews.createdAt))
    .limit(opts.limit ?? 12);
}

const REPORT_TYPES = ["lesson", "question", "post", "video", "other"] as const;

export default async function moderationRoutes(app: FastifyInstance) {
  /* ---------------------------- Public ---------------------------- */

  app.get("/api/public/reviews", async (req) => {
    const q = parse(
      z.object({
        featured: z.string().optional(),
        teacher: z.string().optional(),
        course: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(50).default(12),
      }),
      req.query,
    );
    const items = await publicReviews({ featured: q.featured === "1" || q.featured === "true", teacher: q.teacher, course: q.course, limit: q.limit });
    return { items };
  });

  app.post("/api/me/reviews", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const u = await requireUser(req);
    const d = parse(
      z
        .object({
          courseId: z.string().optional().nullable(),
          teacherId: z.string().optional().nullable(),
          rating: z.coerce.number().int().min(1, "Chọn số sao").max(5),
          content: z.string().trim().min(10, "Nội dung tối thiểu 10 ký tự").max(2000),
        })
        .refine((v) => v.courseId || v.teacherId, { message: "Chọn khóa học hoặc giáo viên", path: ["courseId"] }),
      req.body,
    );
    const [me] = await db.select({ name: users.name, level: users.level }).from(users).where(eq(users.id, u.id));
    let role = me?.level ? `Học viên trình độ ${me.level}` : "Học viên Nihongo+";
    if (d.courseId) {
      const [c] = await db.select({ title: courses.title, teacherId: courses.teacherId }).from(courses).where(eq(courses.id, d.courseId));
      if (!c) throw badRequest("Khóa học không tồn tại");
      role = `Học viên khóa ${c.title}`;
      d.teacherId ??= c.teacherId;
    }
    const [row] = await db
      .insert(reviews)
      .values({ userId: u.id, authorName: me?.name ?? u.name, authorRole: role, courseId: d.courseId ?? null, teacherId: d.teacherId ?? null, rating: d.rating, content: d.content, status: "pending" })
      .returning();
    return reply.code(201).send({ id: row.id, status: row.status, message: "Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi được duyệt." });
  });

  app.post("/api/me/reports", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const u = await requireUser(req);
    const d = parse(
      z.object({
        targetType: z.enum(REPORT_TYPES),
        targetId: z.string().optional().nullable(),
        targetTitle: z.string().trim().max(300).optional().nullable(),
        content: z.string().trim().min(5, "Mô tả lỗi tối thiểu 5 ký tự").max(2000),
      }),
      req.body,
    );
    let title = d.targetTitle ?? null;
    if (!title && d.targetId) {
      if (d.targetType === "lesson") title = (await db.select({ t: lessons.title }).from(lessons).where(eq(lessons.id, d.targetId)))[0]?.t ?? null;
      if (d.targetType === "post") title = (await db.select({ t: posts.title }).from(posts).where(eq(posts.id, d.targetId)))[0]?.t ?? null;
      if (d.targetType === "question") {
        const [x] = await db.select({ t: quizzes.title, o: questions.order }).from(questions).innerJoin(quizzes, eq(quizzes.id, questions.quizId)).where(eq(questions.id, d.targetId));
        if (x) title = `${x.t} · Câu ${x.o + 1}`;
      }
    }
    const [row] = await db.insert(reports).values({ userId: u.id, targetType: d.targetType, targetId: d.targetId ?? null, targetTitle: title, content: d.content }).returning();
    return reply.code(201).send({ id: row.id, message: "Đã gửi báo lỗi. Cảm ơn bạn đã giúp Nihongo+ tốt hơn!" });
  });

  /* ----------------------------- Admin ----------------------------- */
  const read = requirePerm("moderation.read");
  const write = requirePerm("moderation.write");

  app.get("/api/admin/moderation/summary", { preHandler: read }, async () => {
    const [r] = await db.execute<{
      reviews_pending: number;
      reviews_total: number;
      reviews_avg: number | null;
      reviews_featured: number;
      reports_open: number;
      reports_pending: number;
      reports_total: number;
      comments_pending: number;
      comments_hidden: number;
      comments_total: number;
    }>(sql`
      select
        (select count(*)::int from ${reviews} where status = 'pending') as reviews_pending,
        (select count(*)::int from ${reviews}) as reviews_total,
        (select round(avg(rating)::numeric, 2)::float from ${reviews} where status = 'approved') as reviews_avg,
        (select count(*)::int from ${reviews} where featured) as reviews_featured,
        (select count(*)::int from ${reports} where status = 'open') as reports_open,
        (select count(*)::int from ${reports} where status = 'pending') as reports_pending,
        (select count(*)::int from ${reports}) as reports_total,
        (select count(*)::int from ${comments} where status = 'pending') as comments_pending,
        (select count(*)::int from ${comments} where status = 'hidden') as comments_hidden,
        (select count(*)::int from ${comments}) as comments_total
    `);
    const dist = await db.select({ rating: reviews.rating, count: countAll }).from(reviews).groupBy(reviews.rating);
    return { ...r, ratingDist: [5, 4, 3, 2, 1].map((s) => ({ rating: s, count: dist.find((x) => x.rating === s)?.count ?? 0 })) };
  });

  /* Đánh giá */
  app.get("/api/admin/moderation/reviews", { preHandler: read }, async (req) => {
    const q = parse(listQuery.extend({ status: z.string().optional(), rating: z.coerce.number().int().optional(), featured: z.string().optional(), target: z.string().optional() }), req.query);
    const where = allOf(
      q.status ? eq(reviews.status, q.status as "pending") : undefined,
      q.rating ? eq(reviews.rating, q.rating) : undefined,
      q.featured === "1" ? eq(reviews.featured, true) : undefined,
      q.target === "teacher" ? isNotNull(reviews.teacherId) : q.target === "course" ? isNotNull(reviews.courseId) : q.target === "site" ? and(isNull(reviews.teacherId), isNull(reviews.courseId)) : undefined,
      vnSearch(q.q, [reviews.authorName, reviews.content, teachers.name, courses.title]),
    );
    const { limit, offset } = pageOf(q);
    const sortCols = { rating: reviews.rating, createdAt: reviews.createdAt, authorName: reviews.authorName };
    const col = sortCols[(q.sort ?? "") as keyof typeof sortCols] ?? reviews.createdAt;
    const base = () =>
      db
        .select({ ...publicReviewCols, status: reviews.status, userId: reviews.userId, userEmail: users.email })
        .from(reviews)
        .leftJoin(users, eq(users.id, reviews.userId))
        .leftJoin(teachers, eq(teachers.id, reviews.teacherId))
        .leftJoin(courses, eq(courses.id, reviews.courseId));
    const [items, [{ total }]] = await Promise.all([
      base()
        .where(where)
        .orderBy(q.order === "asc" ? sql`${col} asc` : sql`${col} desc`, desc(reviews.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: countAll })
        .from(reviews)
        .leftJoin(teachers, eq(teachers.id, reviews.teacherId))
        .leftJoin(courses, eq(courses.id, reviews.courseId))
        .where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  const reviewPatch = z.object({ status: z.enum(["pending", "approved", "hidden"]).optional(), featured: z.boolean().optional() });

  app.patch<{ Params: { id: string } }>("/api/admin/moderation/reviews/:id", { preHandler: write }, async (req) => {
    const d = parse(reviewPatch, req.body);
    const set: Partial<typeof reviews.$inferInsert> = { ...d };
    if (d.featured) set.status = "approved";
    const [row] = await db.update(reviews).set(set).where(eq(reviews.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy đánh giá");
    const label = d.featured !== undefined ? (d.featured ? "Ghim nổi bật" : "Bỏ ghim") : d.status === "approved" ? "Duyệt" : d.status === "hidden" ? "Ẩn" : "Cập nhật";
    await logActivity(req, "update", "review", row.id, `${label} đánh giá của ${row.authorName}`);
    return row;
  });

  app.post("/api/admin/moderation/reviews/bulk", { preHandler: write }, async (req) => {
    const { ids, action } = parse(
      z.object({ ids: z.array(z.string()).min(1).max(200), action: z.enum(["approve", "hide", "feature", "unfeature", "delete"]) }),
      req.body,
    );
    const where = inArray(reviews.id, ids);
    let n = 0;
    if (action === "delete") n = (await db.delete(reviews).where(where).returning({ id: reviews.id })).length;
    else {
      const set =
        action === "approve"
          ? { status: "approved" as const }
          : action === "hide"
            ? { status: "hidden" as const, featured: false }
            : action === "feature"
              ? { featured: true, status: "approved" as const }
              : { featured: false };
      n = (await db.update(reviews).set(set).where(where).returning({ id: reviews.id })).length;
    }
    const LABEL = { approve: "Duyệt", hide: "Ẩn", feature: "Ghim nổi bật", unfeature: "Bỏ ghim", delete: "Xoá" };
    await logActivity(req, action === "delete" ? "delete" : "update", "review", null, `${LABEL[action]} ${n} đánh giá`);
    return { ok: true, count: n };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/moderation/reviews/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(reviews).where(eq(reviews.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy đánh giá");
    await logActivity(req, "delete", "review", row.id, `Xoá đánh giá của ${row.authorName}`);
    return reply.code(204).send();
  });

  /* Báo lỗi nội dung */
  app.get("/api/admin/moderation/reports", { preHandler: read }, async (req) => {
    const q = parse(listQuery.extend({ status: z.string().optional(), type: z.string().optional() }), req.query);
    const where = allOf(
      q.status === "unresolved" ? inArray(reports.status, ["open", "pending"]) : q.status ? eq(reports.status, q.status as "open") : undefined,
      q.type ? eq(reports.targetType, q.type) : undefined,
      vnSearch(q.q, [reports.content, reports.targetTitle, users.name]),
    );
    const { limit, offset } = pageOf(q);
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: reports.id,
          targetType: reports.targetType,
          targetId: reports.targetId,
          targetTitle: reports.targetTitle,
          content: reports.content,
          status: reports.status,
          resolution: reports.resolution,
          createdAt: reports.createdAt,
          userId: reports.userId,
          userName: users.name,
          userEmail: users.email,
          userAvatar: users.avatarUrl,
        })
        .from(reports)
        .leftJoin(users, eq(users.id, reports.userId))
        .where(where)
        .orderBy(sql`case ${reports.status} when 'open' then 0 when 'pending' then 1 else 2 end`, q.order === "asc" ? sql`${reports.createdAt} asc` : desc(reports.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(reports).leftJoin(users, eq(users.id, reports.userId)).where(where),
    ]);
    // Đường dẫn tới đối tượng bị báo lỗi (admin + trang học viên).
    const ids = (t: string) => rows.filter((r) => r.targetType === t && r.targetId).map((r) => r.targetId!);
    const [ls, qs, ps] = await Promise.all([
      ids("lesson").length ? db.select({ id: lessons.id, slug: lessons.slug }).from(lessons).where(inArray(lessons.id, ids("lesson"))) : [],
      ids("question").length
        ? db.select({ id: questions.id, quizId: quizzes.id, kind: quizzes.kind, slug: quizzes.slug }).from(questions).innerJoin(quizzes, eq(quizzes.id, questions.quizId)).where(inArray(questions.id, ids("question")))
        : [],
      ids("post").length ? db.select({ id: posts.id, slug: posts.slug }).from(posts).where(inArray(posts.id, ids("post"))) : [],
    ]);
    const items = rows.map((r) => {
      let adminHref: string | null = null;
      let siteHref: string | null = null;
      const l = ls.find((x) => x.id === r.targetId);
      const qq = qs.find((x) => x.id === r.targetId);
      const p = ps.find((x) => x.id === r.targetId);
      if (l) (adminHref = `/admin/bai-hoc/${l.id}`), (siteHref = `/hoc/${l.slug}`);
      if (qq) (adminHref = `/admin/${qq.kind === "jlpt" ? "de-thi" : "bai-tap"}/${qq.quizId}`), (siteHref = `/bai-tap/${qq.slug}`);
      if (p) (adminHref = `/admin/blog/${p.id}`), (siteHref = `/blog/${p.slug}`);
      return { ...r, adminHref, siteHref };
    });
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  app.patch<{ Params: { id: string } }>("/api/admin/moderation/reports/:id", { preHandler: write }, async (req) => {
    const d = parse(
      z.object({ status: z.enum(["open", "pending", "resolved", "closed"]).optional(), resolution: z.string().trim().max(2000).optional().nullable() }),
      req.body,
    );
    if (d.status === "resolved" && !d.resolution?.trim()) {
      const [cur] = await db.select({ r: reports.resolution }).from(reports).where(eq(reports.id, req.params.id));
      if (!cur?.r) throw badRequest("Dữ liệu không hợp lệ", [{ path: "resolution", message: "Nhập ghi chú xử lý" }]);
    }
    const [row] = await db.update(reports).set(d).where(eq(reports.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy báo lỗi");
    await logActivity(req, "update", "report", row.id, `${d.status === "resolved" ? "Đã xử lý" : "Cập nhật"} báo lỗi: ${row.targetTitle ?? row.targetType}`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/moderation/reports/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(reports).where(eq(reports.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy báo lỗi");
    await logActivity(req, "delete", "report", row.id, `Xoá báo lỗi: ${row.targetTitle ?? row.targetType}`);
    return reply.code(204).send();
  });

  /* Bình luận bài học */
  app.get("/api/admin/moderation/comments", { preHandler: read }, async (req) => {
    const q = parse(listQuery.extend({ status: z.string().optional(), lesson: z.string().optional() }), req.query);
    const where = allOf(
      q.status ? eq(comments.status, q.status as "pending") : undefined,
      q.lesson ? eq(comments.lessonId, q.lesson) : undefined,
      vnSearch(q.q, [comments.content, users.name, lessons.title]),
    );
    const { limit, offset } = pageOf(q);
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: comments.id,
          content: comments.content,
          likes: comments.likes,
          status: comments.status,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
          userId: comments.userId,
          userName: users.name,
          userEmail: users.email,
          userAvatar: users.avatarUrl,
          userRole: users.role,
          lessonId: comments.lessonId,
          lessonTitle: lessons.title,
          lessonSlug: lessons.slug,
        })
        .from(comments)
        .innerJoin(users, eq(users.id, comments.userId))
        .innerJoin(lessons, eq(lessons.id, comments.lessonId))
        .where(where)
        .orderBy(q.sort === "likes" ? desc(comments.likes) : q.order === "asc" ? sql`${comments.createdAt} asc` : desc(comments.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: countAll })
        .from(comments)
        .innerJoin(users, eq(users.id, comments.userId))
        .innerJoin(lessons, eq(lessons.id, comments.lessonId))
        .where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  app.patch<{ Params: { id: string } }>("/api/admin/moderation/comments/:id", { preHandler: write }, async (req) => {
    const d = parse(z.object({ status: z.enum(["pending", "approved", "hidden"]) }), req.body);
    const [row] = await db.update(comments).set(d).where(eq(comments.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bình luận");
    await logActivity(req, "update", "comment", row.id, `${d.status === "approved" ? "Duyệt" : d.status === "hidden" ? "Ẩn" : "Đặt chờ duyệt"} bình luận`);
    return row;
  });

  app.post("/api/admin/moderation/comments/bulk", { preHandler: write }, async (req) => {
    const { ids, action } = parse(z.object({ ids: z.array(z.string()).min(1).max(200), action: z.enum(["approve", "hide", "delete"]) }), req.body);
    const where = inArray(comments.id, ids);
    const n =
      action === "delete"
        ? (await db.delete(comments).where(where).returning({ id: comments.id })).length
        : (await db.update(comments).set({ status: action === "approve" ? "approved" : "hidden" }).where(where).returning({ id: comments.id })).length;
    await logActivity(req, action === "delete" ? "delete" : "update", "comment", null, `${{ approve: "Duyệt", hide: "Ẩn", delete: "Xoá" }[action]} ${n} bình luận`);
    return { ok: true, count: n };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/moderation/comments/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(comments).where(eq(comments.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bình luận");
    await logActivity(req, "delete", "comment", row.id, `Xoá bình luận`);
    return reply.code(204).send();
  });
}
