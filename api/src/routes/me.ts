import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, schema } from "../db/index.js";
import { HttpError, badRequest, notFound, parse } from "../lib/http.js";
import { requireUser } from "../lib/auth.js";
import { putPublic } from "../lib/storage.js";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const zLevel = z.enum(LEVELS);

export const SKILL_LABEL: Record<string, string> = {
  grammar: "Ngữ pháp",
  vocab: "Từ vựng",
  listening: "Luyện nghe",
  reading: "Đọc hiểu",
  speaking: "Luyện nói",
  kanji: "Kanji",
};
const SKILL_ORDER = ["grammar", "vocab", "listening", "reading", "speaking"];
const CATEGORY_LABEL: Record<string, string> = {
  level: "Ngữ pháp",
  jlpt: "Luyện thi JLPT",
  communication: "Giao tiếp",
  kanji: "Kanji",
  business: "Thương mại",
  grammar: "Ngữ pháp",
  vocab: "Từ vựng",
};
const QUIZ_SKILL_LABEL: Record<string, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  kanji: "Kanji",
  listening: "Nghe hiểu",
  jlpt: "JLPT",
  reading: "Đọc hiểu",
  communication: "Giao tiếp",
};

/* --------------------------- Tiện ích ngày --------------------------- */

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const DAY_LABEL = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function weekStart(offset: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (today.getDay() + 6) % 7; // 0 = thứ Hai
  return addDays(today, -dow + offset * 7);
}

/* ----------------------------- Truy vấn ------------------------------ */

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  durationSec: number;
  quizId: string | null;
  percent: number | null;
  completedAt: string | null;
  updatedAt: string | null;
};

async function courseLessons(courseId: string, userId: string) {
  return db.execute<LessonRow>(sql`
    select l.id, l.slug, l.title, l.type, l.duration_sec as "durationSec", l.quiz_id as "quizId",
      lp.percent, lp.completed_at as "completedAt", lp.updated_at as "updatedAt"
    from lessons l join modules m on m.id = l.module_id
    left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = ${userId}
    where m.course_id = ${courseId} and l.status = 'published'
    order by m."order", l."order"`);
}

