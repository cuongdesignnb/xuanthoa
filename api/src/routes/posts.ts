import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, ne, sql, type SQL, type AnyColumn } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { allOf, countAll, listQuery, notFound, pageOf, parse, slugify, badRequest } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";
import { zOptStr } from "../lib/crud.js";
import { vnSearch } from "../lib/vn.js";

const { posts, teachers, resources, subscribers, users } = schema;

/** Danh mục blog (slug dùng trên URL client). */
export const POST_CATEGORIES = [
  { id: "ngu-phap", label: "Ngữ pháp" },
  { id: "kanji", label: "Kanji" },
  { id: "jlpt", label: "Kinh nghiệm JLPT" },
  { id: "van-hoa", label: "Văn hóa Nhật Bản" },
  { id: "meo", label: "Mẹo học tập" },
  { id: "du-hoc", label: "Du học" },
] as const;

/** Bài đã xuất bản và đã tới giờ đăng (publishedAt tương lai = hẹn giờ). */
const isLive = sql`${posts.status} = 'published' and ${posts.publishedAt} is not null and ${posts.publishedAt} <= now()`;

const authorCols = {
  id: teachers.id,
  slug: teachers.slug,
  name: teachers.name,
  title: teachers.title,
  avatarUrl: teachers.avatarUrl,
  avatarSeed: teachers.avatarSeed,
  avatarBg: teachers.avatarBg,
};

const cardCols = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  category: posts.category,
  coverUrl: posts.coverUrl,
  coverStyle: posts.coverStyle,
  readMin: posts.readMin,
  views: posts.views,
  featured: posts.featured,
  guide: posts.guide,
  publishedAt: posts.publishedAt,
  authorId: teachers.id,
  authorSlug: teachers.slug,
  authorName: teachers.name,
  authorAvatarUrl: teachers.avatarUrl,
  authorAvatarSeed: teachers.avatarSeed,
  authorAvatarBg: teachers.avatarBg,
};

type CardRow = { [K in keyof typeof cardCols]: unknown };
const toCard = (r: CardRow) => {
  const { authorId, authorSlug, authorName, authorAvatarUrl, authorAvatarSeed, authorAvatarBg, ...rest } = r;
  return {
    ...rest,
    author: authorId
      ? { id: authorId, slug: authorSlug, name: authorName, avatarUrl: authorAvatarUrl, avatarSeed: authorAvatarSeed, avatarBg: authorAvatarBg }
      : null,
  };
};

const cards = () => db.select(cardCols).from(posts).leftJoin(teachers, eq(teachers.id, posts.authorId));

/** Ước tính thời gian đọc từ HTML (~220 từ/phút). */
const readMinutes = (html?: string | null) => {
  const words = (html ?? "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};

const postBody = z.object({
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự"),
  slug: z.string().trim().optional().nullable(),
  excerpt: zOptStr,
  content: zOptStr,
  category: z.enum(POST_CATEGORIES.map((c) => c.id) as [string, ...string[]], { message: "Chọn danh mục" }),
  coverUrl: zOptStr,
  coverStyle: z.record(z.string(), z.unknown()).optional().nullable(),
  authorId: zOptStr,
  readMin: z.coerce.number().int().min(1).max(120).optional().nullable(),
  featured: z.boolean().optional(),
  guide: z.boolean().optional(),
  status: z.enum(["draft", "review", "published", "archived"]).optional(),
  publishedAt: z.coerce.date().optional().nullable(),
});

const resourceBody = z.object({
  title: z.string().trim().min(2, "Nhập tên tài liệu"),
  fileUrl: z.string().trim().min(1, "Chọn tệp"),
  fileType: z.string().trim().default("PDF"),
  sizeBytes: z.coerce.number().int().min(0).default(0),
  isFree: z.boolean().default(true),
  downloads: z.coerce.number().int().min(0).optional(),
});

async function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base) || "bai-viet";
  let slug = root;
  for (let i = 2; ; i++) {
    const [hit] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.slug, slug), exceptId ? ne(posts.id, exceptId) : undefined))
      .limit(1);
    if (!hit) return slug;
    slug = `${root}-${i}`;
  }
}

