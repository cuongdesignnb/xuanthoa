import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { notFound, parse } from "../lib/http.js";
import { logActivity, requirePerm, requireUser } from "../lib/auth.js";

const { tasks: T, users } = schema;

const body = z.object({
  title: z.string().trim().min(2, "Nhập tiêu đề"),
  note: z.string().trim().optional().nullable(),
  dueAt: z.coerce.date({ message: "Chọn thời gian" }),
  color: z.enum(["red", "blue", "amber", "green", "violet", "gray"]).default("red"),
  state: z.enum(["todo", "in_progress", "done"]).default("todo"),
  done: z.boolean().optional(),
  assigneeId: z.string().optional().nullable(),
});

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** "YYYY-MM-DD" → khoảng [00:00, 24:00) giờ địa phương của máy chủ. */
function dayRange(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return [new Date(y, m - 1, d), new Date(y, m - 1, d + 1)] as const;
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const cols = {
  id: T.id,
  title: T.title,
  note: T.note,
  dueAt: T.dueAt,
  color: T.color,
  done: T.done,
  state: T.state,
  assigneeId: T.assigneeId,
  assigneeName: users.name,
  createdAt: T.createdAt,
};

export default async function taskRoutes(app: FastifyInstance) {
  // Lịch & nhắc việc thuộc màn Tổng quan: ai xem được dashboard đều quản lý được việc của mình.
  const perm = { preHandler: requirePerm("dashboard.read") };

  /** ?date=YYYY-MM-DD (một ngày) hoặc ?from=&to= (gồm cả ngày `to`). Mặc định: hôm nay. */
  app.get("/api/admin/tasks", perm, async (req) => {
    const q = parse(z.object({ date: ymd.optional(), from: ymd.optional(), to: ymd.optional(), mine: z.coerce.boolean().optional() }), req.query);
    const me = await requireUser(req);
    const today = iso(new Date());
    const start = dayRange(q.from ?? q.date ?? today)[0];
    const end = dayRange(q.to ?? q.date ?? q.from ?? today)[1];
    const items = await db
      .select(cols)
      .from(T)
      .leftJoin(users, eq(users.id, T.assigneeId))
      .where(and(gte(T.dueAt, start), lt(T.dueAt, end), q.mine ? eq(T.assigneeId, me.id) : undefined))
      .orderBy(asc(T.dueAt));
    return { items, from: start, to: end };
  });

  app.post("/api/admin/tasks", perm, async (req, reply) => {
    const me = await requireUser(req);
    const b = parse(body, req.body);
    const [t] = await db
      .insert(T)
      .values({ ...b, done: b.done ?? b.state === "done", assigneeId: b.assigneeId ?? me.id })
      .returning();
    await logActivity(req, "create", "task", t.id, `Thêm việc “${t.title}”`);
    return reply.code(201).send(t);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/tasks/:id", perm, async (req) => {
    const b = parse(body.partial(), req.body);
    const data = { ...b };
    if (b.done !== undefined && !b.state) data.state = b.done ? "done" : "todo";
    if (b.state && b.done === undefined) data.done = b.state === "done";
    const [t] = await db.update(T).set(data).where(eq(T.id, req.params.id)).returning();
    if (!t) throw notFound();
    await logActivity(req, "update", "task", t.id, `Cập nhật việc “${t.title}”`);
    return t;
  });

  app.post<{ Params: { id: string } }>("/api/admin/tasks/:id/toggle", perm, async (req) => {
    const [cur] = await db.select().from(T).where(eq(T.id, req.params.id));
    if (!cur) throw notFound();
    const done = !cur.done;
    const [t] = await db.update(T).set({ done, state: done ? "done" : "todo" }).where(eq(T.id, cur.id)).returning();
    await logActivity(req, done ? "complete" : "reopen", "task", t.id, `${done ? "Hoàn thành" : "Mở lại"} việc “${t.title}”`);
    return t;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/tasks/:id", perm, async (req, reply) => {
    const [t] = await db.delete(T).where(eq(T.id, req.params.id)).returning();
    if (!t) throw notFound();
    await logActivity(req, "delete", "task", t.id, `Xoá việc “${t.title}”`);
    return reply.code(204).send();
  });
}