async function streakOf(userId: string, fallback: number) {
  const days = await db.execute<{ day: string }>(sql`
    select distinct day::text as day from study_sessions where user_id = ${userId} and day >= ${ymd(addDays(new Date(), -400))}::date order by day desc`);
  if (!days.length) return fallback;
  const set = new Set(days.map((d) => d.day));
  let cur = new Date();
  if (!set.has(ymd(cur))) cur = addDays(cur, -1);
  let n = 0;
  while (set.has(ymd(cur))) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

async function planOf(userId: string, offset: number) {
  const start = weekStart(offset);
  const end = addDays(start, 6);
  const todayStr = ymd(new Date());
  const [items, sessions] = await Promise.all([
    db.execute<{ id: string; day: string; title: string; kind: string; minutes: number; done: boolean }>(sql`
      select id, day::text as day, title, kind, minutes, done from plan_items
      where user_id = ${userId} and day between ${ymd(start)}::date and ${ymd(end)}::date
      order by day, case kind when 'review' then 0 when 'lesson' then 1 when 'listening' then 2 when 'exercise' then 3 else 4 end, title`),
    db.execute<{ day: string; skill: string; minutes: number; lessons: number }>(sql`
      select day::text as day, skill, sum(minutes)::int as minutes, sum(lessons)::int as lessons from study_sessions
      where user_id = ${userId} and day between ${ymd(start)}::date and ${ymd(end)}::date
      group by day, skill`),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const key = ymd(d);
    const its = items.filter((x) => x.day === key);
    const ses = sessions.filter((s) => s.day === key);
    const minutes = ses.reduce((a, s) => a + s.minutes, 0);
    const status =
      key === todayStr
        ? "today"
        : key < todayStr
          ? minutes > 0 || (its.length > 0 && its.every((x) => x.done))
            ? "done"
            : "missed"
          : "todo";
    return { date: key, label: DAY_LABEL[i], short: ddmm(d), status, minutes, lessons: ses.reduce((a, s) => a + s.lessons, 0) };
  });

  const skillTotals = SKILL_ORDER.map((k) => ({
    skill: k,
    label: SKILL_LABEL[k],
    minutes: sessions.filter((s) => s.skill === k).reduce((a, s) => a + s.minutes, 0),
    lessons: sessions.filter((s) => s.skill === k).reduce((a, s) => a + s.lessons, 0),
  }));
  const total = skillTotals.reduce((a, s) => a + s.minutes, 0);
  return {
    offset,
    start: ymd(start),
    end: ymd(end),
    today: todayStr,
    days,
    items,
    skills: skillTotals.map((s) => ({ ...s, percent: total ? Math.round((s.minutes / total) * 100) : 0 })),
    totalMinutes: total,
  };
}

/** 7 ngày gần nhất (kết thúc hôm nay) — biểu đồ "Theo tuần" và vòng kỹ năng. */
async function last7(userId: string) {
  const end = new Date();
  const start = addDays(end, -6);
  const rows = await db.execute<{ day: string; skill: string; minutes: number; lessons: number }>(sql`
    select day::text as day, skill, sum(minutes)::int as minutes, sum(lessons)::int as lessons from study_sessions
    where user_id = ${userId} and day between ${ymd(start)}::date and ${ymd(end)}::date group by day, skill`);
  const bars = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const key = ymd(d);
    const rs = rows.filter((r) => r.day === key);
    return { label: DAY_LABEL[(d.getDay() + 6) % 7], sub: ddmm(d), minutes: rs.reduce((a, r) => a + r.minutes, 0), lessons: rs.reduce((a, r) => a + r.lessons, 0) };
  });
  const skills = SKILL_ORDER.map((k) => ({
    skill: k,
    label: SKILL_LABEL[k],
    minutes: rows.filter((r) => r.skill === k).reduce((a, r) => a + r.minutes, 0),
    lessons: rows.filter((r) => r.skill === k).reduce((a, r) => a + r.lessons, 0),
  }));
  const total = skills.reduce((a, s) => a + s.minutes, 0);
  return { bars, skills: skills.map((s) => ({ ...s, percent: total ? Math.round((s.minutes / total) * 100) : 0 })), totalMinutes: total };
}

async function monthChart(userId: string) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const rows = await db.execute<{ m: string; minutes: number; lessons: number }>(sql`
    select to_char(day, 'YYYY-MM') as m, sum(minutes)::int as minutes, sum(lessons)::int as lessons
    from study_sessions where user_id = ${userId} and day >= ${ymd(from)}::date group by 1`);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const r = rows.find((x) => x.m === key);
    return { label: `T${d.getMonth() + 1}`, sub: String(d.getFullYear()), minutes: r?.minutes ?? 0, lessons: r?.lessons ?? 0 };
  });
}

