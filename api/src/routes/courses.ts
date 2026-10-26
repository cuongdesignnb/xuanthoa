import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { HttpError, notFound, parse, searchWhere } from "../lib/http.js";
import { optionalUser, requireUser } from "../lib/auth.js";
import { courseProgress, enrollUser, isEnrolled } from "../lib/enroll.js";

const c = schema.courses;
const t = schema.teachers;

/* ------------------------------------------------------------------ */
/* Hằng số bộ lọc                                                      */
/* ------------------------------------------------------------------ */

export const LEVEL_LABELS: Record<string, string> = {
  N5: "N5 (Người mới bắt đầu)",
  N4: "N4 (Sơ cấp)",
  N3: "N3 (Trung cấp)",
  N2: "N2 (Nâng cao)",
  N1: "N1 (Chuyên sâu)",
};

export const DURATION_BUCKETS = [
  { value: "u10", label: "Dưới 10 giờ", min: 0, max: 10 },
  { value: "10-30", label: "10 - 30 giờ", min: 10, max: 30 },
  { value: "30-60", label: "30 - 60 giờ", min: 30, max: 60 },
  { value: "o60", label: "Trên 60 giờ", min: 60, max: 100000 },
] as const;

/** Tab danh mục ở trang /khoa-hoc lọc theo tag. */
export const TAG_TABS = ["JLPT", "Giao tiếp", "Kanji"];

/* ------------------------------------------------------------------ */
/* Truy vấn dùng chung                                                 */
/* ------------------------------------------------------------------ */

export const lessonsCountSql = sql<number>`(
  select count(*)::int from ${schema.lessons} l join ${schema.modules} m on m.id = l.module_id
  where m.course_id = ${c.id} and l.status = 'published'
)`;

export const courseSummaryCols = {
  id: c.id,
  slug: c.slug,
  title: c.title,
  subtitle: c.subtitle,
  level: c.level,
  category: c.category,
  goals: c.goals,
  outcomes: c.outcomes,
  tags: c.tags,
  format: c.format,
  formats: c.formats,
  coverUrl: c.coverUrl,
  coverStyle: c.coverStyle,
  badge: c.badge,
  price: c.price,
  salePrice: c.salePrice,
  saleEndsAt: c.saleEndsAt,
  durationHours: c.durationHours,
  weeks: c.weeks,
  rating: c.rating,
  ratingCount: c.ratingCount,
  studentCount: c.studentCount,
  featured: c.featured,
  createdAt: c.createdAt,
  lessonsCount: lessonsCountSql,
  firstLessonSlug: sql<string | null>`(
    select l.slug from ${schema.lessons} l join ${schema.modules} m on m.id = l.module_id
    where m.course_id = ${c.id} and l.status = 'published'
    order by l.is_free desc, m."order", l."order" limit 1
  )`,
  teacher: sql<{
    id: string;
    slug: string;
    name: string;
    avatarUrl: string | null;
    avatarSeed: string | null;
    avatarBg: string | null;
  } | null>`case when ${t.id} is null then null else json_build_object(
    'id', ${t.id}, 'slug', ${t.slug}, 'name', ${t.name}, 'avatarUrl', ${t.avatarUrl},
    'avatarSeed', ${t.avatarSeed}, 'avatarBg', ${t.avatarBg}) end`,
};

/** Giá đang áp dụng (giá khuyến mãi nếu còn hạn). */
export function effectivePrice(row: { price: number; salePrice: number | null; saleEndsAt: Date | string | null }) {
  if (row.salePrice == null) return row.price;
  if (row.saleEndsAt && new Date(row.saleEndsAt).getTime() < Date.now()) return row.price;
  return row.salePrice;
}

const multi = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v == null ? [] : (Array.isArray(v) ? v : v.split(",")).map((x) => x.trim()).filter(Boolean)));

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  q: z.string().trim().optional(),
  level: multi,
  category: z.string().optional(),
  tag: z.string().optional(),
  goal: multi,
  duration: multi,
  format: multi,
  teacher: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(["popular", "new", "newest", "rating", "price", "lessons", "order"]).default("order"),
});

