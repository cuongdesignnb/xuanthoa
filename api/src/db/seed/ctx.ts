import { eq } from "drizzle-orm";
import { db, schema } from "../index.js";

/** PRNG cố định để seed luôn ra cùng một dữ liệu. */
export function rng(seed = 42) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ngữ cảnh dùng chung giữa các file seed. */
export function createCtx() {
  const r = rng(2026);
  return {
    db,
    schema,
    rand: r,
    int: (min: number, max: number) => Math.floor(r() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)],
    /** Ngày cách hiện tại `days` ngày (âm = quá khứ), giờ ngẫu nhiên. */
    daysAgo: (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      d.setHours(Math.floor(r() * 14) + 8, Math.floor(r() * 60), 0, 0);
      return d;
    },
    /** id theo khoá tự nhiên (slug/email/code) đã seed ở file trước. */
    ids: {
      teacher: async (slug: string) =>
        (await db.select({ id: schema.teachers.id }).from(schema.teachers).where(eq(schema.teachers.slug, slug)))[0]?.id,
      user: async (email: string) =>
        (await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)))[0]?.id,
      course: async (slug: string) =>
        (await db.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.slug, slug)))[0]?.id,
      quiz: async (slug: string) =>
        (await db.select({ id: schema.quizzes.id }).from(schema.quizzes).where(eq(schema.quizzes.slug, slug)))[0]?.id,
      lesson: async (slug: string) =>
        (await db.select({ id: schema.lessons.id }).from(schema.lessons).where(eq(schema.lessons.slug, slug)))[0]?.id,
    },
  };
}
export type SeedCtx = ReturnType<typeof createCtx>;
