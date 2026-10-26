import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL chưa được cấu hình");

// Supabase pooler ở chế độ transaction (cổng 6543, PgBouncer) không hỗ trợ prepared statements.
const txPooler = /pooler\.supabase\.com:6543/.test(url) || process.env.DB_POOLER === "transaction";
const remote = /supabase\.(co|com)/.test(url);

export const sqlClient = postgres(url, {
  // Serverless: mỗi instance giữ ít kết nối, nhường pooler phân phối.
  // Pooler transaction: client connection rẻ → mở đủ nhiều để mỗi truy vấn có kết nối riêng (không pipeline).
  max: Number(process.env.DB_MAX ?? (txPooler ? 20 : process.env.VERCEL ? 1 : 10)),
  prepare: !txPooler,
  ssl: remote ? "require" : undefined,
  idle_timeout: process.env.VERCEL ? 20 : undefined,
  onnotice: () => {},
});
export const db = drizzle(sqlClient, { schema, casing: "snake_case" });
export { schema };
