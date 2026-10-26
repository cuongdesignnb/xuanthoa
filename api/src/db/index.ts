import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL chưa được cấu hình");

// Supabase pooler ở chế độ transaction (cổng 6543, Supavisor) không hỗ trợ prepared statements.
const txPooler = /pooler\.supabase\.com:6543/.test(url) || process.env.DB_POOLER === "transaction";
const remote = /supabase\.(co|com)/.test(url);
const max = Number(process.env.DB_MAX ?? (txPooler ? 4 : process.env.VERCEL ? 1 : 10));

export const sqlClient = postgres(url, {
  max,
  prepare: !txPooler,
  ssl: remote ? "require" : undefined,
  idle_timeout: process.env.VERCEL || txPooler ? 5 : undefined,
  onnotice: () => {},
});

/**
 * Trên pooler transaction, truy vấn xếp hàng bên trong postgres-js (nhiều truy vấn hơn số kết nối) bị treo.
 * → Giới hạn ở tầng ứng dụng: chỉ gửi truy vấn xuống khi còn kết nối rảnh, phần còn lại chờ trong hàng đợi JS.
 * Nhờ vậy mỗi instance serverless chỉ cần vài kết nối và không làm cạn giới hạn 200 client của pooler.
 */
function limitConcurrency(client: postgres.Sql, n: number): postgres.Sql {
  let active = 0;
  const waiting: (() => void)[] = [];
  const acquire = () =>
    new Promise<void>((resolve) => {
      if (active < n) {
        active++;
        resolve();
      } else waiting.push(() => (active++, resolve()));
    });
  const release = () => {
    active--;
    waiting.shift()?.();
  };
  const run = async <T>(fn: () => PromiseLike<T>): Promise<T> => {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };
  return new Proxy(client, {
    get(target, key, receiver) {
      if (key === "unsafe")
        return (query: string, params?: unknown[], opts?: object) => {
          const exec = (values: boolean) =>
            run(() => {
              const q = target.unsafe(query, params as never, opts as never);
              return values ? q.values() : q;
            });
          let once: Promise<unknown> | null = null;
          const lazy = () => (once ??= exec(false));
          return {
            then: (a?: (v: unknown) => unknown, b?: (e: unknown) => unknown) => lazy().then(a, b),
            catch: (b: (e: unknown) => unknown) => lazy().catch(b),
            finally: (f: () => void) => lazy().finally(f),
            values: () => exec(true),
          };
        };
      if (key === "begin") return (...args: unknown[]) => run(() => (target.begin as (...a: unknown[]) => Promise<unknown>)(...args));
      return Reflect.get(target, key, receiver);
    },
  });
}

export const db = drizzle(txPooler ? limitConcurrency(sqlClient, max) : sqlClient, { schema, casing: "snake_case" });
export { schema };