function filterWhere(q: z.infer<typeof listSchema>, skip?: "level" | "goal" | "duration" | "format") {
  const conds: (SQL | undefined)[] = [eq(c.status, "published")];
  if (q.q) conds.push(searchWhere(q.q, [c.title, c.subtitle]));
  if (q.category) conds.push(eq(c.category, q.category));
  if (q.tag) {
    if (/^N[1-5]$/.test(q.tag)) conds.push(eq(c.level, q.tag as "N5"));
    else conds.push(sql`${q.tag} = any(${c.tags})`);
  }
  if (q.teacher) conds.push(sql`${t.slug} = ${q.teacher}`);
  if (q.featured) conds.push(eq(c.featured, true));
  if (skip !== "level" && q.level.length) conds.push(inArray(c.level, q.level as ("N5" | "N4")[]));
  if (skip !== "goal" && q.goal.length) conds.push(sql`${c.goals} && ${arr(q.goal)}`);
  if (skip !== "format" && q.format.length) conds.push(sql`${c.formats} && ${arr(q.format)}`);
  if (skip !== "duration" && q.duration.length) {
    const parts = DURATION_BUCKETS.filter((b) => q.duration.includes(b.value)).map((b) =>
      and(gte(c.durationHours, b.min), lt(c.durationHours, b.max)),
    );
    if (parts.length) conds.push(sql`(${sql.join(parts as SQL[], sql` or `)})`);
  }
  return and(...(conds.filter(Boolean) as SQL[]));
}

/** Mảng text[] tham số hoá an toàn. */
const arr = (values: string[]) => sql`array[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]::text[]`;

/* ------------------------------------------------------------------ */

