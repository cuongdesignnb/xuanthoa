import type { FastifyInstance } from "fastify";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { publicReviews } from "./moderation.js";

const { teachers, reviews, users, posts, subscribers } = schema;

/** Số liệu thật dùng cho hero trang chủ / trang giáo viên / blog. */
export async function siteStats() {
  const [r] = await db.execute<{
    students: number;
    teachers: number;
    avg_rating: number | null;
    rating_count: number;
    posts: number;
    subscribers: number;
  }>(sql`
    select
      (select count(*)::int from ${users} where role = 'student' and status <> 'blocked') as students,
      (select count(*)::int from ${teachers} where status = 'published') as teachers,
      (select round(avg(rating)::numeric, 1)::float from ${reviews} where status = 'approved') as avg_rating,
      (select count(*)::int from ${reviews} where status = 'approved') as rating_count,
      (select count(*)::int from ${posts} where status = 'published' and published_at <= now()) as posts,
      (select count(*)::int from ${subscribers}) as subscribers
  `);
  return {
    students: r.students,
    teachers: r.teachers,
    avgRating: r.avg_rating ?? 0,
    ratingCount: r.rating_count,
    posts: r.posts,
    subscribers: r.subscribers,
  };
}

export default async function homeRoutes(app: FastifyInstance) {
  app.get("/api/public/home", async () => {
    const [stats, teacherRows, site, studentAvatars] = await Promise.all([
      siteStats(),
      db
        .select({
          id: teachers.id,
          slug: teachers.slug,
          name: teachers.name,
          avatarUrl: teachers.avatarUrl,
          avatarSeed: teachers.avatarSeed,
          avatarBg: teachers.avatarBg,
          levelRange: teachers.levelRange,
          badge: teachers.badge,
          native: teachers.native,
          yearsExp: teachers.yearsExp,
          bio: teachers.bio,
          rating: teachers.rating,
        })
        .from(teachers)
        .where(eq(teachers.status, "published"))
        .orderBy(asc(teachers.order))
        .limit(3),
      publicReviews({ featured: true, teacher: "none", limit: 9 }),
      db
        .select({ name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.role, "student"))
        .orderBy(sql`${users.lastActiveAt} desc nulls last`)
        .limit(3),
    ]);
    const testimonials = site.length >= 3 ? site : await publicReviews({ featured: true, limit: 9 });
    return { stats, teachers: teacherRows, testimonials, studentAvatars };
  });
}
