import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { HttpError, allOf, countAll, listQuery, notFound, orderOf, pageOf, parse, searchWhere } from "../lib/http.js";
import { logActivity, requirePerm, requireUser, type AuthUser } from "../lib/auth.js";

const { notifications: N, notificationReads: R, users } = schema;

const body = z
  .object({
    title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự"),
    body: z.string().trim().min(1, "Nhập nội dung"),
    audience: z.enum(["all", "students", "teachers", "level", "user"]).default("all"),
    level: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional().nullable(),
    userId: z.string().optional().nullable(),
    channels: z.array(z.enum(["in_app", "email", "push"])).min(1, "Chọn ít nhất 1 kênh").default(["in_app"]),
    link: z.string().trim().optional().nullable(),
    scheduledAt: z.coerce.date().optional().nullable(),
    /** true = gửi ngay; false + scheduledAt = hẹn giờ; false không có scheduledAt = lưu nháp. */
    sendNow: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.audience === "level" && !v.level) ctx.addIssue({ code: "custom", path: ["level"], message: "Chọn cấp độ" });
    if (v.audience === "user" && !v.userId) ctx.addIssue({ code: "custom", path: ["userId"], message: "Chọn người nhận" });
  });

/** Đã đến tay người nhận: đã gửi, hoặc giờ hẹn đã qua. */
const delivered = sql`(${N.sentAt} is not null or (${N.scheduledAt} is not null and ${N.scheduledAt} <= now()))`;

const recipients = sql<number>`(case ${N.audience}
  when 'all' then (select count(*) from users where status = 'active')
  when 'students' then (select count(*) from users where role = 'student' and status = 'active')
  when 'teachers' then (select count(*) from users where role = 'teacher' and status = 'active')
  when 'level' then (select count(*) from users where role = 'student' and status = 'active' and level = ${N.level})
  else 1 end)::int`;

function audienceWhere(u: AuthUser & { level?: string | null }) {
  return sql`(${N.audience} = 'all'
    or (${N.audience} = 'students' and ${u.role} = 'student')
    or (${N.audience} = 'teachers' and ${u.role} = 'teacher')
    or (${N.audience} = 'level' and ${N.level}::text = ${u.level ?? ""})
    or (${N.audience} = 'user' and ${N.userId} = ${u.id}))`;
}

function statusOf(n: { sentAt: Date | null; scheduledAt: Date | null }) {
  if (n.sentAt) return "sent";
  if (n.scheduledAt) return n.scheduledAt.getTime() <= Date.now() ? "sent" : "scheduled";
  return "draft";
}

async function meWithLevel(req: Parameters<typeof requireUser>[0]) {
  const u = await requireUser(req);
  const [row] = await db.select({ level: users.level }).from(users).where(eq(users.id, u.id));
  return { ...u, level: row?.level ?? null };
}