export default async function courseRoutes(app: FastifyInstance) {
  /** Danh sách khóa học công khai. */
  app.get("/api/public/courses", async (req) => {
    const q = parse(listSchema, req.query);
    const where = filterWhere(q);
    const order = {
      order: [asc(c.order), desc(c.studentCount)],
      popular: [desc(c.studentCount)],
      new: [desc(c.createdAt)],
      newest: [desc(c.createdAt)],
      rating: [desc(c.rating), desc(c.ratingCount)],
      price: [asc(sql`coalesce(${c.salePrice}, ${c.price})`)],
      lessons: [desc(lessonsCountSql)],
    }[q.sort];
    const [items, [{ total }]] = await Promise.all([
      db
        .select(courseSummaryCols)
        .from(c)
        .leftJoin(t, eq(t.id, c.teacherId))
        .where(where)
        .orderBy(...order)
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(c).leftJoin(t, eq(t.id, c.teacherId)).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  /** Số lượng cho tab + nhóm bộ lọc (đếm thật từ DB, có xét các bộ lọc khác đang chọn). */
  app.get("/api/public/courses/categories", async (req) => {
    const q = parse(listSchema, req.query);
    const base = eq(c.status, "published");

    const count = async (where: SQL | undefined, expr: SQL, unnest = false) => {
      const rows = await db.execute<{ k: string; n: number }>(
        unnest
          ? sql`select k, count(*)::int as n from (select unnest(${expr}) as k from ${c} left join ${t} on ${t.id} = ${c.teacherId} where ${where}) s group by k`
          : sql`select ${expr} as k, count(*)::int as n from ${c} left join ${t} on ${t.id} = ${c.teacherId} where ${where} group by 1`,
      );
      return Object.fromEntries(rows.map((r) => [r.k, r.n])) as Record<string, number>;
    };

    const bucketExpr = sql.raw(
      `case ${DURATION_BUCKETS.map((b) => `when duration_hours >= ${b.min} and duration_hours < ${b.max} then '${b.value}'`).join(" ")} end`,
    );

    const [levelsAll, tagsAll, goalsAll, fmtAll, totalAll, lv, goals, dur, fmt] = await Promise.all([
      count(base, sql`${c.level}`),
      count(base, sql`${c.tags}`, true),
      count(base, sql`${c.goals}`, true),
      count(base, sql`${c.formats}`, true),
      db.select({ n: sql<number>`count(*)::int` }).from(c).where(base),
      count(filterWhere(q, "level"), sql`${c.level}`),
      count(filterWhere(q, "goal"), sql`${c.goals}`, true),
      count(filterWhere(q, "duration"), bucketExpr),
      count(filterWhere(q, "format"), sql`${c.formats}`, true),
    ]);

    const sortedKeys = (o: Record<string, number>) => Object.keys(o).sort((a, b) => o[b] - o[a] || a.localeCompare(b));

    return {
      total: totalAll[0].n,
      tabs: [
        { id: "all", count: totalAll[0].n },
        ...["N5", "N4", "N3", "N2", "N1"].map((l) => ({ id: l, count: levelsAll[l] ?? 0 })),
        ...TAG_TABS.map((tag) => ({ id: tag, count: tagsAll[tag] ?? 0 })),
      ],
      groups: [
        {
          key: "level",
          title: "Trình độ",
          options: Object.entries(LEVEL_LABELS).map(([value, label]) => ({ value, label, count: lv[value] ?? 0 })),
        },
        {
          key: "goal",
          title: "Mục tiêu học",
          options: sortedKeys(goalsAll).map((g) => ({ value: g, label: g, count: goals[g] ?? 0 })),
        },
        {
          key: "duration",
          title: "Thời lượng khóa học",
          options: DURATION_BUCKETS.map((b) => ({ value: b.value, label: b.label, count: dur[b.value] ?? 0 })),
        },
        {
          key: "format",
          title: "Hình thức học",
          options: sortedKeys(fmtAll).map((f) => ({ value: f, label: f, count: fmt[f] ?? 0 })),
        },
      ],
    };
  });

  /** Lộ trình đề xuất (N5 → N1) — cấu hình ở settings.roadmap, gắn khóa cấp độ tương ứng. */
  app.get("/api/public/roadmap", async () => {
    const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, "roadmap"));
    const cfg = (row?.value ?? {}) as { steps?: { level: string; title: string; duration: string }[] };
    const levelCourses = await db
      .select({ slug: c.slug, title: c.title, level: c.level })
      .from(c)
      .where(and(eq(c.status, "published"), eq(c.category, "level")))
      .orderBy(asc(c.order));
    const byLevel = new Map<string, { slug: string; title: string }>();
    for (const lc of levelCourses) if (lc.level && !byLevel.has(lc.level)) byLevel.set(lc.level, { slug: lc.slug, title: lc.title });
    const steps = (cfg.steps ?? []).map((s) => ({ ...s, course: byLevel.get(s.level) ?? null }));
    return { steps, href: steps[0]?.course ? `/khoa-hoc/${steps[0].course.slug}#lo-trinh-hoc` : "/khoa-hoc" };
  });

  /** Chi tiết khóa học + chương trình + tiến độ người dùng hiện tại. */
  app.get<{ Params: { slug: string } }>("/api/public/courses/:slug", async (req) => {
    const user = await optionalUser(req);
    const isStaff = !!user && user.role !== "student";
    const [course] = await db
      .select({
        ...courseSummaryCols,
        description: c.description,
        status: c.status,
        teacher: sql<Record<string, unknown> | null>`case when ${t.id} is null then null else json_build_object(
          'id', ${t.id}, 'slug', ${t.slug}, 'name', ${t.name}, 'title', ${t.title}, 'avatarUrl', ${t.avatarUrl},
          'avatarSeed', ${t.avatarSeed}, 'avatarBg', ${t.avatarBg}, 'yearsExp', ${t.yearsExp}, 'skills', ${t.skills},
          'bio', ${t.bio}, 'badge', ${t.badge}, 'levelRange', ${t.levelRange}, 'rating', ${t.rating}) end`,
      })
      .from(c)
      .leftJoin(t, eq(t.id, c.teacherId))
      .where(eq(c.slug, req.params.slug));
    if (!course || (course.status !== "published" && !isStaff)) throw notFound("Không tìm thấy khóa học");

    const mods = await db.select().from(schema.modules).where(eq(schema.modules.courseId, course.id)).orderBy(asc(schema.modules.order));
    const lessonRows = mods.length
      ? await db
          .select({
            id: schema.lessons.id,
            moduleId: schema.lessons.moduleId,
            slug: schema.lessons.slug,
            title: schema.lessons.title,
            type: schema.lessons.type,
            durationSec: schema.lessons.durationSec,
            isFree: schema.lessons.isFree,
            hasDocs: schema.lessons.hasDocs,
            hasExercise: schema.lessons.hasExercise,
            hasVideo: sql<boolean>`${schema.lessons.videoId} is not null`,
            order: schema.lessons.order,
          })
          .from(schema.lessons)
          .where(and(inArray(schema.lessons.moduleId, mods.map((m) => m.id)), eq(schema.lessons.status, "published")))
          .orderBy(asc(schema.lessons.order))
      : [];

    const prog = new Map<string, { percent: number; completed: boolean }>();
    let enrolled = false;
    let lastSlug: string | null = null;
    if (user) {
      enrolled = await isEnrolled(user.id, course.id);
      if (lessonRows.length) {
        const ps = await db
          .select()
          .from(schema.lessonProgress)
          .where(and(eq(schema.lessonProgress.userId, user.id), inArray(schema.lessonProgress.lessonId, lessonRows.map((l) => l.id))))
          .orderBy(desc(schema.lessonProgress.updatedAt));
        for (const p of ps) prog.set(p.lessonId, { percent: p.percent, completed: !!p.completedAt });
        if (ps[0]) lastSlug = lessonRows.find((l) => l.id === ps[0].lessonId)?.slug ?? null;
      }
    }

    let n = 0;
    const modules = mods.map((m) => {
      const ls = lessonRows
        .filter((l) => l.moduleId === m.id)
        .map((l) => ({ ...l, number: ++n, percent: prog.get(l.id)?.percent ?? 0, completed: prog.get(l.id)?.completed ?? false }));
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        order: m.order,
        durationSec: ls.reduce((s, l) => s + l.durationSec, 0),
        completed: ls.filter((l) => l.completed).length,
        lessons: ls,
      };
    });
    const flat = modules.flatMap((m) => m.lessons);
    const completed = flat.filter((l) => l.completed).length;

    const [reviewStats] = await db
      .select({ avg: sql<number>`coalesce(avg(${schema.reviews.rating}), 0)::float`, count: sql<number>`count(*)::int` })
      .from(schema.reviews)
      .where(and(eq(schema.reviews.courseId, course.id), eq(schema.reviews.status, "approved")));
    const reviewItems = await db
      .select({
        id: schema.reviews.id,
        authorName: schema.reviews.authorName,
        authorRole: schema.reviews.authorRole,
        rating: schema.reviews.rating,
        content: schema.reviews.content,
        createdAt: schema.reviews.createdAt,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.reviews)
      .leftJoin(schema.users, eq(schema.users.id, schema.reviews.userId))
      .where(and(eq(schema.reviews.courseId, course.id), eq(schema.reviews.status, "approved")))
      .orderBy(desc(schema.reviews.featured), desc(schema.reviews.createdAt))
      .limit(6);

    const resources = await db
      .select({
        id: schema.resources.id,
        title: schema.resources.title,
        fileType: schema.resources.fileType,
        sizeBytes: schema.resources.sizeBytes,
        isFree: schema.resources.isFree,
        fileUrl: schema.resources.fileUrl,
      })
      .from(schema.resources)
      .where(eq(schema.resources.courseId, course.id))
      .orderBy(asc(schema.resources.createdAt));
    const canDownload = enrolled || isStaff;

    const { status: _s, ...rest } = course;
    void _s;
    const firstFree = flat.find((l) => l.isFree) ?? null;
    const next = flat.find((l) => !l.completed) ?? flat[0] ?? null;
    return {
      ...rest,
      effectivePrice: effectivePrice(course),
      totalDurationSec: flat.reduce((s, l) => s + l.durationSec, 0),
      modules,
      enrolled,
      canLearn: enrolled || isStaff,
      progress: user ? { completed, total: flat.length, percent: flat.length ? Math.round((completed / flat.length) * 100) : 0 } : null,
      firstFreeLesson: firstFree ? { slug: firstFree.slug, title: firstFree.title } : null,
      resumeLesson: lastSlug ? flat.find((l) => l.slug === lastSlug) && { slug: lastSlug } : next ? { slug: next.slug } : null,
      reviews: { avg: Math.round(reviewStats.avg * 10) / 10, count: reviewStats.count, items: reviewItems },
      resources: resources.map((r) => ({ ...r, fileUrl: canDownload || r.isFree ? r.fileUrl : null })),
    };
  });

  /* ---------------------------- Học viên ---------------------------- */

  /** Khóa học của tôi + tiến độ. */
  app.get("/api/me/courses", async (req) => {
    const u = await requireUser(req);
    const rows = await db
      .select({ ...courseSummaryCols, enrolledAt: schema.enrollments.createdAt })
      .from(schema.enrollments)
      .innerJoin(c, eq(c.id, schema.enrollments.courseId))
      .leftJoin(t, eq(t.id, c.teacherId))
      .where(and(eq(schema.enrollments.userId, u.id), eq(schema.enrollments.status, "active")))
      .orderBy(desc(schema.enrollments.createdAt));
    const progress = await courseProgress(u.id, rows.map((r) => r.id));
    const last = rows.length
      ? await db.execute<{ course_id: string; slug: string; title: string; updated_at: string }>(sql`
          select distinct on (m.course_id) m.course_id, l.slug, l.title, p.updated_at
          from ${schema.lessonProgress} p
          join ${schema.lessons} l on l.id = p.lesson_id
          join ${schema.modules} m on m.id = l.module_id
          where p.user_id = ${u.id}
          order by m.course_id, p.updated_at desc`)
      : [];
    const nextRows = rows.length
      ? await db.execute<{ course_id: string; slug: string; title: string }>(sql`
          select distinct on (m.course_id) m.course_id, l.slug, l.title
          from ${schema.lessons} l
          join ${schema.modules} m on m.id = l.module_id
          left join ${schema.lessonProgress} p on p.lesson_id = l.id and p.user_id = ${u.id}
          where m.course_id in ${sql`(${sql.join(rows.map((r) => sql`${r.id}`), sql`, `)})`}
            and l.status = 'published' and p.completed_at is null
          order by m.course_id, m."order", l."order"`)
      : [];
    const lastBy = new Map(last.map((l) => [l.course_id, l]));
    const nextBy = new Map(nextRows.map((l) => [l.course_id, l]));
    return {
      items: rows.map((r) => ({
        ...r,
        progress: progress.get(r.id),
        lastLesson: lastBy.get(r.id) ? { slug: lastBy.get(r.id)!.slug, title: lastBy.get(r.id)!.title, at: lastBy.get(r.id)!.updated_at } : null,
        nextLesson: nextBy.get(r.id) ? { slug: nextBy.get(r.id)!.slug, title: nextBy.get(r.id)!.title } : null,
      })),
    };
  });

  /** Đăng ký khóa học miễn phí (khóa có phí được ghi danh khi đơn hàng thanh toán). */
  app.post<{ Params: { id: string } }>("/api/me/courses/:id/enroll", async (req, reply) => {
    const u = await requireUser(req);
    const [course] = await db
      .select({ id: c.id, price: c.price, salePrice: c.salePrice, saleEndsAt: c.saleEndsAt, status: c.status, slug: c.slug })
      .from(c)
      .where(sql`${c.id} = ${req.params.id} or ${c.slug} = ${req.params.id}`);
    if (!course || course.status !== "published") throw notFound("Không tìm thấy khóa học");
    if (effectivePrice(course) > 0 && u.role === "student")
      throw new HttpError(402, "Khóa học có phí — vui lòng thanh toán để đăng ký", { checkout: `/thanh-toan?course=${course.slug}` });
    const isNew = await enrollUser(u.id, course.id);
    return reply.code(isNew ? 201 : 200).send({ enrolled: true, courseId: course.id });
  });
}
