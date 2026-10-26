import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { forbidden, HttpError, notFound, parse } from "../lib/http.js";
import { optionalUser, requireUser, type AuthUser } from "../lib/auth.js";
import { courseProgress, isEnrolled } from "../lib/enroll.js";

const L = schema.lessons;
const M = schema.modules;
const C = schema.courses;

async function lessonCourse(lessonId: string) {
  const [r] = await db
    .select({ lessonId: L.id, isFree: L.isFree, courseId: M.courseId, status: L.status })
    .from(L)
    .innerJoin(M, eq(M.id, L.moduleId))
    .where(eq(L.id, lessonId));
  if (!r) throw notFound("Không tìm thấy bài học");
  return r;
}

/** Học viên có được xem nội dung bài? (bài miễn phí, đã ghi danh, hoặc nhân sự) */
async function canAccess(user: AuthUser | null, lesson: { isFree: boolean; courseId: string }) {
  if (lesson.isFree) return true;
  if (!user) return false;
  if (user.role !== "student") return true;
  return isEnrolled(user.id, lesson.courseId);
}

const commentAuthor = sql<{ id: string; name: string; avatarUrl: string | null; role: string }>`json_build_object(
  'id', ${schema.users.id}, 'name', ${schema.users.name}, 'avatarUrl', ${schema.users.avatarUrl}, 'role', ${schema.users.role})`;

