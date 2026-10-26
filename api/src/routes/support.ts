import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema, } from "../db/index.js";
import { allOf, countAll, listQuery, notFound, orderOf, pageOf, parse, searchWhere } from "../lib/http.js";
import { logActivity, requirePerm, requireUser } from "../lib/auth.js";
import type { TicketReply } from "../db/schema.js";

const { tickets: T, users } = schema;
const assignee = alias(users, "assignee");

export const TICKET_CATEGORIES = {
  general: "Chung",
  account: "Tài khoản",
  payment: "Thanh toán",
  course: "Khóa học",
  technical: "Lỗi kỹ thuật",
  content: "Nội dung",
} as const;
const zCategory = z.enum(Object.keys(TICKET_CATEGORIES) as [keyof typeof TICKET_CATEGORIES]);
const zStatus = z.enum(["open", "pending", "resolved", "closed"]);
const zPriority = z.enum(["low", "normal", "high", "urgent"]);

const listCols = {
  id: T.id,
  code: T.code,
  subject: T.subject,
  message: T.message,
  category: T.category,
  status: T.status,
  priority: T.priority,
  assigneeId: T.assigneeId,
  assigneeName: assignee.name,
  userId: T.userId,
  userName: users.name,
  userEmail: users.email,
  userAvatar: users.avatarUrl,
  replyCount: sql<number>`jsonb_array_length(${T.replies})::int`,
  lastReplyStaff: sql<boolean | null>`(${T.replies} -> -1 ->> 'staff')::boolean`,
  createdAt: T.createdAt,
  updatedAt: T.updatedAt,
};

async function nextCode() {
  const [{ n }] = await db.select({ n: countAll }).from(T);
  return `TK${String(1000 + n + 1)}${Math.floor(Math.random() * 90 + 10)}`;
}

async function loadTicket(id: string) {
  const [t] = await db
    .select({ ...listCols, replies: T.replies, userPhone: users.phone, userLevel: users.level, userCreatedAt: users.createdAt })
    .from(T)
    .leftJoin(users, eq(users.id, T.userId))
    .leftJoin(assignee, eq(assignee.id, T.assigneeId))
    .where(eq(T.id, id));
  if (!t) throw notFound("Không tìm thấy ticket");
  return t;
}

