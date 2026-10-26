import type { FastifyReply, FastifyRequest } from "fastify";
import { z, type ZodType } from "zod";
import { and, asc, desc, eq, ilike, or, sql, type SQL, type AnyColumn } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Lỗi HTTP & validate                                                 */
/* ------------------------------------------------------------------ */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Không tìm thấy dữ liệu") => new HttpError(404, what);
export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const forbidden = (msg = "Bạn không có quyền thực hiện thao tác này") => new HttpError(403, msg);

/** Validate dữ liệu bằng zod; ném 400 kèm danh sách lỗi theo trường. */
export function parse<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw badRequest(
      "Dữ liệu không hợp lệ",
      r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return r.data;
}

/* ------------------------------------------------------------------ */
/* Phân trang, tìm kiếm, sắp xếp                                       */
/* ------------------------------------------------------------------ */

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  q: z.string().trim().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type ListQuery = z.infer<typeof listQuery>;

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export function pageOf(q: Pick<ListQuery, "page" | "pageSize">) {
  return { limit: q.pageSize, offset: (q.page - 1) * q.pageSize };
}

/** OR ilike trên nhiều cột. */
export function searchWhere(q: string | undefined, cols: AnyColumn[]): SQL | undefined {
  if (!q || !cols.length) return undefined;
  const term = `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`;
  return or(...cols.map((c) => ilike(c, term)));
}

export function orderOf(q: Pick<ListQuery, "sort" | "order">, cols: Record<string, AnyColumn>, fallback: AnyColumn) {
  const col = (q.sort && cols[q.sort]) || fallback;
  return q.order === "asc" ? asc(col) : desc(col);
}

export const allOf = (...conds: (SQL | undefined | false | null)[]) =>
  and(...(conds.filter(Boolean) as SQL[]));

export const countAll = sql<number>`count(*)::int`;

export { eq };

/* ------------------------------------------------------------------ */
/* Tiện ích                                                            */
/* ------------------------------------------------------------------ */

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const clientIp = (req: FastifyRequest) =>
  (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip;

export const noContent = (reply: FastifyReply) => reply.code(204).send();
