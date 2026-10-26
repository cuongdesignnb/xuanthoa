/**
 * Chạy seed: xoá sạch dữ liệu rồi chạy lần lượt các file `NN-*.ts` trong thư mục này
 * (mỗi file `export default async function (ctx: SeedCtx)`), theo thứ tự tên.
 *   npm run db:seed
 */
import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, sqlClient } from "../index.js";
import { createCtx } from "./ctx.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const tables = await db.execute<{ tablename: string }>(
  sql`select tablename from pg_tables where schemaname = 'public' and tablename not like '__drizzle%'`,
);
const names = tables.map((t) => `"${t.tablename}"`).join(", ");
// An toàn: chỉ xoá dữ liệu cũ khi DB đã có người dùng VÀ đặt SEED_FORCE=true (hoặc chạy local với Postgres Docker).
const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from users`);
const local = /@(localhost|127\.0\.0\.1|db):/.test(process.env.DATABASE_URL ?? "");
if (n > 0) {
  if (process.env.SEED_FORCE !== "true" && !local) {
    console.error(`DB đã có ${n} người dùng. Đặt SEED_FORCE=true nếu thực sự muốn xoá sạch và seed lại.`);
    await sqlClient.end();
    process.exit(1);
  }
  if (names) await db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
}

const ctx = createCtx();
const files = (await readdir(here)).filter((f) => /^\d\d-.*\.(ts|js)$/.test(f)).sort();
for (const f of files) {
  const t = Date.now();
  const mod = await import(pathToFileURL(path.join(here, f)).href);
  await mod.default(ctx);
  console.log(`✔ ${f} (${Date.now() - t}ms)`);
}
console.log("✔ seed xong");
await sqlClient.end();