export default async function supportRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("support.read") };
  const write = { preHandler: requirePerm("support.write") };

  /* ------------------------------ Admin ------------------------------ */

  app.get("/api/admin/tickets", read, async (req) => {
    const me = await requireUser(req);
    const q = parse(
      listQuery.extend({
        status: zStatus.optional().or(z.literal("")),
        priority: zPriority.optional().or(z.literal("")),
        category: z.string().optional(),
        assignee: z.string().optional(),
      }),
      req.query,
    );
    const where = allOf(
      searchWhere(q.q, [T.code, T.subject, users.name, users.email]),
      q.status ? eq(T.status, q.status) : undefined,
      q.priority ? eq(T.priority, q.priority) : undefined,
      q.category ? eq(T.category, q.category) : undefined,
      q.assignee === "me" ? eq(T.assigneeId, me.id) : q.assignee === "none" ? sql`${T.assigneeId} is null` : q.assignee ? eq(T.assigneeId, q.assignee) : undefined,
    );
    const { limit, offset } = pageOf(q);
    const prioOrder = sql`case ${T.priority} when 'urgent' then 4 when 'high' then 3 when 'normal' then 2 else 1 end`;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(listCols)
        .from(T)
        .leftJoin(users, eq(users.id, T.userId))
        .leftJoin(assignee, eq(assignee.id, T.assigneeId))
        .where(where)
        .orderBy(q.sort === "priority" ? (q.order === "asc" ? prioOrder : desc(prioOrder)) : orderOf(q, { createdAt: T.createdAt, updatedAt: T.updatedAt, code: T.code }, T.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(T).leftJoin(users, eq(users.id, T.userId)).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  app.get("/api/admin/tickets/stats", read, async (req) => {
    const me = await requireUser(req);
    const [r] = await db.execute<Record<string, number>>(sql`
      select count(*)::int as total,
        count(*) filter (where status = 'open')::int as open,
        count(*) filter (where status = 'pending')::int as pending,
        count(*) filter (where status = 'resolved')::int as resolved,
        count(*) filter (where status = 'closed')::int as closed,
        count(*) filter (where priority = 'urgent' and status in ('open','pending'))::int as urgent,
        count(*) filter (where assignee_id = ${me.id} and status in ('open','pending'))::int as mine,
        count(*) filter (where assignee_id is null and status in ('open','pending'))::int as unassigned
      from tickets`);
    return { ...r, categories: TICKET_CATEGORIES };
  });

  app.get<{ Params: { id: string } }>("/api/admin/tickets/:id", read, async (req) => {
    const t = await loadTicket(req.params.id);
    const history = t.userId
      ? await db
          .select({ id: T.id, code: T.code, subject: T.subject, status: T.status, createdAt: T.createdAt })
          .from(T)
          .where(and(eq(T.userId, t.userId), sql`${T.id} <> ${t.id}`))
          .orderBy(desc(T.createdAt))
          .limit(5)
      : [];
    return { ...t, history, categories: TICKET_CATEGORIES };
  });

  app.post<{ Params: { id: string } }>("/api/admin/tickets/:id/reply", write, async (req) => {
    const me = await requireUser(req);
    const b = parse(z.object({ content: z.string().trim().min(1, "Nhập nội dung trả lời"), status: zStatus.optional() }), req.body);
    const t = await loadTicket(req.params.id);
    const reply: TicketReply = { by: me.id, byName: me.name, staff: true, content: b.content, at: new Date().toISOString() };
    const status = b.status ?? (t.status === "open" ? "pending" : t.status);
    await db
      .update(T)
      .set({ replies: [...t.replies, reply], status, assigneeId: t.assigneeId ?? me.id })
      .where(eq(T.id, t.id));
    await logActivity(req, "reply", "ticket", t.id, `Trả lời ticket ${t.code}`);
    return loadTicket(t.id);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/tickets/:id", write, async (req) => {
    const b = parse(
      z.object({ status: zStatus.optional(), priority: zPriority.optional(), assigneeId: z.string().nullable().optional(), category: zCategory.optional() }),
      req.body,
    );
    const t = await loadTicket(req.params.id);
    await db.update(T).set(b).where(eq(T.id, t.id));
    const parts = [
      b.status && `trạng thái → ${b.status}`,
      b.priority && `ưu tiên → ${b.priority}`,
      b.assigneeId !== undefined && "phân công",
      b.category && `danh mục → ${b.category}`,
    ].filter(Boolean);
    await logActivity(req, b.assigneeId !== undefined ? "assign" : "update", "ticket", t.id, `Cập nhật ticket ${t.code}: ${parts.join(", ")}`);
    return loadTicket(t.id);
  });

  /* ----------------------------- Học viên ---------------------------- */

  app.get("/api/me/tickets", async (req) => {
    const u = await requireUser(req);
    const items = await db
      .select({
        id: T.id,
        code: T.code,
        subject: T.subject,
        category: T.category,
        status: T.status,
        priority: T.priority,
        replyCount: listCols.replyCount,
        lastReplyStaff: listCols.lastReplyStaff,
        createdAt: T.createdAt,
        updatedAt: T.updatedAt,
      })
      .from(T)
      .where(eq(T.userId, u.id))
      .orderBy(desc(T.updatedAt))
      .limit(50);
    return { items, categories: TICKET_CATEGORIES };
  });

  app.get<{ Params: { id: string } }>("/api/me/tickets/:id", async (req) => {
    const u = await requireUser(req);
    const [t] = await db.select().from(T).where(and(eq(T.id, req.params.id), eq(T.userId, u.id)));
    if (!t) throw notFound("Không tìm thấy yêu cầu hỗ trợ");
    return t;
  });

  app.post("/api/me/tickets", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const u = await requireUser(req);
    const b = parse(
      z.object({
        subject: z.string().trim().min(5, "Tiêu đề tối thiểu 5 ký tự").max(200),
        message: z.string().trim().min(10, "Mô tả tối thiểu 10 ký tự").max(5000),
        category: zCategory.default("general"),
      }),
      req.body,
    );
    const [t] = await db
      .insert(T)
      .values({ ...b, userId: u.id, code: await nextCode(), priority: b.category === "payment" ? "high" : "normal" })
      .returning();
    return reply.code(201).send(t);
  });

  app.post<{ Params: { id: string } }>("/api/me/tickets/:id/reply", async (req) => {
    const u = await requireUser(req);
    const b = parse(z.object({ content: z.string().trim().min(1, "Nhập nội dung").max(5000) }), req.body);
    const [t] = await db.select().from(T).where(and(eq(T.id, req.params.id), eq(T.userId, u.id)));
    if (!t) throw notFound("Không tìm thấy yêu cầu hỗ trợ");
    const r: TicketReply = { by: u.id, byName: u.name, staff: false, content: b.content, at: new Date().toISOString() };
    const [row] = await db.update(T).set({ replies: [...t.replies, r], status: "open" }).where(eq(T.id, t.id)).returning();
    return row;
  });
}