export default async function postRoutes(app: FastifyInstance) {
  /* ---------------------------- Public ---------------------------- */

  app.get("/api/public/posts", async (req) => {
    const q = parse(
      listQuery.extend({
        category: z.string().optional(),
        pageSize: z.coerce.number().int().min(1).max(50).default(6),
        sort: z.enum(["newest", "popular", "oldest"]).default("newest"),
        guide: z.coerce.boolean().optional(),
      }),
      req.query,
    );
    const where = allOf(
      isLive,
      q.category && q.category !== "all" ? eq(posts.category, q.category) : undefined,
      q.guide ? eq(posts.guide, true) : undefined,
      vnSearch(q.q, [posts.title, posts.excerpt, teachers.name]),
    );
    const order = q.sort === "popular" ? [desc(posts.views)] : q.sort === "oldest" ? [asc(posts.publishedAt)] : [desc(posts.publishedAt)];
    const { limit, offset } = pageOf(q);
    const [rows, [{ total }]] = await Promise.all([
      cards().where(where).orderBy(...order, desc(posts.createdAt)).limit(limit).offset(offset),
      db.select({ total: countAll }).from(posts).leftJoin(teachers, eq(teachers.id, posts.authorId)).where(where),
    ]);
    return { items: rows.map(toCard), total, page: q.page, pageSize: q.pageSize };
  });

  app.get("/api/public/posts/categories", async () => {
    const rows = await db
      .select({ category: posts.category, count: countAll })
      .from(posts)
      .where(isLive)
      .groupBy(posts.category);
    const map = new Map(rows.map((r) => [r.category, r.count]));
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { total, items: POST_CATEGORIES.map((c) => ({ ...c, count: map.get(c.id) ?? 0 })) };
  });

  /** Số liệu hero trang blog. */
  app.get("/api/public/posts/stats", async () => {
    const [r] = await db.execute<{ posts: number; views: number; followers: number; latest: string | null }>(sql`
      select
        (select count(*)::int from ${posts} where ${isLive}) as posts,
        (select coalesce(sum(views), 0)::int from ${posts} where ${isLive}) as views,
        ((select count(*)::int from ${users} where role = 'student') + (select count(*)::int from ${subscribers})) as followers,
        (select max(published_at) from ${posts} where ${isLive}) as latest
    `);
    return r;
  });

  app.get("/api/public/posts/featured", async (req) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(10).default(3) }), req.query);
    const rows = await cards().where(and(isLive, eq(posts.featured, true))).orderBy(desc(posts.views)).limit(limit);
    return { items: rows.map(toCard) };
  });

  app.get("/api/public/posts/guides", async () => {
    const rows = await cards().where(and(isLive, eq(posts.guide, true))).orderBy(asc(posts.publishedAt)).limit(10);
    return { items: rows.map(toCard) };
  });

  app.get<{ Params: { slug: string } }>("/api/public/posts/:slug", async (req) => {
    const [row] = await db
      .update(posts)
      .set({ views: sql`${posts.views} + 1`, updatedAt: sql`${posts.updatedAt}` })
      .where(and(eq(posts.slug, req.params.slug), isLive))
      .returning();
    if (!row) throw notFound("Không tìm thấy bài viết");
    const [author] = row.authorId
      ? await db.select({ ...authorCols, bio: teachers.bio, levelRange: teachers.levelRange, yearsExp: teachers.yearsExp, badge: teachers.badge, native: teachers.native }).from(teachers).where(eq(teachers.id, row.authorId))
      : [null];
    const related = await cards()
      .where(and(isLive, ne(posts.id, row.id)))
      .orderBy(sql`(${posts.category} = ${row.category}) desc`, desc(posts.publishedAt))
      .limit(3);
    const [prev] = await db
      .select({ slug: posts.slug, title: posts.title })
      .from(posts)
      .where(and(isLive, sql`${posts.publishedAt} < ${row.publishedAt!.toISOString()}`))
      .orderBy(desc(posts.publishedAt))
      .limit(1);
    const [next] = await db
      .select({ slug: posts.slug, title: posts.title })
      .from(posts)
      .where(and(isLive, sql`${posts.publishedAt} > ${row.publishedAt!.toISOString()}`))
      .orderBy(asc(posts.publishedAt))
      .limit(1);
    return { ...row, author: author ?? null, related: related.map(toCard), prev: prev ?? null, next: next ?? null };
  });

  app.get("/api/public/resources", async (req) => {
    const q = parse(z.object({ free: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(10) }), req.query);
    const rows = await db
      .select({
        id: resources.id,
        title: resources.title,
        fileType: resources.fileType,
        sizeBytes: resources.sizeBytes,
        downloads: resources.downloads,
      })
      .from(resources)
      .where(q.free === "0" ? undefined : eq(resources.isFree, true))
      .orderBy(desc(resources.downloads))
      .limit(q.limit);
    return { items: rows };
  });

  app.post<{ Params: { id: string } }>("/api/public/resources/:id/download", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req) => {
    const [row] = await db
      .update(resources)
      .set({ downloads: sql`${resources.downloads} + 1` })
      .where(and(eq(resources.id, req.params.id), eq(resources.isFree, true)))
      .returning({ fileUrl: resources.fileUrl, downloads: resources.downloads, title: resources.title });
    if (!row) throw notFound("Không tìm thấy tài liệu");
    return row;
  });

  app.post("/api/public/subscribe", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
    const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email("Email không hợp lệ") }), req.body);
    const r = await db.insert(subscribers).values({ email }).onConflictDoNothing().returning();
    return { ok: true, already: r.length === 0 };
  });

  /* ----------------------------- Admin ----------------------------- */

  const read = requirePerm("posts.read");
  const write = requirePerm("posts.write");

  app.get("/api/admin/posts", { preHandler: read }, async (req) => {
    const q = parse(
      listQuery.extend({
        status: z.string().optional(),
        category: z.string().optional(),
        author: z.string().optional(),
        featured: z.string().optional(),
      }),
      req.query,
    );
    let statusCond: SQL | undefined;
    if (q.status === "scheduled") statusCond = sql`${posts.status} = 'published' and ${posts.publishedAt} > now()`;
    else if (q.status === "published") statusCond = isLive;
    else if (q.status) statusCond = eq(posts.status, q.status as "draft");
    const where = allOf(
      statusCond,
      q.category ? eq(posts.category, q.category) : undefined,
      q.author ? eq(posts.authorId, q.author) : undefined,
      q.featured === "1" ? eq(posts.featured, true) : q.featured === "guide" ? eq(posts.guide, true) : undefined,
      vnSearch(q.q, [posts.title, posts.slug]),
    );
    const sortCols: Record<string, AnyColumn> = {
      title: posts.title,
      views: posts.views,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    };
    const col = sortCols[q.sort ?? ""] ?? posts.updatedAt;
    const { limit, offset } = pageOf(q);
    const [items, [{ total }], counts] = await Promise.all([
      db
        .select({
          id: posts.id,
          slug: posts.slug,
          title: posts.title,
          category: posts.category,
          coverUrl: posts.coverUrl,
          coverStyle: posts.coverStyle,
          status: posts.status,
          views: posts.views,
          featured: posts.featured,
          guide: posts.guide,
          publishedAt: posts.publishedAt,
          updatedAt: posts.updatedAt,
          scheduled: sql<boolean>`(${posts.status} = 'published' and ${posts.publishedAt} > now())`,
          authorId: posts.authorId,
          authorName: teachers.name,
          authorAvatarUrl: teachers.avatarUrl,
          authorAvatarSeed: teachers.avatarSeed,
        })
        .from(posts)
        .leftJoin(teachers, eq(teachers.id, posts.authorId))
        .where(where)
        .orderBy(q.order === "asc" ? sql`${col} asc nulls last` : sql`${col} desc nulls last`)
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(posts).where(where),
      db.execute<{ all: number; published: number; scheduled: number; review: number; draft: number; archived: number }>(sql`
        select count(*)::int as all,
          count(*) filter (where ${isLive})::int as published,
          count(*) filter (where status = 'published' and published_at > now())::int as scheduled,
          count(*) filter (where status = 'review')::int as review,
          count(*) filter (where status = 'draft')::int as draft,
          count(*) filter (where status = 'archived')::int as archived
        from ${posts}`),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize, counts: counts[0] };
  });

  app.get("/api/admin/posts/meta", { preHandler: read }, async () => {
    const authors = await db
      .select({ value: teachers.id, label: teachers.name })
      .from(teachers)
      .orderBy(teachers.order);
    return { categories: POST_CATEGORIES.map((c) => ({ value: c.id, label: c.label })), authors };
  });

  app.get<{ Params: { id: string } }>("/api/admin/posts/:id", { preHandler: read }, async (req) => {
    const [row] = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!row) throw notFound("Không tìm thấy bài viết");
    return row;
  });

  const prepare = async (d: z.infer<typeof postBody> | Partial<z.infer<typeof postBody>>, id?: string) => {
    const data: Record<string, unknown> = { ...d };
    if (d.slug !== undefined || d.title !== undefined) {
      const base = d.slug?.trim() || d.title;
      if (base) data.slug = await uniqueSlug(base, id);
      else delete data.slug;
    }
    if (d.content !== undefined && !d.readMin) data.readMin = readMinutes(d.content);
    if (d.readMin === null) delete data.readMin;
    if (d.status === "published" && !d.publishedAt) {
      if (id) {
        const [cur] = await db.select({ p: posts.publishedAt }).from(posts).where(eq(posts.id, id));
        if (!cur?.p) data.publishedAt = new Date();
      } else data.publishedAt = new Date();
    }
    if (data.authorId === "") data.authorId = null;
    return data;
  };

  app.post("/api/admin/posts", { preHandler: write }, async (req, reply) => {
    const d = parse(postBody, req.body);
    const data = await prepare(d);
    const [row] = await db.insert(posts).values(data as typeof posts.$inferInsert).returning();
    await logActivity(req, "create", "post", row.id, `Tạo bài viết ${row.title}`);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/posts/:id", { preHandler: write }, async (req) => {
    const d = parse(postBody.partial(), req.body);
    const data = await prepare(d, req.params.id);
    if (!Object.keys(data).length) throw badRequest("Không có dữ liệu cập nhật");
    const [row] = await db.update(posts).set(data).where(eq(posts.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bài viết");
    const action = d.status && Object.keys(d).length <= 2 ? `Đổi trạng thái "${row.title}" → ${d.status}` : `Cập nhật bài viết ${row.title}`;
    await logActivity(req, "update", "post", row.id, action);
    return row;
  });

  app.post<{ Params: { id: string } }>("/api/admin/posts/:id/duplicate", { preHandler: write }, async (req, reply) => {
    const [src] = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!src) throw notFound("Không tìm thấy bài viết");
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = src;
    void _id;
    void _c;
    void _u;
    const [row] = await db
      .insert(posts)
      .values({ ...rest, title: `${src.title} (bản sao)`, slug: await uniqueSlug(`${src.slug}-ban-sao`), status: "draft", publishedAt: null, views: 0, featured: false })
      .returning();
    await logActivity(req, "create", "post", row.id, `Nhân bản bài viết ${src.title}`);
    return reply.code(201).send(row);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/posts/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(posts).where(eq(posts.id, req.params.id)).returning();
    if (!row) throw notFound("Không tìm thấy bài viết");
    await logActivity(req, "delete", "post", row.id, `Xoá bài viết ${row.title}`);
    return reply.code(204).send();
  });

  /* Tài liệu miễn phí (resources không gắn bài học/khóa học) */
  const freeOnly = sql`${resources.lessonId} is null and ${resources.courseId} is null`;

  app.get("/api/admin/free-resources", { preHandler: read }, async (req) => {
    const q = parse(listQuery, req.query);
    const where = allOf(freeOnly, vnSearch(q.q, [resources.title]));
    const sortCols = { title: resources.title, downloads: resources.downloads, sizeBytes: resources.sizeBytes, createdAt: resources.createdAt };
    const col = sortCols[(q.sort ?? "") as keyof typeof sortCols] ?? resources.createdAt;
    const { limit, offset } = pageOf(q);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(resources).where(where).orderBy(q.order === "asc" ? asc(col) : desc(col)).limit(limit).offset(offset),
      db.select({ total: countAll }).from(resources).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  app.post("/api/admin/free-resources", { preHandler: write }, async (req, reply) => {
    const d = parse(resourceBody, req.body);
    const [row] = await db.insert(resources).values(d).returning();
    await logActivity(req, "create", "resource", row.id, `Tạo tài liệu ${row.title}`);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/free-resources/:id", { preHandler: write }, async (req) => {
    const d = parse(resourceBody.partial(), req.body);
    const [row] = await db.update(resources).set(d).where(and(eq(resources.id, req.params.id), freeOnly)).returning();
    if (!row) throw notFound("Không tìm thấy tài liệu");
    await logActivity(req, "update", "resource", row.id, `Cập nhật tài liệu ${row.title}`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/free-resources/:id", { preHandler: write }, async (req, reply) => {
    const [row] = await db.delete(resources).where(and(eq(resources.id, req.params.id), freeOnly)).returning();
    if (!row) throw notFound("Không tìm thấy tài liệu");
    await logActivity(req, "delete", "resource", row.id, `Xoá tài liệu ${row.title}`);
    return reply.code(204).send();
  });
}
