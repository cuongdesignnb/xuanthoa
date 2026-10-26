/**
 * Seed nội dung: blog, tài liệu miễn phí, newsletter, đánh giá/testimonial, báo lỗi, bình luận bài học.
 * Bài học/câu hỏi/khóa học do 10-courses / 20-quizzes seed — nếu chưa có thì bỏ qua phần liên quan.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import type { SeedCtx } from "./ctx.js";
import { PUBLIC_DIR, publicUrl } from "../../lib/storage.js";
import {
  COMMENT_REPLIES,
  COMMENT_SAMPLES,
  COMMENT_SPAM,
  REPORT_SAMPLES,
  REVIEW_BAD,
  REVIEW_GOOD,
  REVIEW_MID,
  SEED_POSTS,
  SEED_RESOURCES,
  SITE_TESTIMONIALS,
  TEACHER_TESTIMONIALS,
} from "./content-data.js";

const ascii = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\x20-\x7e]/g, "");

/** PDF một trang tối giản (chỉ chữ ASCII) để tài liệu miễn phí tải về được thật. */
function tinyPdf(title: string, lines: string[]) {
  const esc = (s: string) => ascii(s).replace(/[\\()]/g, (m) => "\\" + m);
  const text = [
    "BT /F1 20 Tf 60 780 Td (" + esc(title) + ") Tj ET",
    ...lines.map((l, i) => `BT /F1 12 Tf 60 ${740 - i * 20} Td (${esc(l)}) Tj ET`),
  ].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

export default async function seedContent(ctx: SeedCtx) {
  const { db, schema, int, pick, rand, daysAgo } = ctx;

  const teacherRows = await db.select({ id: schema.teachers.id, slug: schema.teachers.slug, name: schema.teachers.name }).from(schema.teachers);
  const tid = (slug: string) => teacherRows.find((t) => t.slug === slug)?.id ?? null;

  /* ------------------------------ Blog ------------------------------ */
  const postRows = await db
    .insert(schema.posts)
    .values(
      SEED_POSTS.map((p) => {
        const status = p.status ?? "published";
        const words = p.content.replace(/<rt>[^<]*<\/rt>/g, "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        const at = status === "published" ? daysAgo(p.daysAgo) : null;
        return {
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          content: p.content.trim(),
          category: p.category,
          coverStyle: { kind: p.cover },
          authorId: tid(p.author),
          readMin: Math.max(3, Math.round(words / 120)),
          views: p.views,
          featured: !!p.featured,
          guide: !!p.guide,
          status,
          publishedAt: at,
          createdAt: daysAgo(Math.max(p.daysAgo, 0) + 2),
        };
      }),
    )
    .returning({ id: schema.posts.id, title: schema.posts.title, status: schema.posts.status });

  /* ----------------------- Tài liệu miễn phí ----------------------- */
  const dir = path.join(PUBLIC_DIR, "resources");
  await mkdir(dir, { recursive: true });
  for (const r of SEED_RESOURCES) {
    await writeFile(
      path.join(dir, r.file),
      tinyPdf(r.title, [
        "Nihongo+ - Tai lieu hoc tieng Nhat mien phi",
        "Ban mau dung thu. Tai ban day du trong khoa hoc tren nihongo.vn",
        "",
        "Chuc ban hoc tot!  - Doi ngu giao vien Nihongo+",
      ]),
    );
  }
  await db.insert(schema.resources).values(
    SEED_RESOURCES.map((r, i) => ({
      title: r.title,
      fileUrl: publicUrl(path.join("resources", r.file)),
      fileType: "PDF",
      sizeBytes: Math.round(r.size * 1024 * 1024),
      downloads: r.downloads,
      isFree: true,
      createdAt: daysAgo(90 - i * 10),
    })),
  );

  /* --------------------------- Newsletter --------------------------- */
  const SUB_NAMES = ["hoa.nguyen", "tuan.le", "linh.pham", "nam.tran", "thu.vo", "khanh.do", "an.bui", "phuong.dang", "quang.ho", "mai.ngo", "huy.ly", "trang.vu"];
  const DOMAINS = ["gmail.com", "yahoo.com", "outlook.com"];
  await db
    .insert(schema.subscribers)
    .values(SUB_NAMES.flatMap((n, i) => [{ email: `${n}${i + 1}@${DOMAINS[i % 3]}`, createdAt: daysAgo(int(1, 300)) }, { email: `${n}.jp${i}@${DOMAINS[(i + 1) % 3]}`, createdAt: daysAgo(int(1, 300)) }]))
    .onConflictDoNothing();

  /* ------------------------ Đánh giá / testimonial ------------------------ */
  const students = await db
    .select({ id: schema.users.id, name: schema.users.name, level: schema.users.level })
    .from(schema.users)
    .where(eq(schema.users.role, "student"))
    .orderBy(asc(schema.users.createdAt));
  const courseRows = await db
    .select({ id: schema.courses.id, title: schema.courses.title, teacherId: schema.courses.teacherId })
    .from(schema.courses)
    .orderBy(asc(schema.courses.order));
  const studentByName = (n: string) => students.find((s) => s.name === n)?.id ?? null;

  type ReviewInsert = typeof schema.reviews.$inferInsert;
  const reviewRows: ReviewInsert[] = [];

  TEACHER_TESTIMONIALS.forEach(({ teacher, ...t }, i) =>
    reviewRows.push({ ...t, teacherId: tid(teacher), userId: studentByName(t.authorName), rating: 5, featured: true, status: "approved", createdAt: daysAgo(40 + i * 7) }),
  );
  SITE_TESTIMONIALS.forEach((t, i) =>
    reviewRows.push({ ...t, userId: studentByName(t.authorName), rating: 5, featured: true, status: "approved", createdAt: daysAgo(30 + i * 9) }),
  );

  // ~80 đánh giá khóa học / giáo viên: 12 chờ duyệt, 3 bị ẩn, còn lại đã duyệt.
  const N = 80;
  for (let i = 0; i < N; i++) {
    const s = students.length ? students[int(0, students.length - 1)] : null;
    const pending = i < 12;
    const hidden = !pending && i < 15;
    const roll = rand();
    const rating = hidden ? int(1, 2) : pending ? pick([5, 5, 4, 4, 3, 2, 1]) : roll < 0.62 ? 5 : roll < 0.9 ? 4 : 3;
    const content = hidden ? pick(REVIEW_BAD) : rating >= 4 ? pick(REVIEW_GOOD) : rating === 3 ? pick(REVIEW_MID) : pick(REVIEW_BAD);
    const course = courseRows.length && rand() < 0.65 ? courseRows[int(0, courseRows.length - 1)] : null;
    const teacher = course ? course.teacherId : teacherRows.length ? teacherRows[int(0, teacherRows.length - 1)].id : null;
    if (!course && !teacher) break;
    reviewRows.push({
      userId: s?.id ?? null,
      authorName: s?.name ?? "Học viên Nihongo+",
      authorRole: course ? `Học viên khóa ${course.title}` : s?.level ? `Học viên trình độ ${s.level}` : "Học viên Nihongo+",
      courseId: course?.id ?? null,
      teacherId: teacher,
      rating,
      content,
      featured: false,
      status: pending ? "pending" : hidden ? "hidden" : "approved",
      createdAt: pending ? daysAgo(int(0, 6)) : daysAgo(int(7, 360)),
    });
  }
  if (reviewRows.length) await db.insert(schema.reviews).values(reviewRows);

  /* --------------------------- Báo lỗi nội dung --------------------------- */
  const lessonRows = await db
    .select({ id: schema.lessons.id, title: schema.lessons.title })
    .from(schema.lessons)
    .orderBy(asc(schema.lessons.createdAt), asc(schema.lessons.order))
    .limit(12);
  const questionRows = await db
    .select({ id: schema.questions.id, order: schema.questions.order, quiz: schema.quizzes.title })
    .from(schema.questions)
    .innerJoin(schema.quizzes, eq(schema.quizzes.id, schema.questions.quizId))
    .orderBy(asc(schema.quizzes.createdAt), asc(schema.questions.order))
    .limit(12);
  const livePosts = postRows.filter((p) => p.status === "published");

  const reportRows: (typeof schema.reports.$inferInsert)[] = [];
  REPORT_SAMPLES.forEach((r, i) => {
    let targetId: string | null = null;
    let targetTitle: string | null = null;
    let targetType = r.type;
    if (r.type === "lesson" && lessonRows.length) {
      const l = lessonRows[i % lessonRows.length];
      (targetId = l.id), (targetTitle = l.title);
    } else if (r.type === "question" && questionRows.length) {
      const q = questionRows[i % questionRows.length];
      (targetId = q.id), (targetTitle = `${q.quiz} · Câu ${q.order + 1}`);
    } else if (livePosts.length) {
      const p = livePosts[i % livePosts.length];
      (targetType = "post"), (targetId = p.id), (targetTitle = p.title);
    } else targetType = "other";
    // 5 báo lỗi mới (open), 1 đang xử lý, 2 đã xử lý.
    const status = i < 5 ? "open" : i === 5 ? "pending" : "resolved";
    reportRows.push({
      userId: students.length ? students[(i * 7) % students.length].id : null,
      targetType,
      targetId,
      targetTitle,
      content: r.content,
      status,
      resolution: status === "resolved" ? "Đã kiểm tra và cập nhật lại nội dung. Cảm ơn bạn đã báo lỗi!" : null,
      createdAt: status === "open" ? daysAgo(int(0, 4)) : daysAgo(int(6, 40)),
    });
  });
  await db.insert(schema.reports).values(reportRows);

  /* --------------------------- Bình luận bài học --------------------------- */
  if (lessonRows.length && students.length) {
    const staff = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`${schema.users.role} in ('teacher', 'admin')`)
      .limit(3);
    const lessonsForComments = lessonRows.slice(0, 8);
    let spamIdx = 0;
    for (const [li, l] of lessonsForComments.entries()) {
      const count = int(2, 5);
      for (let k = 0; k < count; k++) {
        const s = students[(li * 11 + k * 5) % students.length];
        // Vài bình luận chờ duyệt / spam bị ẩn cho hàng đợi kiểm duyệt.
        const isSpam = (li === 1 && k === 0) || (li === 4 && k === 1);
        const isPending = !isSpam && ((li + k) % 7 === 3);
        const [c] = await db
          .insert(schema.comments)
          .values({
            userId: s.id,
            lessonId: l.id,
            content: isSpam ? COMMENT_SPAM[spamIdx++ % COMMENT_SPAM.length] : COMMENT_SAMPLES[(li * 3 + k) % COMMENT_SAMPLES.length],
            likes: isSpam ? 0 : int(0, 24),
            status: isSpam ? (spamIdx === 1 ? "hidden" : "pending") : isPending ? "pending" : "approved",
            createdAt: daysAgo(int(1, 60)),
          })
          .returning({ id: schema.comments.id, status: schema.comments.status });
        if (c.status === "approved" && k === 0 && staff.length) {
          await db.insert(schema.comments).values({
            userId: staff[li % staff.length].id,
            lessonId: l.id,
            parentId: c.id,
            content: COMMENT_REPLIES[li % COMMENT_REPLIES.length],
            likes: int(1, 12),
            status: "approved",
            createdAt: daysAgo(int(0, 1)),
          });
        }
      }
    }
  }
}
