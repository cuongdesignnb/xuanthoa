import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, asc, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { HttpError, notFound, parse, searchWhere, slugify } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";
import { courseProgress } from "../lib/enroll.js";
import { lessonsCountSql } from "./courses.js";

const C = schema.courses;
const M = schema.modules;
const L = schema.lessons;
const V = schema.vocab;
const T = schema.teachers;

const read = requirePerm("courses.read");
const write = requirePerm("courses.write");

const zOpt = z.string().trim().optional().nullable();
const zLevel = z.enum(["N5", "N4", "N3", "N2", "N1"]);
const zStatus = z.enum(["draft", "review", "published", "archived"]);

/* ------------------------------------------------------------------ */
/* Tiện ích                                                            */
/* ------------------------------------------------------------------ */

async function uniqueSlug(table: typeof C | typeof L, base: string, exceptId?: string) {
  const root = slugify(base) || "muc";
  let slug = root;
  for (let i = 2; ; i++) {
    const [hit] = await db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.slug, slug), exceptId ? ne(table.id, exceptId) : undefined))
      .limit(1);
    if (!hit) return slug;
    slug = `${root}-${i}`;
  }
}

/** Lấy ID YouTube từ link hoặc chuỗi 11 ký tự. */
export function youtubeIdOf(input?: string | null) {
  if (!input) return null;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

/** Tìm hoặc tạo bản ghi video YouTube. */
async function youtubeVideo(youtubeId: string, title: string, durationSec?: number | null, createdById?: string) {
  const [hit] = await db.select({ id: schema.videos.id }).from(schema.videos).where(eq(schema.videos.youtubeId, youtubeId)).limit(1);
  if (hit) return hit.id;
  const [row] = await db
    .insert(schema.videos)
    .values({
      title,
      source: "youtube",
      youtubeId,
      status: "ready",
      durationSec: durationSec ?? null,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      createdById,
    })
    .returning({ id: schema.videos.id });
  return row.id;
}

async function courseOfModule(moduleId: string) {
  const [m] = await db.select({ courseId: M.courseId }).from(M).where(eq(M.id, moduleId));
  if (!m) throw notFound("Không tìm thấy chương");
  return m.courseId;
}

async function refreshHasDocs(lessonId: string) {
  await db
    .update(L)
    .set({ hasDocs: sql`exists(select 1 from ${schema.resources} r where r.lesson_id = ${lessonId})` })
    .where(eq(L.id, lessonId));
}

const touch = (courseId: string) => db.update(C).set({ updatedAt: new Date() }).where(eq(C.id, courseId));

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

const courseBody = z.object({
  title: z.string().trim().min(3, "Tên khóa học tối thiểu 3 ký tự"),
  slug: zOpt,
  subtitle: zOpt,
  description: zOpt,
  level: zLevel.optional().nullable(),
  category: z.string().trim().min(1).default("level"),
  goals: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  formats: z.array(z.string()).default([]),
  format: z.string().default("video"),
  coverUrl: zOpt,
  coverStyle: z.record(z.string(), z.unknown()).optional().nullable(),
  badge: zOpt,
  teacherId: zOpt,
  price: z.coerce.number().int().min(0, "Giá không hợp lệ").default(0),
  salePrice: z.coerce.number().int().min(0).optional().nullable(),
  saleEndsAt: z.coerce.date().optional().nullable(),
  durationHours: z.coerce.number().int().min(0).default(0),
  weeks: z.coerce.number().int().min(0).optional().nullable(),
  featured: z.boolean().default(false),
  status: zStatus.default("draft"),
});

const lessonBody = z.object({
  moduleId: z.string().min(1, "Chọn chương"),
  title: z.string().trim().min(2, "Tên bài học tối thiểu 2 ký tự"),
  slug: zOpt,
  summary: zOpt,
  type: z.enum(["video", "text", "quiz"]).default("video"),
  content: zOpt,
  grammar: zOpt,
  durationSec: z.coerce.number().int().min(0).default(0),
  isFree: z.boolean().default(false),
  hasExercise: z.boolean().default(false),
  quizId: zOpt,
  status: zStatus.default("published"),
  video: z.object({ videoId: z.string().nullable().optional(), youtubeUrl: z.string().nullable().optional() }).optional().nullable(),
});

const vocabBody = z.object({
  word: z.string().trim().min(1, "Nhập từ vựng"),
  reading: zOpt,
  romaji: zOpt,
  pos: zOpt,
  meaning: z.string().trim().min(1, "Nhập nghĩa"),
  exampleJa: zOpt,
  exampleRomaji: zOpt,
  exampleVi: zOpt,
});

const resourceBody = z.object({
  title: z.string().trim().min(1, "Nhập tên tài liệu"),
  fileUrl: z.string().trim().min(1, "Chọn tệp"),
  fileType: z.string().trim().default("PDF"),
  sizeBytes: z.coerce.number().int().min(0).default(0),
  isFree: z.boolean().default(false),
});

const ids = z.object({ ids: z.array(z.string()).min(1) });

/* ------------------------------------------------------------------ */

async function resolveVideo(req: FastifyRequest, v: { videoId?: string | null; youtubeUrl?: string | null } | null | undefined, title: string) {
  if (v === undefined) return undefined;
  if (!v) return null;
  if (v.videoId) return v.videoId;
  const yt = youtubeIdOf(v.youtubeUrl);
  if (v.youtubeUrl && !yt) throw new HttpError(400, "Dữ liệu không hợp lệ", [{ path: "video", message: "Link YouTube không hợp lệ" }]);
  return yt ? youtubeVideo(yt, title, null, req.authUser?.id) : null;
}

async function lessonDetail(id: string) {
  const [row] = await db
    .select({
      lesson: L,
      module: { id: M.id, title: M.title },
      course: { id: C.id, slug: C.slug, title: C.title, level: C.level },
      video: {
        id: schema.videos.id,
        title: schema.videos.title,
        source: schema.videos.source,
        youtubeId: schema.videos.youtubeId,
        status: schema.videos.status,
        durationSec: schema.videos.durationSec,
        thumbnailUrl: schema.videos.thumbnailUrl,
      },
    })
    .from(L)
    .innerJoin(M, eq(M.id, L.moduleId))
    .innerJoin(C, eq(C.id, M.courseId))
    .leftJoin(schema.videos, eq(schema.videos.id, L.videoId))
    .where(eq(L.id, id));
  if (!row) throw notFound("Không tìm thấy bài học");
  const [vocab, resources] = await Promise.all([
    db.select().from(V).where(eq(V.lessonId, id)).orderBy(asc(V.order)),
    db.select().from(schema.resources).where(eq(schema.resources.lessonId, id)).orderBy(asc(schema.resources.createdAt)),
  ]);
  const video = row.video?.id ? row.video : null;
  return {
    ...row.lesson,
    module: row.module,
    course: row.course,
    video,
    videoValue: {
      videoId: video?.id ?? null,
      youtubeUrl: video?.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : null,
    },
    vocab,
    resources,
  };
}

/** Phân tích TSV/CSV dán vào: word, reading, romaji, pos, meaning, exampleJa, exampleRomaji, exampleVi. */
export function parseVocabTable(text: string) {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const splitCsv = (line: string) => {
    if (sep === "\t") return line.split("\t");
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') (cur += '"'), i++;
        else q = !q;
      } else if (ch === sep && !q) out.push(cur), (cur = "");
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = splitCsv(lines[0]).map((h) => h.trim().toLowerCase());
  const known: Record<string, string> = {
    word: "word", "từ": "word", "từ vựng": "word", kanji: "word",
    reading: "reading", "cách đọc": "reading", hiragana: "reading", kana: "reading",
    romaji: "romaji",
    pos: "pos", "loại từ": "pos", type: "pos",
    meaning: "meaning", "nghĩa": "meaning",
    exampleja: "exampleJa", "ví dụ": "exampleJa", example: "exampleJa",
    exampleromaji: "exampleRomaji", "ví dụ romaji": "exampleRomaji",
    examplevi: "exampleVi", "dịch ví dụ": "exampleVi", "ví dụ (vi)": "exampleVi",
  };
  const hasHeader = header.some((h) => known[h] === "word") && header.some((h) => known[h] === "meaning");
  const order = hasHeader
    ? header.map((h) => known[h] ?? "")
    : ["word", "reading", "romaji", "pos", "meaning", "exampleJa", "exampleRomaji", "exampleVi"];
  // 3 cột không header: word, reading, meaning
  const body = hasHeader ? lines.slice(1) : lines;
  return body
    .map((line) => {
      const cells = splitCsv(line).map((c) => c.trim());
      const cols = !hasHeader && cells.length === 3 ? ["word", "reading", "meaning"] : !hasHeader && cells.length === 4 ? ["word", "reading", "romaji", "meaning"] : order;
      const rec: Record<string, string> = {};
      cols.forEach((k, i) => k && cells[i] && (rec[k] = cells[i]));
      return rec;
    })
    .filter((r) => r.word && r.meaning);
}

/* ------------------------------------------------------------------ */

export default async function courseAdminRoutes(app: FastifyInstance) {
  /* ---------------------------- Khóa học ---------------------------- */

  app.get("/api/admin/courses", { preHandler: read }, async (req) => {
    const q = parse(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(20),
        q: z.string().trim().optional(),
        status: z.string().optional(),
        level: z.string().optional(),
        category: z.string().optional(),
        teacherId: z.string().optional(),
        featured: z.string().optional(),
        sort: z.string().optional(),
        order: z.enum(["asc", "desc"]).default("desc"),
      }),
      req.query,
    );
    const where = and(
      searchWhere(q.q, [C.title, C.slug, C.subtitle]),
      q.status ? eq(C.status, q.status as "draft") : undefined,
      q.level ? eq(C.level, q.level as "N5") : undefined,
      q.category ? eq(C.category, q.category) : undefined,
      q.teacherId ? eq(C.teacherId, q.teacherId) : undefined,
      q.featured === "true" ? eq(C.featured, true) : undefined,
    );
    const enrolledSql = sql<number>`(select count(*)::int from ${schema.enrollments} e where e.course_id = ${C.id} and e.status = 'active')`;
    const sortCols: Record<string, SQL | typeof C.title> = {
      title: C.title,
      createdAt: C.createdAt as never,
      updatedAt: C.updatedAt as never,
      price: C.price as never,
      rating: C.rating as never,
      studentCount: C.studentCount as never,
      order: C.order as never,
      lessons: lessonsCountSql,
      enrolled: enrolledSql,
    };
    const col = (q.sort && sortCols[q.sort]) || null;
    const orderBy = col ? [q.order === "asc" ? asc(col) : desc(col)] : [asc(C.order), desc(C.createdAt)];
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: C.id,
          slug: C.slug,
          title: C.title,
          subtitle: C.subtitle,
          level: C.level,
          category: C.category,
          coverUrl: C.coverUrl,
          coverStyle: C.coverStyle,
          price: C.price,
          salePrice: C.salePrice,
          saleEndsAt: C.saleEndsAt,
          rating: C.rating,
          ratingCount: C.ratingCount,
          studentCount: C.studentCount,
          featured: C.featured,
          status: C.status,
          order: C.order,
          updatedAt: C.updatedAt,
          teacher: { id: T.id, name: T.name, avatarUrl: T.avatarUrl, avatarSeed: T.avatarSeed, avatarBg: T.avatarBg },
          lessonsCount: lessonsCountSql,
          enrolled: enrolledSql,
        })
        .from(C)
        .leftJoin(T, eq(T.id, C.teacherId))
        .where(where)
        .orderBy(...orderBy)
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(C).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  /** Thống kê nhanh cho đầu trang danh sách. */
  app.get("/api/admin/courses/stats", { preHandler: read }, async () => {
    const [r] = await db.execute<{ total: number; published: number; draft: number; lessons: number; students: number; rating: number }>(sql`
      select
        (select count(*)::int from ${C}) as total,
        (select count(*)::int from ${C} where status = 'published') as published,
        (select count(*)::int from ${C} where status in ('draft','review')) as draft,
        (select count(*)::int from ${L}) as lessons,
        (select count(*)::int from ${schema.enrollments} where status = 'active') as students,
        (select coalesce(round(avg(rating)::numeric, 2), 0)::float from ${C} where status = 'published') as rating`);
    return r;
  });

  app.get<{ Params: { id: string } }>("/api/admin/courses/:id", { preHandler: read }, async (req) => {
    const [course] = await db.select().from(C).where(eq(C.id, req.params.id));
    if (!course) throw notFound("Không tìm thấy khóa học");
    const mods = await db.select().from(M).where(eq(M.courseId, course.id)).orderBy(asc(M.order));
    const lessons = mods.length
      ? await db
          .select({
            id: L.id,
            moduleId: L.moduleId,
            order: L.order,
            slug: L.slug,
            title: L.title,
            type: L.type,
            durationSec: L.durationSec,
            isFree: L.isFree,
            hasDocs: L.hasDocs,
            hasExercise: L.hasExercise,
            status: L.status,
            hasVideo: sql<boolean>`${L.videoId} is not null`,
            vocabCount: sql<number>`(select count(*)::int from ${V} v where v.lesson_id = ${L.id})`,
          })
          .from(L)
          .where(inArray(L.moduleId, mods.map((m) => m.id)))
          .orderBy(asc(L.order))
      : [];
    const [paid] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(and(eq(schema.orders.courseId, course.id), eq(schema.orders.status, "paid")));
    return {
      ...course,
      paidOrders: paid.n,
      modules: mods.map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id) })),
    };
  });

  app.post("/api/admin/courses", { preHandler: write }, async (req, reply) => {
    const body = parse(courseBody, req.body);
    const slug = await uniqueSlug(C, body.slug || body.title);
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${C.order}), 0)::int` }).from(C);
    const [row] = await db
      .insert(C)
      .values({ ...body, slug, teacherId: body.teacherId || null, order: max + 1 })
      .returning();
    await logActivity(req, "create", "course", row.id, `Tạo khóa học ${row.title}`);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/courses/:id", { preHandler: write }, async (req) => {
    const body = parse(courseBody.partial(), req.body);
    const data: Record<string, unknown> = { ...body };
    for (const k of Object.keys(courseBody.shape)) if (!(k in (req.body as object))) delete data[k];
    if ("slug" in data || "title" in data) {
      if (data.slug) data.slug = await uniqueSlug(C, String(data.slug), req.params.id);
      else delete data.slug;
    }
    if ("teacherId" in data) data.teacherId = data.teacherId || null;
    const [row] = await db.update(C).set(data).where(eq(C.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy khóa học");
    const action = body.status && Object.keys(data).length === 1 ? (body.status === "published" ? "publish" : "status") : "update";
    await logActivity(req, action, "course", row.id, `${action === "publish" ? "Xuất bản" : "Cập nhật"} khóa học ${row.title}`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/courses/:id", { preHandler: write }, async (req, reply) => {
    const [course] = await db.select({ id: C.id, title: C.title }).from(C).where(eq(C.id, req.params.id));
    if (!course) throw notFound("Không tìm thấy khóa học");
    const [paid] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(and(eq(schema.orders.courseId, course.id), inArray(schema.orders.status, ["paid", "refund_requested"])));
    if (paid.n > 0)
      throw new HttpError(409, `Không thể xoá: khóa học đã có ${paid.n} đơn hàng đã thanh toán. Hãy chuyển sang "Lưu trữ" thay vì xoá.`);
    await db.delete(C).where(eq(C.id, course.id));
    await logActivity(req, "delete", "course", course.id, `Xoá khóa học ${course.title}`);
    return reply.code(204).send();
  });

  /** Nhân bản khóa học (kèm chương, bài, từ vựng, tài liệu) — bản sao ở trạng thái nháp. */
  app.post<{ Params: { id: string } }>("/api/admin/courses/:id/duplicate", { preHandler: write }, async (req, reply) => {
    const [src] = await db.select().from(C).where(eq(C.id, req.params.id));
    if (!src) throw notFound("Không tìm thấy khóa học");
    const copy = await db.transaction(async (tx) => {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = src;
      void _id, void _c, void _u;
      const slug = await uniqueSlug(C, `${src.slug}-ban-sao`);
      const [course] = await tx
        .insert(C)
        .values({ ...rest, slug, title: `${src.title} (bản sao)`, status: "draft", featured: false, studentCount: 0, ratingCount: 0 })
        .returning();
      const mods = await tx.select().from(M).where(eq(M.courseId, src.id)).orderBy(asc(M.order));
      for (const m of mods) {
        const [nm] = await tx.insert(M).values({ courseId: course.id, order: m.order, title: m.title, description: m.description }).returning();
        const ls = await tx.select().from(L).where(eq(L.moduleId, m.id)).orderBy(asc(L.order));
        for (const l of ls) {
          const { id: lid, createdAt: _a, updatedAt: _b, ...lr } = l;
          void _a, void _b;
          const [nl] = await tx
            .insert(L)
            .values({ ...lr, moduleId: nm.id, slug: `${l.slug}-${course.id.slice(0, 6)}` })
            .returning({ id: L.id });
          const vs = await tx.select().from(V).where(eq(V.lessonId, lid));
          if (vs.length) await tx.insert(V).values(vs.map(({ id: _v, ...v }) => (void _v, { ...v, lessonId: nl.id })));
          const rs = await tx.select().from(schema.resources).where(eq(schema.resources.lessonId, lid));
          if (rs.length)
            await tx
              .insert(schema.resources)
              .values(rs.map(({ id: _r, createdAt: _d, downloads: _w, ...r }) => (void _r, void _d, void _w, { ...r, lessonId: nl.id })));
        }
      }
      return course;
    });
    await logActivity(req, "duplicate", "course", copy.id, `Nhân bản khóa học ${src.title}`);
    return reply.code(201).send(copy);
  });

  /** Thao tác hàng loạt: publish | archive | draft | feature | unfeature. */
  app.post("/api/admin/courses/bulk", { preHandler: write }, async (req) => {
    const body = parse(ids.extend({ action: z.enum(["publish", "archive", "draft", "feature", "unfeature"]) }), req.body);
    const set =
      body.action === "feature" || body.action === "unfeature"
        ? { featured: body.action === "feature" }
        : { status: ({ publish: "published", archive: "archived", draft: "draft" } as const)[body.action] };
    const rows = await db.update(C).set(set).where(inArray(C.id, body.ids)).returning({ id: C.id });
    await logActivity(req, body.action, "course", null, `Cập nhật hàng loạt ${rows.length} khóa học (${body.action})`, { ids: body.ids });
    return { updated: rows.length };
  });

  /** Sắp xếp thứ tự hiển thị khóa học. */
  app.post("/api/admin/courses/reorder", { preHandler: write }, async (req) => {
    const body = parse(ids, req.body);
    await db.transaction(async (tx) => {
      for (const [i, id] of body.ids.entries()) await tx.update(C).set({ order: i + 1 }).where(eq(C.id, id));
    });
    await logActivity(req, "reorder", "course", null, "Sắp xếp lại thứ tự khóa học");
    return { ok: true };
  });

  /** Học viên đã ghi danh + tiến độ. */
  app.get<{ Params: { id: string } }>("/api/admin/courses/:id/students", { preHandler: read }, async (req) => {
    const q = parse(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        q: z.string().trim().optional(),
      }),
      req.query,
    );
    const where = and(eq(schema.enrollments.courseId, req.params.id), searchWhere(q.q, [schema.users.name, schema.users.email]));
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          avatarUrl: schema.users.avatarUrl,
          status: schema.enrollments.status,
          enrolledAt: schema.enrollments.createdAt,
          lastActiveAt: sql<string | null>`(select max(p.updated_at) from ${schema.lessonProgress} p join ${L} l on l.id = p.lesson_id join ${M} m on m.id = l.module_id where p.user_id = ${schema.users.id} and m.course_id = ${req.params.id})`,
        })
        .from(schema.enrollments)
        .innerJoin(schema.users, eq(schema.users.id, schema.enrollments.userId))
        .where(where)
        .orderBy(desc(schema.enrollments.createdAt))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.enrollments)
        .innerJoin(schema.users, eq(schema.users.id, schema.enrollments.userId))
        .where(where),
    ]);
    const items = await Promise.all(
      rows.map(async (r) => ({ ...r, progress: (await courseProgress(r.id, [req.params.id])).get(req.params.id) })),
    );
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  app.get<{ Params: { id: string } }>("/api/admin/courses/:id/reviews", { preHandler: read }, async (req) => {
    const items = await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.courseId, req.params.id))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(100);
    const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;
    const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: items.filter((r) => r.rating === star).length }));
    return { items, total: items.length, avg: Math.round(avg * 10) / 10, dist };
  });

  app.get<{ Params: { id: string } }>("/api/admin/courses/:id/resources", { preHandler: read }, async (req) => {
    const items = await db.select().from(schema.resources).where(eq(schema.resources.courseId, req.params.id)).orderBy(asc(schema.resources.createdAt));
    return { items };
  });

  app.post<{ Params: { id: string } }>("/api/admin/courses/:id/resources", { preHandler: write }, async (req, reply) => {
    const body = parse(resourceBody, req.body);
    const [row] = await db.insert(schema.resources).values({ ...body, courseId: req.params.id }).returning();
    await logActivity(req, "create", "resource", row.id, `Thêm tài liệu khóa học ${row.title}`);
    return reply.code(201).send(row);
  });

  /* ---------------------------- Chương (module) ---------------------------- */

  app.post<{ Params: { id: string } }>("/api/admin/courses/:id/modules", { preHandler: write }, async (req, reply) => {
    const body = parse(z.object({ title: z.string().trim().min(1, "Nhập tên chương"), description: zOpt }), req.body);
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${M.order}), 0)::int` }).from(M).where(eq(M.courseId, req.params.id));
    const [row] = await db.insert(M).values({ ...body, courseId: req.params.id, order: max + 1 }).returning();
    await touch(req.params.id);
    await logActivity(req, "create", "module", row.id, `Thêm chương ${row.title}`);
    return reply.code(201).send({ ...row, lessons: [] });
  });

  app.patch<{ Params: { id: string } }>("/api/admin/modules/:id", { preHandler: write }, async (req) => {
    const body = parse(z.object({ title: z.string().trim().min(1, "Nhập tên chương").optional(), description: zOpt }), req.body);
    const [row] = await db.update(M).set(body).where(eq(M.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy chương");
    await touch(row.courseId);
    await logActivity(req, "update", "module", row.id, `Cập nhật chương ${row.title}`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/modules/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(M).where(eq(M.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy chương");
    await touch(row.courseId);
    await logActivity(req, "delete", "module", row.id, `Xoá chương ${row.title}`);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/admin/courses/:id/modules/reorder", { preHandler: write }, async (req) => {
    const body = parse(ids, req.body);
    await db.transaction(async (tx) => {
      for (const [i, id] of body.ids.entries())
        await tx.update(M).set({ order: i + 1 }).where(and(eq(M.id, id), eq(M.courseId, req.params.id)));
    });
    await touch(req.params.id);
    await logActivity(req, "reorder", "module", null, "Sắp xếp lại chương");
    return { ok: true };
  });

  /** Đặt thứ tự bài trong chương; bài thuộc chương khác sẽ được chuyển sang chương này. */
  app.post<{ Params: { id: string } }>("/api/admin/modules/:id/lessons/reorder", { preHandler: write }, async (req) => {
    const body = parse(ids, req.body);
    const courseId = await courseOfModule(req.params.id);
    await db.transaction(async (tx) => {
      for (const [i, id] of body.ids.entries()) await tx.update(L).set({ order: i + 1, moduleId: req.params.id }).where(eq(L.id, id));
    });
    await touch(courseId);
    await logActivity(req, "reorder", "lesson", null, "Sắp xếp lại bài học");
    return { ok: true };
  });

  /** Chuyển bài sang chương khác (đặt ở cuối hoặc tại vị trí index). */
  app.post<{ Params: { id: string } }>("/api/admin/lessons/:id/move", { preHandler: write }, async (req) => {
    const body = parse(z.object({ moduleId: z.string(), index: z.coerce.number().int().min(0).optional() }), req.body);
    const courseId = await courseOfModule(body.moduleId);
    const siblings = await db.select({ id: L.id }).from(L).where(and(eq(L.moduleId, body.moduleId), ne(L.id, req.params.id))).orderBy(asc(L.order));
    const list = siblings.map((s) => s.id);
    list.splice(body.index ?? list.length, 0, req.params.id);
    await db.transaction(async (tx) => {
      for (const [i, id] of list.entries()) await tx.update(L).set({ order: i + 1, moduleId: body.moduleId }).where(eq(L.id, id));
    });
    await touch(courseId);
    await logActivity(req, "move", "lesson", req.params.id, "Chuyển bài học sang chương khác");
    return { ok: true };
  });

  /* ---------------------------- Bài học ---------------------------- */

  app.get("/api/admin/lessons", { preHandler: read }, async (req) => {
    const q = parse(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(20),
        q: z.string().trim().optional(),
        courseId: z.string().optional(),
        moduleId: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        isFree: z.string().optional(),
        sort: z.string().optional(),
        order: z.enum(["asc", "desc"]).default("desc"),
      }),
      req.query,
    );
    const where = and(
      searchWhere(q.q, [L.title, L.slug]),
      q.courseId ? eq(M.courseId, q.courseId) : undefined,
      q.moduleId ? eq(L.moduleId, q.moduleId) : undefined,
      q.type ? eq(L.type, q.type as "video") : undefined,
      q.status ? eq(L.status, q.status as "draft") : undefined,
      q.isFree === "true" ? eq(L.isFree, true) : q.isFree === "false" ? eq(L.isFree, false) : undefined,
    );
    const sortCols = { title: L.title, durationSec: L.durationSec, updatedAt: L.updatedAt, createdAt: L.createdAt, course: C.title } as const;
    const col = sortCols[q.sort as keyof typeof sortCols];
    const orderBy = col ? [q.order === "asc" ? asc(col) : desc(col)] : [asc(C.order), asc(M.order), asc(L.order)];
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: L.id,
          slug: L.slug,
          title: L.title,
          type: L.type,
          durationSec: L.durationSec,
          isFree: L.isFree,
          hasDocs: L.hasDocs,
          hasExercise: L.hasExercise,
          status: L.status,
          order: L.order,
          updatedAt: L.updatedAt,
          hasVideo: sql<boolean>`${L.videoId} is not null`,
          vocabCount: sql<number>`(select count(*)::int from ${V} v where v.lesson_id = ${L.id})`,
          views: sql<number>`(select count(*)::int from ${schema.lessonProgress} p where p.lesson_id = ${L.id})`,
          module: { id: M.id, title: M.title },
          course: { id: C.id, title: C.title, slug: C.slug, level: C.level },
        })
        .from(L)
        .innerJoin(M, eq(M.id, L.moduleId))
        .innerJoin(C, eq(C.id, M.courseId))
        .where(where)
        .orderBy(...orderBy)
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(L)
        .innerJoin(M, eq(M.id, L.moduleId))
        .where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  /** Danh sách chương (để chọn khi tạo/chuyển bài). */
  app.get("/api/admin/modules", { preHandler: read }, async (req) => {
    const { courseId } = parse(z.object({ courseId: z.string().optional() }), req.query);
    const rows = await db
      .select({ value: M.id, label: M.title, courseId: M.courseId, courseTitle: C.title, order: M.order })
      .from(M)
      .innerJoin(C, eq(C.id, M.courseId))
      .where(courseId ? eq(M.courseId, courseId) : undefined)
      .orderBy(asc(C.order), asc(M.order));
    return rows;
  });

  app.get<{ Params: { id: string } }>("/api/admin/lessons/:id", { preHandler: read }, async (req) => lessonDetail(req.params.id));

  app.post("/api/admin/lessons", { preHandler: write }, async (req, reply) => {
    const body = parse(lessonBody, req.body);
    const courseId = await courseOfModule(body.moduleId);
    const { video, ...data } = body;
    const slug = await uniqueSlug(L, body.slug || body.title);
    const videoId = await resolveVideo(req, video, body.title);
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${L.order}), 0)::int` }).from(L).where(eq(L.moduleId, body.moduleId));
    const [row] = await db
      .insert(L)
      .values({ ...data, slug, videoId: videoId ?? null, quizId: data.quizId || null, order: max + 1 })
      .returning();
    await touch(courseId);
    await logActivity(req, "create", "lesson", row.id, `Tạo bài học ${row.title}`);
    return reply.code(201).send(await lessonDetail(row.id));
  });

  app.patch<{ Params: { id: string } }>("/api/admin/lessons/:id", { preHandler: write }, async (req) => {
    const body = parse(lessonBody.partial(), req.body);
    const raw = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const k of Object.keys(body)) if (k in raw && k !== "video") data[k] = (body as Record<string, unknown>)[k];
    if ("slug" in data) {
      if (data.slug) data.slug = await uniqueSlug(L, String(data.slug), req.params.id);
      else delete data.slug;
    }
    if ("quizId" in data) data.quizId = data.quizId || null;
    if ("video" in raw) {
      const [cur] = await db.select({ title: L.title }).from(L).where(eq(L.id, req.params.id));
      data.videoId = await resolveVideo(req, body.video ?? null, String(data.title ?? cur?.title ?? "Video bài học"));
    }
    if (data.moduleId) {
      const [cur] = await db.select({ moduleId: L.moduleId }).from(L).where(eq(L.id, req.params.id));
      if (cur && cur.moduleId !== data.moduleId) {
        const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${L.order}), 0)::int` }).from(L).where(eq(L.moduleId, String(data.moduleId)));
        data.order = max + 1;
      }
    }
    const [row] = await db.update(L).set(data).where(eq(L.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bài học");
    await touch(await courseOfModule(row.moduleId));
    await logActivity(req, "update", "lesson", row.id, `Cập nhật bài học ${row.title}`);
    return lessonDetail(row.id);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/lessons/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(L).where(eq(L.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bài học");
    await logActivity(req, "delete", "lesson", row.id, `Xoá bài học ${row.title}`);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/admin/lessons/:id/duplicate", { preHandler: write }, async (req, reply) => {
    const [src] = await db.select().from(L).where(eq(L.id, req.params.id));
    if (!src) throw notFound("Không tìm thấy bài học");
    const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = src;
    void _i, void _c, void _u;
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${L.order}), 0)::int` }).from(L).where(eq(L.moduleId, src.moduleId));
    const [row] = await db
      .insert(L)
      .values({ ...rest, title: `${src.title} (bản sao)`, slug: await uniqueSlug(L, `${src.slug}-ban-sao`), status: "draft", order: max + 1 })
      .returning();
    const vs = await db.select().from(V).where(eq(V.lessonId, src.id));
    if (vs.length) await db.insert(V).values(vs.map(({ id: _v, ...v }) => (void _v, { ...v, lessonId: row.id })));
    await logActivity(req, "duplicate", "lesson", row.id, `Nhân bản bài học ${src.title}`);
    return reply.code(201).send(row);
  });

  /* ---------------------------- Từ vựng ---------------------------- */

  app.get<{ Params: { id: string } }>("/api/admin/lessons/:id/vocab", { preHandler: read }, async (req) => ({
    items: await db.select().from(V).where(eq(V.lessonId, req.params.id)).orderBy(asc(V.order)),
  }));

  app.post<{ Params: { id: string } }>("/api/admin/lessons/:id/vocab", { preHandler: write }, async (req, reply) => {
    const body = parse(vocabBody, req.body);
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${V.order}), 0)::int` }).from(V).where(eq(V.lessonId, req.params.id));
    const [row] = await db.insert(V).values({ ...body, lessonId: req.params.id, order: max + 1 }).returning();
    await logActivity(req, "create", "vocab", row.id, `Thêm từ vựng ${row.word}`);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/vocab/:id", { preHandler: write }, async (req) => {
    const body = parse(vocabBody.partial(), req.body);
    const [row] = await db.update(V).set(body).where(eq(V.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy từ vựng");
    await logActivity(req, "update", "vocab", row.id, `Cập nhật từ vựng ${row.word}`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/vocab/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(V).where(eq(V.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy từ vựng");
    await logActivity(req, "delete", "vocab", row.id, `Xoá từ vựng ${row.word}`);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/admin/lessons/:id/vocab/reorder", { preHandler: write }, async (req) => {
    const body = parse(ids, req.body);
    await db.transaction(async (tx) => {
      for (const [i, id] of body.ids.entries()) await tx.update(V).set({ order: i + 1 }).where(and(eq(V.id, id), eq(V.lessonId, req.params.id)));
    });
    return { ok: true };
  });

  /** Nhập hàng loạt từ TSV/CSV dán vào. `dryRun` để xem trước. */
  app.post<{ Params: { id: string } }>("/api/admin/lessons/:id/vocab/import", { preHandler: write }, async (req) => {
    const body = parse(
      z.object({ text: z.string().min(1, "Dán dữ liệu từ vựng"), replace: z.boolean().default(false), dryRun: z.boolean().default(false) }),
      req.body,
    );
    const rows = parseVocabTable(body.text);
    if (!rows.length)
      throw new HttpError(400, "Không đọc được dòng nào — cần ít nhất cột từ vựng và nghĩa", [{ path: "text", message: "Dữ liệu không hợp lệ" }]);
    if (body.dryRun) return { preview: rows, count: rows.length };
    await lessonDetail(req.params.id);
    const inserted = await db.transaction(async (tx) => {
      if (body.replace) await tx.delete(V).where(eq(V.lessonId, req.params.id));
      const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${V.order}), 0)::int` }).from(V).where(eq(V.lessonId, req.params.id));
      return tx
        .insert(V)
        .values(rows.map((r, i) => ({ ...(r as { word: string; meaning: string }), lessonId: req.params.id, order: max + i + 1 })))
        .returning();
    });
    await logActivity(req, "import", "vocab", req.params.id, `Nhập ${inserted.length} từ vựng`);
    return { count: inserted.length, items: inserted };
  });

  /* ---------------------------- Tài liệu bài học ---------------------------- */

  app.post<{ Params: { id: string } }>("/api/admin/lessons/:id/resources", { preHandler: write }, async (req, reply) => {
    const body = parse(resourceBody, req.body);
    const [row] = await db.insert(schema.resources).values({ ...body, lessonId: req.params.id }).returning();
    await refreshHasDocs(req.params.id);
    await logActivity(req, "create", "resource", row.id, `Thêm tài liệu ${row.title}`);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/resources/:id", { preHandler: write }, async (req) => {
    const body = parse(resourceBody.partial(), req.body);
    const [row] = await db.update(schema.resources).set(body).where(eq(schema.resources.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy tài liệu");
    await logActivity(req, "update", "resource", row.id, `Cập nhật tài liệu ${row.title}`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/course-resources/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(schema.resources).where(eq(schema.resources.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy tài liệu");
    if (row.lessonId) await refreshHasDocs(row.lessonId);
    await logActivity(req, "delete", "resource", row.id, `Xoá tài liệu ${row.title}`);
    return reply.code(204).send();
  });
}
