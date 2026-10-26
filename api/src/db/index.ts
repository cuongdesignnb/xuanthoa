import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL chưa được cấu hình");

export const sqlClient = postgres(url, { max: 10, onnotice: () => {} });
export const db = drizzle(sqlClient, { schema, casing: "snake_case" });
export { schema };