export default async function meRoutes(app: FastifyInstance) {
  /** Gói nhỏ cho header (tên, avatar, chuỗi ngày, số thông báo chưa đọc). */
  app.get("/api/me/summary", async (req) => {
    const au = await requireUser(req);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, au.id));
    const [counts] = await db.execute<{ unread: number; tickets: number }>(sql`
      select
        (select count(*)::int from notifications n
          where (n.sent_at is not null or n.scheduled_at <= now())
            and (n.audience = 'all' or (n.audience = 'students' and ${u.role} = 'student') or (n.audience = 'teachers' and ${u.role} = 'teacher')
                 or (n.audience = 'level' and n.level::text = ${u.level ?? ""}) or (n.audience = 'user' and n.user_id = ${u.id}))
            and not exists (select 1 from notification_reads r where r.notification_id = n.id and r.user_id = ${u.id})) as unread,
        (select count(*)::int from tickets t where t.user_id = ${u.id} and t.status in ('open', 'pending')) as tickets`);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl,
      level: u.level,
      targetLevel: u.targetLevel,
      streak: await streakOf(u.id, u.streak),
      xp: u.xp,
      unreadNotifications: counts.unread,
      openTickets: counts.tickets,
    };
  });

  /** Toàn bộ dữ liệu cho trang /dashboard của học viên. */
  app.get("/api/me/dashboard", async (req) => {
    const au = await requireUser(req);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, au.id));
    const userId = u.id;

    // Khóa học đã ghi danh (nếu chưa có, lấy các khóa có tiến độ học).
    let courseRows = await db.execute<{ id: string; slug: string; title: string; level: string | null; category: string; lastAt: string | null; enrolledAt: string | null }>(sql`
      select c.id, c.slug, c.title, c.level, c.category, e.created_at as "enrolledAt",
        (select max(lp.updated_at) from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
          where m.course_id = c.id and lp.user_id = ${userId}) as "lastAt"
      from enrollments e join courses c on c.id = e.course_id
      where e.user_id = ${userId} and e.status = 'active'`);
    if (!courseRows.length)
      courseRows = await db.execute(sql`
        select distinct c.id, c.slug, c.title, c.level, c.category, null as "enrolledAt",
          max(lp.updated_at) over (partition by c.id) as "lastAt"
        from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id join courses c on c.id = m.course_id
        where lp.user_id = ${userId}`);
    const courseIds = courseRows.map((c) => c.id);

    const [totals] = courseIds.length
      ? await db.execute<{ total: number; done: number }>(sql`
          select count(*)::int as total, count(lp.completed_at)::int as done
          from lessons l join modules m on m.id = l.module_id
          left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = ${userId}
          where l.status = 'published' and m.course_id in ${sql`(${sql.join(courseIds.map((id) => sql`${id}`), sql`, `)})`}`)
      : [{ total: 0, done: 0 }];

    // Khóa hiện tại = khóa có hoạt động gần nhất chưa hoàn thành.
    const sorted = [...courseRows].sort((a, b) => String(b.lastAt ?? b.enrolledAt ?? "").localeCompare(String(a.lastAt ?? a.enrolledAt ?? "")));
    let current: (typeof courseRows)[number] | undefined;
    let lessons: LessonRow[] = [];
    for (const c of sorted) {
      const ls = [...(await courseLessons(c.id, userId))];
      if (ls.some((l) => !l.completedAt) || c === sorted[sorted.length - 1]) {
        current = c;
        lessons = ls;
        break;
      }
    }

    let currentCourse = null;
    let nextLesson = null;
    if (current && lessons.length) {
      const idx = Math.max(0, lessons.findIndex((l) => !l.completedAt));
      const cur = lessons[idx];
      const nxt = lessons.slice(idx + 1).find((l) => !l.completedAt);
      const [counts] = await db.execute<{ vocab: number; questions: number }>(sql`
        select (select count(*)::int from vocab v where v.lesson_id = ${cur.id}) as vocab,
               (select count(*)::int from questions q where q.quiz_id = ${cur.quizId ?? ""}) as questions`);
      const done = lessons.filter((l) => l.completedAt).length;
      const [{ today }] = await db.execute<{ today: number }>(sql`
        select count(*)::int as today from study_sessions where user_id = ${userId} and day = ${ymd(new Date())}::date`);
      currentCourse = {
        id: current.id,
        slug: current.slug,
        title: current.title,
        level: current.level,
        category: CATEGORY_LABEL[current.category] ?? current.category,
        percent: Math.round((done / lessons.length) * 100),
        completed: done,
        total: lessons.length,
        lesson: { slug: cur.slug, title: cur.title, position: idx + 1, percent: cur.percent ?? 0 },
        counts: { videoMin: Math.max(1, Math.round(cur.durationSec / 60)), exercises: counts.questions, vocab: counts.vocab },
      };
      if (nxt)
        nextLesson = {
          slug: nxt.slug,
          title: nxt.title,
          position: lessons.indexOf(nxt) + 1,
          level: current.level,
          tag: `${current.level ?? ""} · ${CATEGORY_LABEL[current.category] ?? current.category}`,
          minutes: Math.max(5, Math.round(nxt.durationSec / 60)),
          when: today > 0 ? "Ngày mai" : "Hôm nay",
        };
    }

    // Mục tiêu JLPT: các cấp dưới cấp hiện tại coi như đã xong + tiến độ ở cấp hiện tại.
    const lvIdx = Math.max(0, LEVELS.indexOf((u.level ?? "N5") as (typeof LEVELS)[number]));
    const tgIdx = Math.max(lvIdx, LEVELS.indexOf((u.targetLevel ?? u.level ?? "N4") as (typeof LEVELS)[number]));
    const levelCourses = courseRows.filter((c) => c.level === u.level).map((c) => c.id);
    const [lvl] = levelCourses.length
      ? await db.execute<{ total: number; done: number }>(sql`
          select count(*)::int as total, count(lp.completed_at)::int as done
          from lessons l join modules m on m.id = l.module_id
          left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = ${userId}
          where m.course_id in ${sql`(${sql.join(levelCourses.map((id) => sql`${id}`), sql`, `)})`}`)
      : [{ total: 0, done: 0 }];
    const goalPercent = Math.min(100, Math.round(((lvIdx + (lvl.total ? lvl.done / lvl.total : 0)) / (tgIdx + 1)) * 100));

    const [plan, recent7, month, recent, saved, suggested, achievements] = await Promise.all([
      planOf(userId, 0),
      last7(userId),
      monthChart(userId),
      db.execute<{ slug: string; title: string; courseTitle: string; level: string | null; category: string; percent: number; updatedAt: string }>(sql`
        select l.slug, l.title, c.title as "courseTitle", c.level, c.category, lp.percent, to_json(lp.updated_at)#>>'{}' as "updatedAt"
        from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id join courses c on c.id = m.course_id
        where lp.user_id = ${userId} order by lp.updated_at desc limit 4`),
      db
        .select({ id: schema.vocab.id, word: schema.vocab.word, reading: schema.vocab.reading, meaning: schema.vocab.meaning, pos: schema.vocab.pos })
        .from(schema.savedVocab)
        .innerJoin(schema.vocab, eq(schema.vocab.id, schema.savedVocab.vocabId))
        .where(eq(schema.savedVocab.userId, userId))
        .orderBy(desc(schema.savedVocab.createdAt))
        .limit(3),
      db.execute<{ slug: string; title: string; skill: string; level: string; durationMin: number; questions: number }>(sql`
        select q.slug, q.title, q.skill, q.level, q.duration_min as "durationMin",
          (select count(*)::int from questions x where x.quiz_id = q.id) as questions
        from quizzes q
        where q.kind = 'exercise' and q.status = 'published'
          and not exists (select 1 from attempts a where a.quiz_id = q.id and a.user_id = ${userId})
        order by (q.level::text = ${u.level ?? "N5"}) desc, q.featured desc, q.created_at desc
        limit 3`),
      db.execute<{ code: string; title: string; description: string | null; icon: string | null; tone: string | null; earnedAt: string | null }>(sql`
        select a.code, a.title, a.description, a.icon, a.tone, to_json(ua.created_at)#>>'{}' as "earnedAt"
        from achievements a left join user_achievements ua on ua.achievement_id = a.id and ua.user_id = ${userId}
        order by ua.created_at is null, ua.created_at, a.code`),
    ]);
    const [{ savedTotal }] = await db.execute<{ savedTotal: number }>(sql`select count(*)::int as "savedTotal" from saved_vocab where user_id = ${userId}`);
    const earned = achievements.filter((a) => a.earnedAt).length;

    return {
      user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl, role: u.role, level: u.level, targetLevel: u.targetLevel, targetDate: u.targetDate, xp: u.xp },
      progress: { percent: totals.total ? Math.round((totals.done / totals.total) * 100) : 0, completed: totals.done, total: totals.total },
      streak: await streakOf(userId, u.streak),
      nextLesson,
      goal: { level: u.targetLevel, date: u.targetDate, percent: goalPercent },
      badges: { earned, total: achievements.length },
      currentCourse,
      plan,
      skills: { items: recent7.skills, totalMinutes: recent7.totalMinutes },
      chart: {
        week: recent7.bars,
        month,
        skill: recent7.skills.map((s) => ({ label: s.label.replace("Luyện ", "").replace(" hiểu", ""), sub: "", minutes: s.minutes, lessons: s.lessons })),
      },
      recentLessons: recent.map((r) => ({ ...r, tag: `${r.level ?? ""} · ${CATEGORY_LABEL[r.category] ?? r.category}` })),
      savedVocab: { items: saved, total: savedTotal },
      suggested: suggested.map((s) => ({ ...s, skillLabel: QUIZ_SKILL_LABEL[s.skill] ?? s.skill })),
      achievements: achievements.map((a) => ({ ...a, earned: !!a.earnedAt })),
    };
  });

  /** Kế hoạch tuần + biểu đồ tuần (week = độ lệch tuần so với tuần này). */
  app.get("/api/me/plan", async (req) => {
    const u = await requireUser(req);
    const { week } = parse(z.object({ week: z.coerce.number().int().min(-104).max(104).default(0) }), req.query);
    return planOf(u.id, week);
  });

  app.patch<{ Params: { id: string } }>("/api/me/plan-items/:id", async (req) => {
    const u = await requireUser(req);
    const b = parse(z.object({ done: z.boolean() }), req.body);
    const [row] = await db
      .update(schema.planItems)
      .set({ done: b.done })
      .where(and(eq(schema.planItems.id, req.params.id), eq(schema.planItems.userId, u.id)))
      .returning();
    if (!row) throw notFound("Không tìm thấy nhiệm vụ");
    return row;
  });

  /** Bỏ lưu / lưu lại từ vựng từ dashboard. */
  app.post<{ Params: { id: string } }>("/api/me/dashboard/saved-vocab/:id", async (req) => {
    const u = await requireUser(req);
    const b = parse(z.object({ saved: z.boolean() }), req.body);
    if (b.saved) await db.insert(schema.savedVocab).values({ userId: u.id, vocabId: req.params.id }).onConflictDoNothing();
    else await db.delete(schema.savedVocab).where(and(eq(schema.savedVocab.userId, u.id), eq(schema.savedVocab.vocabId, req.params.id)));
    return { ok: true, saved: b.saved };
  });

  /* ------------------------------ Hồ sơ ------------------------------ */

  app.get("/api/me/profile", async (req) => {
    const au = await requireUser(req);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, au.id));
    const { passwordHash: _ph, ...safe } = u;
    return safe;
  });

  app.patch("/api/me/profile", async (req) => {
    const au = await requireUser(req);
    const b = parse(
      z.object({
        name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(80).optional(),
        phone: z
          .string()
          .trim()
          .regex(/^[0-9+ ().-]{8,20}$/, "Số điện thoại không hợp lệ")
          .or(z.literal(""))
          .optional()
          .nullable(),
        avatarUrl: z.string().trim().max(500).optional().nullable(),
        level: zLevel.optional().nullable(),
        targetLevel: zLevel.optional().nullable(),
        targetDate: z
          .string()
          .trim()
          .regex(/^(0?[1-9]|1[0-2])\/\d{4}$/, "Định dạng MM/YYYY")
          .or(z.literal(""))
          .optional()
          .nullable(),
        bio: z.string().trim().max(1000).optional().nullable(),
      }),
      req.body,
    );
    const data = { ...b, phone: b.phone || null, targetDate: b.targetDate === "" ? null : b.targetDate };
    const [u] = await db.update(schema.users).set(data).where(eq(schema.users.id, au.id)).returning();
    const { passwordHash: _ph, ...safe } = u;
    return safe;
  });

  /** Ảnh đại diện: chuyển WebP vuông 512px, xoá bản gốc (không lưu). */
  app.post("/api/me/avatar", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const au = await requireUser(req);
    const file = await req.file({ limits: { fileSize: 8 * 1024 * 1024 } });
    if (!file) throw badRequest("Chưa chọn ảnh");
    if (!file.mimetype.startsWith("image/")) throw badRequest("Tệp phải là ảnh");
    const buf = await file.toBuffer();
    if (file.file.truncated) throw new HttpError(413, "Ảnh tối đa 8MB");
    let out: Buffer;
    try {
      out = await sharp(buf, { failOn: "none" }).rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
    } catch {
      throw badRequest("Không đọc được ảnh");
    }
    const url = await putPublic(`avatars/${au.id}-${Date.now().toString(36)}.webp`, out, "image/webp");
    await db.update(schema.users).set({ avatarUrl: url }).where(eq(schema.users.id, au.id));
    return { url };
  });
}