export default async function lessonRoutes(app: FastifyInstance) {
  /** Bài học nổi bật (trang chủ — khối "Trải nghiệm học tập"). */
  app.get("/api/public/lessons/highlights", async (req) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(12).default(3) }), req.query);
    const rows = await db.execute<{
      id: string;
      slug: string;
      title: string;
      type: string;
      level: string | null;
      course_title: string;
      category: string;
      completion: number;
    }>(sql`
      select l.id, l.slug, l.title, l.type, c.level, c.title as course_title, c.category,
        coalesce((select round(avg(p.percent))::int from ${schema.lessonProgress} p where p.lesson_id = l.id), 0) as completion
      from ${L} l join ${M} m on m.id = l.module_id join ${C} c on c.id = m.course_id
      where l.status = 'published' and c.status = 'published' and l.is_free = true
      order by c.featured desc, (select count(*) from ${schema.lessonProgress} p where p.lesson_id = l.id) desc, l.created_at
      limit ${limit}`);
    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        type: r.type,
        level: r.level,
        courseTitle: r.course_title,
        category: r.category,
        completion: r.completion,
      })),
    };
  });

  /** Trang học: bài học + cây khóa học + từ vựng + tài liệu + video (có kiểm soát quyền). */
  app.get<{ Params: { slug: string } }>("/api/public/lessons/:slug", async (req) => {
    const user = await optionalUser(req);
    const isStaff = !!user && user.role !== "student";
    const [row] = await db
      .select({
        lesson: L,
        module: { id: M.id, title: M.title, order: M.order },
        course: { id: C.id, slug: C.slug, title: C.title, level: C.level, status: C.status, coverUrl: C.coverUrl, price: C.price, salePrice: C.salePrice },
      })
      .from(L)
      .innerJoin(M, eq(M.id, L.moduleId))
      .innerJoin(C, eq(C.id, M.courseId))
      .where(sql`${L.slug} = ${req.params.slug} or ${L.id} = ${req.params.slug}`);
    if (!row || ((row.lesson.status !== "published" || row.course.status !== "published") && !isStaff))
      throw notFound("Không tìm thấy bài học");
    const { lesson, module, course } = row;

    const enrolled = user ? await isEnrolled(user.id, course.id) : false;
    const access = lesson.isFree || enrolled || isStaff;

    // Cây khóa học cho sidebar
    const mods = await db.select({ id: M.id, title: M.title, order: M.order }).from(M).where(eq(M.courseId, course.id)).orderBy(asc(M.order));
    const ls = await db
      .select({ id: L.id, moduleId: L.moduleId, slug: L.slug, title: L.title, durationSec: L.durationSec, isFree: L.isFree, type: L.type })
      .from(L)
      .where(and(inArray(L.moduleId, mods.map((m) => m.id)), isStaff ? undefined : eq(L.status, "published")))
      .orderBy(asc(L.order));
    const prog = new Map<string, { percent: number; completed: boolean; atSec?: number }>();
    if (user && ls.length) {
      const ps = await db
        .select()
        .from(schema.lessonProgress)
        .where(and(eq(schema.lessonProgress.userId, user.id), inArray(schema.lessonProgress.lessonId, ls.map((l) => l.id))));
      for (const p of ps) prog.set(p.lessonId, { percent: p.percent, completed: !!p.completedAt });
    }
    let n = 0;
    const tree = mods.map((m) => {
      const items = ls
        .filter((l) => l.moduleId === m.id)
        .map((l) => ({
          ...l,
          number: ++n,
          percent: prog.get(l.id)?.percent ?? 0,
          completed: prog.get(l.id)?.completed ?? false,
          locked: !(l.isFree || enrolled || isStaff),
        }));
      return { ...m, lessons: items, completed: items.filter((x) => x.completed).length };
    });
    const flat = tree.flatMap((m) => m.lessons);
    const idx = flat.findIndex((l) => l.id === lesson.id);
    const completed = flat.filter((l) => l.completed).length;

    const [vocabRows, resourceRows, video, commentsCount, bookmark, quiz] = await Promise.all([
      db.select().from(schema.vocab).where(eq(schema.vocab.lessonId, lesson.id)).orderBy(asc(schema.vocab.order)),
      db
        .select({
          id: schema.resources.id,
          title: schema.resources.title,
          fileUrl: schema.resources.fileUrl,
          fileType: schema.resources.fileType,
          sizeBytes: schema.resources.sizeBytes,
          isFree: schema.resources.isFree,
        })
        .from(schema.resources)
        .where(eq(schema.resources.lessonId, lesson.id))
        .orderBy(asc(schema.resources.createdAt)),
      lesson.videoId
        ? db
            .select({
              id: schema.videos.id,
              source: schema.videos.source,
              youtubeId: schema.videos.youtubeId,
              status: schema.videos.status,
              durationSec: schema.videos.durationSec,
              thumbnailUrl: schema.videos.thumbnailUrl,
            })
            .from(schema.videos)
            .where(eq(schema.videos.id, lesson.videoId))
            .then((r) => r[0] ?? null)
        : null,
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.comments)
        .where(and(eq(schema.comments.lessonId, lesson.id), eq(schema.comments.status, "approved")))
        .then((r) => r[0].n),
      user
        ? db
            .select({ x: schema.bookmarks.targetId })
            .from(schema.bookmarks)
            .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.targetType, "lesson"), eq(schema.bookmarks.targetId, lesson.id)))
            .then((r) => r.length > 0)
        : false,
      lesson.quizId
        ? db
            .select({ id: schema.quizzes.id, slug: schema.quizzes.slug, title: schema.quizzes.title })
            .from(schema.quizzes)
            .where(sql`${schema.quizzes.id} = ${lesson.quizId} or ${schema.quizzes.slug} = ${lesson.quizId}`)
            .then((r) => r[0] ?? null)
        : null,
    ]);

    const saved = new Set<string>();
    if (user && vocabRows.length) {
      const sv = await db
        .select({ id: schema.savedVocab.vocabId })
        .from(schema.savedVocab)
        .where(and(eq(schema.savedVocab.userId, user.id), inArray(schema.savedVocab.vocabId, vocabRows.map((v) => v.id))));
      for (const s of sv) saved.add(s.id);
    }

    const { content, grammar, videoId: _v, ...meta } = lesson;
    void _v;
    const pick = (l: (typeof flat)[number] | undefined) => (l ? { slug: l.slug, title: l.title, number: l.number, locked: l.locked } : null);
    return {
      lesson: { ...meta, number: flat[idx]?.number ?? 1, content: access ? content : null, grammar: access ? grammar : null },
      course: { id: course.id, slug: course.slug, title: course.title, level: course.level, coverUrl: course.coverUrl },
      module,
      locked: !access,
      enrolled,
      isStaff,
      video: access && video ? { ...video, videoId: video.source === "upload" ? video.id : null } : null,
      vocab: access ? vocabRows.map((v) => ({ ...v, saved: saved.has(v.id) })) : [],
      vocabCount: vocabRows.length,
      resources: resourceRows.map((r) => ({ ...r, fileUrl: access || r.isFree ? r.fileUrl : null })),
      tree,
      progress: user ? { completed, total: flat.length, percent: flat.length ? Math.round((completed / flat.length) * 100) : 0 } : null,
      myProgress: user ? (prog.get(lesson.id) ?? { percent: 0, completed: false }) : null,
      bookmarked: bookmark,
      commentsCount,
      quiz,
      prev: pick(flat[idx - 1]),
      next: pick(flat[idx + 1]),
    };
  });

  /* ---------------------------- Bình luận ---------------------------- */

  app.get<{ Params: { id: string } }>("/api/public/lessons/:id/comments", async (req) => {
    const user = await optionalUser(req);
    const q = parse(
      z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(10) }),
      req.query,
    );
    const where = and(eq(schema.comments.lessonId, req.params.id), eq(schema.comments.status, "approved"), isNull(schema.comments.parentId));
    const cols = {
      id: schema.comments.id,
      parentId: schema.comments.parentId,
      content: schema.comments.content,
      likes: schema.comments.likes,
      createdAt: schema.comments.createdAt,
      user: commentAuthor,
    };
    const [top, [{ total }], [{ all }]] = await Promise.all([
      db
        .select(cols)
        .from(schema.comments)
        .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
        .where(where)
        .orderBy(desc(schema.comments.createdAt))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(schema.comments).where(where),
      db
        .select({ all: sql<number>`count(*)::int` })
        .from(schema.comments)
        .where(and(eq(schema.comments.lessonId, req.params.id), eq(schema.comments.status, "approved"))),
    ]);
    const replies = top.length
      ? await db
          .select(cols)
          .from(schema.comments)
          .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
          .where(and(inArray(schema.comments.parentId, top.map((x) => x.id)), eq(schema.comments.status, "approved")))
          .orderBy(asc(schema.comments.createdAt))
      : [];
    const liked = new Set<string>();
    if (user) {
      const ids = [...top, ...replies].map((x) => x.id);
      if (ids.length) {
        const lk = await db
          .select({ id: schema.commentLikes.commentId })
          .from(schema.commentLikes)
          .where(and(eq(schema.commentLikes.userId, user.id), inArray(schema.commentLikes.commentId, ids)));
        for (const x of lk) liked.add(x.id);
      }
    }
    const shape = (x: (typeof top)[number]) => ({ ...x, liked: liked.has(x.id), mine: x.user.id === user?.id });
    return {
      items: top.map((x) => ({ ...shape(x), replies: replies.filter((r) => r.parentId === x.id).map(shape) })),
      total,
      all,
      page: q.page,
      pageSize: q.pageSize,
    };
  });

  app.post<{ Params: { id: string } }>("/api/me/lessons/:id/comments", async (req, reply) => {
    const u = await requireUser(req);
    const body = parse(z.object({ content: z.string().trim().min(2, "Nội dung quá ngắn").max(2000), parentId: z.string().optional().nullable() }), req.body);
    await lessonCourse(req.params.id);
    const [row] = await db
      .insert(schema.comments)
      .values({ userId: u.id, lessonId: req.params.id, content: body.content, parentId: body.parentId ?? null })
      .returning();
    const [me] = await db.select({ avatarUrl: schema.users.avatarUrl }).from(schema.users).where(eq(schema.users.id, u.id));
    return reply.code(201).send({
      ...row,
      user: { id: u.id, name: u.name, avatarUrl: me?.avatarUrl ?? null, role: u.role },
      liked: false,
      mine: true,
      replies: [],
    });
  });

  app.delete<{ Params: { id: string } }>("/api/me/comments/:id", async (req, reply) => {
    const u = await requireUser(req);
    const [row] = await db.select().from(schema.comments).where(eq(schema.comments.id, req.params.id));
    if (!row) throw notFound();
    if (row.userId !== u.id && u.role === "student") throw forbidden();
    await db.delete(schema.comments).where(eq(schema.comments.id, row.id));
    return reply.code(204).send();
  });

  /** Thích / bỏ thích bình luận. */
  app.post<{ Params: { id: string } }>("/api/me/comments/:id/like", async (req) => {
    const u = await requireUser(req);
    const ins = await db
      .insert(schema.commentLikes)
      .values({ commentId: req.params.id, userId: u.id })
      .onConflictDoNothing()
      .returning()
      .catch(() => {
        throw notFound("Không tìm thấy bình luận");
      });
    let liked = true;
    if (!ins.length) {
      await db.delete(schema.commentLikes).where(and(eq(schema.commentLikes.commentId, req.params.id), eq(schema.commentLikes.userId, u.id)));
      liked = false;
    }
    const [r] = await db
      .update(schema.comments)
      .set({ likes: sql`greatest(0, ${schema.comments.likes} + ${liked ? 1 : -1})` })
      .where(eq(schema.comments.id, req.params.id))
      .returning({ likes: schema.comments.likes });
    return { liked, likes: r?.likes ?? 0 };
  });

  /* ---------------------------- Tiến độ ---------------------------- */

  app.post<{ Params: { id: string } }>("/api/me/lessons/:id/progress", async (req) => {
    const u = await requireUser(req);
    const body = parse(z.object({ percent: z.coerce.number().min(0).max(100).default(0), completed: z.boolean().optional() }), req.body ?? {});
    const lc = await lessonCourse(req.params.id);
    if (!(await canAccess(u, lc))) throw new HttpError(403, "Bạn cần đăng ký khóa học để học bài này");
    const percent = Math.round(body.completed ? 100 : body.percent);
    const done = body.completed || percent >= 90;
    const [row] = await db
      .insert(schema.lessonProgress)
      .values({ userId: u.id, lessonId: req.params.id, percent, completedAt: done ? new Date() : null })
      .onConflictDoUpdate({
        target: [schema.lessonProgress.userId, schema.lessonProgress.lessonId],
        set: {
          percent: sql`greatest(${schema.lessonProgress.percent}, ${percent})`,
          completedAt: done ? sql`coalesce(${schema.lessonProgress.completedAt}, now())` : schema.lessonProgress.completedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (body.completed === false) {
      // bỏ đánh dấu hoàn thành thủ công
      await db
        .update(schema.lessonProgress)
        .set({ completedAt: null, percent: Math.min(percent, 89) })
        .where(and(eq(schema.lessonProgress.userId, u.id), eq(schema.lessonProgress.lessonId, req.params.id)));
      row.completedAt = null;
    }
    await db.update(schema.users).set({ lastActiveAt: new Date() }).where(eq(schema.users.id, u.id));
    const course = (await courseProgress(u.id, [lc.courseId])).get(lc.courseId);
    return { percent: row.percent, completed: !!row.completedAt, course };
  });

  /** Bài học gần đây của tôi. */
  app.get("/api/me/lessons/recent", async (req) => {
    const u = await requireUser(req);
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(20).default(5) }), req.query);
    const rows = await db
      .select({
        id: L.id,
        slug: L.slug,
        title: L.title,
        type: L.type,
        percent: schema.lessonProgress.percent,
        completedAt: schema.lessonProgress.completedAt,
        updatedAt: schema.lessonProgress.updatedAt,
        course: { slug: C.slug, title: C.title, level: C.level, category: C.category },
      })
      .from(schema.lessonProgress)
      .innerJoin(L, eq(L.id, schema.lessonProgress.lessonId))
      .innerJoin(M, eq(M.id, L.moduleId))
      .innerJoin(C, eq(C.id, M.courseId))
      .where(eq(schema.lessonProgress.userId, u.id))
      .orderBy(desc(schema.lessonProgress.updatedAt))
      .limit(limit);
    return { items: rows };
  });

  /* ---------------------------- Ghi chú ---------------------------- */

  app.get<{ Params: { id: string } }>("/api/me/lessons/:id/notes", async (req) => {
    const u = await requireUser(req);
    const items = await db
      .select()
      .from(schema.notes)
      .where(and(eq(schema.notes.userId, u.id), eq(schema.notes.lessonId, req.params.id)))
      .orderBy(asc(schema.notes.atSec), asc(schema.notes.createdAt));
    return { items };
  });

  /** Ghi chú của tôi trong cả khóa (tab "Ghi chú của tôi" ở sidebar). */
  app.get<{ Params: { id: string } }>("/api/me/courses/:id/notes", async (req) => {
    const u = await requireUser(req);
    const items = await db
      .select({
        id: schema.notes.id,
        atSec: schema.notes.atSec,
        content: schema.notes.content,
        createdAt: schema.notes.createdAt,
        lesson: { id: L.id, slug: L.slug, title: L.title },
      })
      .from(schema.notes)
      .innerJoin(L, eq(L.id, schema.notes.lessonId))
      .innerJoin(M, eq(M.id, L.moduleId))
      .where(and(eq(schema.notes.userId, u.id), eq(M.courseId, req.params.id)))
      .orderBy(desc(schema.notes.createdAt))
      .limit(50);
    return { items };
  });

  const noteBody = z.object({ content: z.string().trim().min(1, "Vui lòng nhập ghi chú").max(2000), atSec: z.coerce.number().int().min(0).default(0) });

  app.post<{ Params: { id: string } }>("/api/me/lessons/:id/notes", async (req, reply) => {
    const u = await requireUser(req);
    const body = parse(noteBody, req.body);
    await lessonCourse(req.params.id);
    const [row] = await db.insert(schema.notes).values({ ...body, userId: u.id, lessonId: req.params.id }).returning();
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/me/notes/:id", async (req) => {
    const u = await requireUser(req);
    const body = parse(noteBody.partial(), req.body);
    const [row] = await db
      .update(schema.notes)
      .set(body)
      .where(and(eq(schema.notes.id, req.params.id), eq(schema.notes.userId, u.id)))
      .returning();
    if (!row) throw notFound();
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/me/notes/:id", async (req, reply) => {
    const u = await requireUser(req);
    const r = await db.delete(schema.notes).where(and(eq(schema.notes.id, req.params.id), eq(schema.notes.userId, u.id))).returning();
    if (!r.length) throw notFound();
    return reply.code(204).send();
  });

  /* ---------------------------- Từ vựng & lưu bài ---------------------------- */

  app.post<{ Params: { id: string } }>("/api/me/vocab/:id/save", async (req) => {
    const u = await requireUser(req);
    const ins = await db
      .insert(schema.savedVocab)
      .values({ userId: u.id, vocabId: req.params.id })
      .onConflictDoNothing()
      .returning()
      .catch(() => {
        throw notFound("Không tìm thấy từ vựng");
      });
    if (ins.length) return { saved: true };
    await db.delete(schema.savedVocab).where(and(eq(schema.savedVocab.userId, u.id), eq(schema.savedVocab.vocabId, req.params.id)));
    return { saved: false };
  });

  app.get("/api/me/vocab", async (req) => {
    const u = await requireUser(req);
    const items = await db
      .select({
        id: schema.vocab.id,
        word: schema.vocab.word,
        reading: schema.vocab.reading,
        romaji: schema.vocab.romaji,
        meaning: schema.vocab.meaning,
        pos: schema.vocab.pos,
        savedAt: schema.savedVocab.createdAt,
        lesson: { slug: L.slug, title: L.title },
      })
      .from(schema.savedVocab)
      .innerJoin(schema.vocab, eq(schema.vocab.id, schema.savedVocab.vocabId))
      .leftJoin(L, eq(L.id, schema.vocab.lessonId))
      .where(eq(schema.savedVocab.userId, u.id))
      .orderBy(desc(schema.savedVocab.createdAt));
    return { items };
  });

  app.post<{ Params: { id: string } }>("/api/me/lessons/:id/bookmark", async (req) => {
    const u = await requireUser(req);
    await lessonCourse(req.params.id);
    const ins = await db
      .insert(schema.bookmarks)
      .values({ userId: u.id, targetType: "lesson", targetId: req.params.id })
      .onConflictDoNothing()
      .returning();
    if (ins.length) return { bookmarked: true };
    await db
      .delete(schema.bookmarks)
      .where(and(eq(schema.bookmarks.userId, u.id), eq(schema.bookmarks.targetType, "lesson"), eq(schema.bookmarks.targetId, req.params.id)));
    return { bookmarked: false };
  });

  /** Tăng lượt tải tài liệu và trả URL (kiểm tra quyền). */
  app.post<{ Params: { id: string } }>("/api/public/lesson-resources/:id/download", async (req) => {
    const user = await optionalUser(req);
    const [r] = await db.select().from(schema.resources).where(eq(schema.resources.id, req.params.id));
    if (!r) throw notFound();
    if (!r.isFree) {
      let courseId = r.courseId;
      let isFreeLesson = false;
      if (r.lessonId) {
        const lc = await lessonCourse(r.lessonId);
        courseId = lc.courseId;
        isFreeLesson = lc.isFree;
      }
      const ok = isFreeLesson || (user && (user.role !== "student" || (courseId && (await isEnrolled(user.id, courseId)))));
      if (!ok) throw new HttpError(403, "Bạn cần đăng ký khóa học để tải tài liệu này");
    }
    await db.update(schema.resources).set({ downloads: sql`${schema.resources.downloads} + 1` }).where(eq(schema.resources.id, r.id));
    return { url: r.fileUrl };
  });
}
