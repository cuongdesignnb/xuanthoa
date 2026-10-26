/**
 * Khởi động container: nếu DB chưa có người dùng và SEED_ON_EMPTY=true thì chạy seed dữ liệu mẫu.
 */
import { sql } from "drizzle-orm";
import { db, sqlClient } from "./index.js";

const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from users`);
if (n === 0 && process.env.SEED_ON_EMPTY === "true") {
  console.log("DB trống → chạy seed dữ liệu mẫu…");
  await sqlClient.end();
  await import("./seed/index.js");
} else {
  console.log(n ? `DB đã có ${n} người dùng — bỏ qua seed` : "DB trống, SEED_ON_EMPTY khác true — bỏ qua seed");
  await sqlClient.end();
}
