import { sql, type SQL, type AnyColumn } from "drizzle-orm";

/**
 * Tìm kiếm tiếng Việt không dấu mà không cần extension `unaccent`:
 * dùng `translate()` của Postgres với bảng ký tự có dấu → không dấu.
 */
const VN_LOWER = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
const FROM = VN_LOWER + VN_LOWER.toUpperCase();
const TO = [...FROM].map((c) => (c === "đ" || c === "Đ" ? "d" : c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase())).join("");

/** Chuẩn hoá chuỗi JS: bỏ dấu, chữ thường. */
export const vnNormalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

/** Biểu thức SQL đã bỏ dấu + lower cho một cột/biểu thức. */
export const vnNorm = (col: AnyColumn | SQL) => sql`lower(translate(coalesce(${col}::text, ''), ${FROM}, ${TO}))`;

/** OR "like không dấu" trên nhiều cột. */
export function vnSearch(q: string | undefined | null, cols: (AnyColumn | SQL)[]): SQL | undefined {
  const t = q?.trim();
  if (!t || !cols.length) return undefined;
  const term = `%${vnNormalize(t).replace(/[%_\\]/g, (m) => "\\" + m)}%`;
  return sql`(${sql.join(
    cols.map((c) => sql`${vnNorm(c)} like ${term}`),
    sql` or `,
  )})`;
}