export default async function notificationRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("notifications.read") };
  const write = { preHandler: requirePerm("notifications.write") };

  /* ------------------------------ Admin ------------------------------ */

  app.get("/api/admin/notifications", read, async (req) => {
    const q = parse(listQuery.extend({ status: z.enum(["sent", "scheduled", "draft"]).optional().or(z.literal("")), audience: z.string().optional() }), req.query);
    const where = allOf(
      searchWhere(q.q, [N.title]),
      q.audience ? eq(N.audience, q.audience as "all") : undefined,
      q.status === "sent" ? delivered : undefined,
      q.status === "scheduled" ? sql`${N.sentAt} is null and ${N.scheduledAt} > now()` : undefined,
      q.status === "draft" ? sql`${N.sentAt} is null and ${N.scheduledAt} is null` : undefined,
    );
    const { limit, offset } = pageOf(q);
    const [rows, [{ total }], [counts]] = await Promise.all([
      db
        .select({
          id: N.id,
          title: N.title,
          body: N.body,
          audience: N.audience,
          level: N.level,
          userId: N.userId,
          userName: users.name,
          channels: N.channels,
          link: N.link,
          scheduledAt: N.scheduledAt,
          sentAt: N.sentAt,
          createdAt: N.createdAt,
          readCount: sql<number>`(select count(*)::int from notification_reads r where r.notification_id = ${N.id})`,
          recipients,
        })
        .from(N)
        .leftJoin(users, eq(users.id, N.userId))
        .where(where)
        .orderBy(orderOf(q, { createdAt: N.createdAt, title: N.title, scheduledAt: N.scheduledAt }, N.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(N).where(where),
      db.execute<{ sent: number; scheduled: number; draft: number; reads: number }>(sql`
        select
          count(*) filter (where sent_at is not null or scheduled_at <= now())::int as sent,
          count(*) filter (where sent_at is null and scheduled_at > now())::int as scheduled,
          count(*) filter (where sent_at is null and scheduled_at is null)::int as draft,
          (select count(*)::int from notification_reads) as reads
        from notifications`),
    ]);
    const items = rows.map((r) => ({ ...r, status: statusOf(r) }));
    return { items, total, page: q.page, pageSize: q.pageSize, counts };
  });

  app.get<{ Params: { id: string } }>("/api/admin/notifications/:id", read, async (req) => {
    const [n] = await db.select({ n: N, recipients }).from(N).where(eq(N.id, req.params.id));
    if (!n) throw notFound();
    const [{ reads }] = await db.select({ reads: countAll }).from(R).where(eq(R.notificationId, n.n.id));
    return { ...n.n, recipients: n.recipients, readCount: reads, status: statusOf(n.n) };
  });

  app.post("/api/admin/notifications", write, async (req, reply) => {
    const me = await requireUser(req);
    const { sendNow, ...b } = parse(body, req.body);
    if (b.scheduledAt && !sendNow && b.scheduledAt.getTime() < Date.now() - 60_000)
      throw new HttpError(400, "Dữ liệu không hợp lệ", [{ path: "scheduledAt", message: "Thời gian hẹn phải ở tương lai" }]);
    const [n] = await db
      .insert(N)
      .values({
        ...b,
        level: b.audience === "level" ? b.level : null,
        userId: b.audience === "user" ? b.userId : null,
        scheduledAt: sendNow ? null : b.scheduledAt,
        sentAt: sendNow ? new Date() : null,
        createdById: me.id,
      })
      .returning();
    const st = statusOf(n);
    await logActivity(req, st === "sent" ? "send" : st === "scheduled" ? "schedule" : "create", "notification", n.id, `${st === "sent" ? "Gửi" : st === "scheduled" ? "Hẹn giờ" : "Lưu nháp"} thông báo “${n.title}”`);
    return reply.code(201).send({ ...n, status: st });
  });

  app.patch<{ Params: { id: string } }>("/api/admin/notifications/:id", write, async (req) => {
    const [cur] = await db.select().from(N).where(eq(N.id, req.params.id));
    if (!cur) throw notFound();
    if (statusOf(cur) === "sent") throw new HttpError(409, "Thông báo đã gửi, không thể chỉnh sửa");
    const { sendNow, ...b } = parse(body, req.body);
    const [n] = await db
      .update(N)
      .set({
        ...b,
        level: b.audience === "level" ? b.level : null,
        userId: b.audience === "user" ? b.userId : null,
        scheduledAt: sendNow ? null : (b.scheduledAt ?? null),
        sentAt: sendNow ? new Date() : null,
      })
      .where(eq(N.id, cur.id))
      .returning();
    await logActivity(req, sendNow ? "send" : "update", "notification", n.id, `${sendNow ? "Gửi" : "Cập nhật"} thông báo “${n.title}”`);
    return { ...n, status: statusOf(n) };
  });

  app.post<{ Params: { id: string } }>("/api/admin/notifications/:id/send", write, async (req) => {
    const [n] = await db.update(N).set({ sentAt: new Date() }).where(and(eq(N.id, req.params.id), sql`${N.sentAt} is null`)).returning();
    if (!n) throw new HttpError(409, "Thông báo không tồn tại hoặc đã gửi");
    await logActivity(req, "send", "notification", n.id, `Gửi thông báo “${n.title}”`);
    return { ...n, status: "sent" };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/notifications/:id", write, async (req, reply) => {
    const [n] = await db.delete(N).where(eq(N.id, req.params.id)).returning();
    if (!n) throw notFound();
    await logActivity(req, "delete", "notification", n.id, `Xoá thông báo “${n.title}”`);
    return reply.code(204).send();
  });

  /** Tra cứu người nhận (audience = user). */
  app.get("/api/admin/notifications/recipients/search", read, async (req) => {
    const { q } = parse(z.object({ q: z.string().trim().default("") }), req.query);
    return db
      .select({ value: users.id, label: users.name, email: users.email, role: users.role })
      .from(users)
      .where(searchWhere(q, [users.name, users.email]))
      .orderBy(users.name)
      .limit(15);
  });

  /* ----------------------------- Học viên ---------------------------- */

  app.get("/api/me/notifications", async (req) => {
    const u = await meWithLevel(req);
    const q = parse(z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), unread: z.coerce.boolean().optional() }), req.query);
    const isRead = sql<boolean>`exists (select 1 from notification_reads r where r.notification_id = ${N.id} and r.user_id = ${u.id})`;
    const rows = await db
      .select({ id: N.id, title: N.title, body: N.body, link: N.link, audience: N.audience, at: sql<string>`to_json(coalesce(${N.sentAt}, ${N.scheduledAt}))#>>'{}'`, read: isRead })
      .from(N)
      .where(and(delivered, audienceWhere(u), q.unread ? sql`not ${isRead}` : undefined))
      .orderBy(desc(sql`coalesce(${N.sentAt}, ${N.scheduledAt})`))
      .limit(q.limit);
    const unread = await unreadCount(u);
    return { items: rows, unread };
  });

  async function unreadCount(u: AuthUser & { level?: string | null }) {
    const [{ n }] = await db
      .select({ n: countAll })
      .from(N)
      .where(and(delivered, audienceWhere(u), sql`not exists (select 1 from notification_reads r where r.notification_id = ${N.id} and r.user_id = ${u.id})`));
    return n;
  }

  app.get("/api/me/notifications/unread-count", async (req) => ({ unread: await unreadCount(await meWithLevel(req)) }));

  /** Đánh dấu đã đọc: { id } một thông báo, hoặc {} / { all: true } tất cả. */
  app.post("/api/me/notifications/read", async (req) => {
    const u = await meWithLevel(req);
    const b = parse(z.object({ id: z.string().optional(), all: z.boolean().optional() }), req.body ?? {});
    const ids = b.id
      ? [b.id]
      : (await db.select({ id: N.id }).from(N).where(and(delivered, audienceWhere(u)))).map((r) => r.id);
    if (ids.length) await db.insert(R).values(ids.map((id) => ({ notificationId: id, userId: u.id }))).onConflictDoNothing();
    return { ok: true, unread: await unreadCount(u) };
  });
}
