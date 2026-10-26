import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { allOf, countAll, listQuery, orderOf, pageOf, parse, searchWhere } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";
import { sendCsv, toCsv } from "../lib/csv.js";

const L = schema.activityLogs;

const filterQuery = listQuery.extend({
  userId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function whereOf(q: z.infer<typeof filterQuery>) {
  return allOf(
    searchWhere(q.q, [L.summary, L.userName, L.entityId, L.ip]),
    q.userId ? eq(L.userId, q.userId) : undefined,
    q.action ? eq(L.action, q.action) : undefined,
    q.entity ? eq(L.entity, q.entity) : undefined,
    q.from ? gte(L.createdAt, new Date(q.from)) : undefined,
    q.to ? lte(L.createdAt, new Date(new Date(q.to).getTime() + 86400000 - 1)) : undefined,
  );
}

export default async function logRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("logs.read") };

  app.get("/api/admin/logs", read, async (req) => {
    const q = parse(filterQuery, req.query);
    const where = whereOf(q);
    const { limit, offset } = pageOf(q);
    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(L)
        .where(where)
        .orderBy(orderOf(q, { createdAt: L.createdAt, action: L.action, entity: L.entity, userName: L.userName }, L.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(L).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  /** Giá trị cho bộ lọc + thống kê nhanh. */
  app.get("/api/admin/logs/facets", read, async () => {
    const [actions, entities, people, [stats]] = await Promise.all([
      db.select({ value: L.action, n: countAll }).from(L).groupBy(L.action).orderBy(desc(countAll)),
      db.select({ value: L.entity, n: countAll }).from(L).groupBy(L.entity).orderBy(desc(countAll)),
      db
        .select({ value: L.userId, label: sql<string>`max(${L.userName})`, n: countAll })
        .from(L)
        .where(sql`${L.userId} is not null`)
        .groupBy(L.userId)
        .orderBy(desc(countAll))
        .limit(50),
      db.execute<{ today: number; week: number; total: number }>(sql`
        select count(*) filter (where created_at >= current_date)::int as today,
               count(*) filter (where created_at >= now() - interval '7 days')::int as week,
               count(*)::int as total from activity_logs`),
    ]);
    return { actions, entities, users: people, stats };
  });

  app.get("/api/admin/logs/export.csv", read, async (req, reply) => {
    const q = parse(filterQuery, req.query);
    const rows = await db.select().from(L).where(whereOf(q)).orderBy(desc(L.createdAt)).limit(50000);
    await logActivity(req, "export", "log", null, `Xuất CSV ${rows.length} dòng nhật ký`);
    const csv = toCsv(
      [
        { key: "createdAt", label: "Thời gian" },
        { key: "userName", label: "Người thực hiện" },
        { key: "action", label: "Hành động" },
        { key: "entity", label: "Đối tượng" },
        { key: "entityId", label: "ID" },
        { key: "summary", label: "Nội dung" },
        { key: "ip", label: "IP" },
      ],
      rows,
    );
    return sendCsv(reply, `nhat-ky-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  });
}
