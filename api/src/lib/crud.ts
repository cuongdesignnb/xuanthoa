import type { FastifyInstance } from "fastify";
import { eq, getTableColumns, type AnyColumn, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { z, type ZodObject, type ZodRawShape } from "zod";
import { db } from "../db/index.js";
import { allOf, countAll, listQuery, notFound, orderOf, pageOf, parse, searchWhere, type Paged } from "./http.js";
import { logActivity, requirePerm } from "./auth.js";

type Filter = (value: string) => SQL | undefined;

export type CrudOptions<T extends PgTable> = {
  /** Đường dẫn gốc, vd "/api/admin/coupons". */
  path: string;
  table: T;
  /** Module quyền, vd "coupons" → coupons.read / coupons.write. */
  perm: string;
  /** Tên thực thể cho nhật ký, vd "coupon". */
  entity: string;
  /** Schema zod cho tạo mới; cập nhật dùng `.partial()`. */
  schema: ZodObject<ZodRawShape>;
  searchCols?: AnyColumn[];
  sortCols?: Record<string, AnyColumn>;
  defaultSort: AnyColumn;
  /** Bộ lọc theo query string: { status: (v) => eq(table.status, v) }. */
  filters?: Record<string, Filter>;
  /** Nhãn hiển thị trong log. */
  label?: (row: Record<string, unknown>) => string;
  /** Biến đổi dữ liệu trước khi ghi (vd hash mật khẩu, tạo slug). */
  beforeWrite?: (data: Record<string, unknown>, mode: "create" | "update") => Promise<Record<string, unknown>> | Record<string, unknown>;
  /** Tắt route nào đó. */
  only?: ("list" | "get" | "create" | "update" | "delete")[];
};

/**
 * Sinh nhanh 5 route REST cho một bảng đơn giản:
 * GET path?page&pageSize&q&sort&order&<filters>  → { items, total, page, pageSize }
 * GET path/:id, POST path, PATCH path/:id, DELETE path/:id
 */
export function crudRoutes<T extends PgTable>(app: FastifyInstance, o: CrudOptions<T>) {
  const cols = getTableColumns(o.table) as Record<string, AnyColumn>;
  const idCol = cols.id ?? cols.key ?? cols.code;
  const only = new Set(o.only ?? ["list", "get", "create", "update", "delete"]);
  const read = requirePerm(`${o.perm}.read`);
  const write = requirePerm(`${o.perm}.write`);
  const label = (r: Record<string, unknown>) =>
    o.label?.(r) ?? String(r.title ?? r.name ?? r.code ?? r.id ?? "");

  if (only.has("list"))
    app.get(o.path, { preHandler: read }, async (req): Promise<Paged<unknown>> => {
      const q = parse(listQuery.passthrough(), req.query) as z.infer<typeof listQuery> & Record<string, string>;
      const where = allOf(
        searchWhere(q.q, o.searchCols ?? []),
        ...Object.entries(o.filters ?? {}).map(([k, f]) => (q[k] ? f(String(q[k])) : undefined)),
      );
      const { limit, offset } = pageOf(q);
      const [items, [{ total }]] = await Promise.all([
        db
          .select()
          .from(o.table as PgTable)
          .where(where)
          .orderBy(orderOf(q, o.sortCols ?? cols, o.defaultSort))
          .limit(limit)
          .offset(offset),
        db.select({ total: countAll }).from(o.table as PgTable).where(where),
      ]);
      return { items, total, page: q.page, pageSize: q.pageSize };
    });

  if (only.has("get"))
    app.get<{ Params: { id: string } }>(`${o.path}/:id`, { preHandler: read }, async (req) => {
      const [row] = await db.select().from(o.table as PgTable).where(eq(idCol, req.params.id)).limit(1);
      if (!row) throw notFound();
      return row;
    });

  if (only.has("create"))
    app.post(o.path, { preHandler: write }, async (req, reply) => {
      let data = parse(o.schema, req.body) as Record<string, unknown>;
      if (o.beforeWrite) data = await o.beforeWrite(data, "create");
      const [row] = (await db.insert(o.table).values(data as never).returning()) as Record<string, unknown>[];
      await logActivity(req, "create", o.entity, String(row[idCol.name] ?? ""), `Tạo ${label(row)}`);
      return reply.code(201).send(row);
    });

  if (only.has("update"))
    app.patch<{ Params: { id: string } }>(`${o.path}/:id`, { preHandler: write }, async (req) => {
      const parsed = parse(o.schema.partial(), req.body) as Record<string, unknown>;
      // Zod 4 vẫn điền .default() trong .partial() → chỉ giữ các khóa client thực sự gửi lên.
      const sent = new Set(Object.keys((req.body ?? {}) as object));
      let data = Object.fromEntries(Object.entries(parsed).filter(([k]) => sent.has(k)));
      if (o.beforeWrite) data = await o.beforeWrite(data, "update");
      const [row] = (await db
        .update(o.table)
        .set(data as never)
        .where(eq(idCol, req.params.id))
        .returning()) as Record<string, unknown>[];
      if (!row) throw notFound();
      await logActivity(req, "update", o.entity, req.params.id, `Cập nhật ${label(row)}`);
      return row;
    });

  if (only.has("delete"))
    app.delete<{ Params: { id: string } }>(`${o.path}/:id`, { preHandler: write }, async (req, reply) => {
      const [row] = (await db.delete(o.table).where(eq(idCol, req.params.id)).returning()) as Record<string, unknown>[];
      if (!row) throw notFound();
      await logActivity(req, "delete", o.entity, req.params.id, `Xoá ${label(row)}`);
      return reply.code(204).send();
    });
}

/** Zod helpers hay dùng cho body. */
export const zOptStr = z.string().trim().optional().nullable();
export const zDate = z.coerce.date().optional().nullable();
export const zLevel = z.enum(["N5", "N4", "N3", "N2", "N1"]);
export const zStatus = z.enum(["draft", "review", "published", "archived"]);
