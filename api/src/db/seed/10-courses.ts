/**
 * Khóa học, chương, bài học, từ vựng, tài liệu, video YouTube mẫu,
 * tiến độ / ghi chú của học viên demo, bình luận Bài 12, đánh giá khóa N4, lộ trình đề xuất.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { putPublic } from "../../lib/storage.js";
import { slugify } from "../../lib/http.js";
import type { SeedCtx } from "./ctx.js";
import {
  COURSES,
  EXTRA_VOCAB,
  REVIEWS_N4,
  ROADMAP,
  TE_COMMENTS,
  TE_CONTENT,
  TE_GRAMMAR,
  TE_SUMMARY,
  TE_VOCAB,
  YT,
  exampleMarked,
  type Kind,
} from "./courses-data.js";

/* ------------------------------------------------------------------ */
/* Tệp tài liệu mẫu (PDF tối giản / RTF)                               */
/* ------------------------------------------------------------------ */

const ascii = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/[()\\]/g, "");

function makePdf(title: string, lines: string[]) {
  const text = [title, "", ...lines, "", "Nihongo+ - nihongo.plus"].map(ascii);
  const stream = ["BT", "/F1 20 Tf", "60 780 Td", `(${text[0]}) Tj`, "/F1 12 Tf", "0 -30 Td"]
    .concat(text.slice(1).flatMap((l) => [`(${l}) Tj`, "0 -18 Td"]))
    .concat(["ET"])
    .join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

function makeRtf(title: string, lines: string[]) {
  const enc = (s: string) => [...s].map((ch) => (ch.charCodeAt(0) > 127 ? `\\u${ch.charCodeAt(0) > 32767 ? ch.charCodeAt(0) - 65536 : ch.charCodeAt(0)}?` : ch)).join("");
  return Buffer.from(`{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\fs36 ${enc(title)}\\par\\fs24 ${lines.map(enc).join("\\par ")}\\par}`, "latin1");
}

async function writeDoc(name: string, kind: "PDF" | "DOC", title: string, lines: string[]) {
  const buf = kind === "PDF" ? makePdf(title, lines) : makeRtf(title, lines);
  const ext = kind === "PDF" ? "pdf" : "rtf";
  const fileUrl = await putPublic(`resources/khoa-hoc/${name}.${ext}`, buf, kind === "PDF" ? "application/pdf" : "application/rtf");
  return { fileUrl, sizeBytes: buf.length };
}

/* ------------------------------------------------------------------ */

export default async function seedCourses(ctx: SeedCtx) {
  const { db, schema } = ctx;
  const now = Date.now();
  const H = 3600_000;

  /* ---------------- Video YouTube ---------------- */
  const videoIds = new Map<string, string>();
  const allYt = new Map<string, [string, number, string]>();
  for (const list of Object.values(YT)) for (const v of list) allYt.set(v[0], v as [string, number, string]);
  const vRows = await db
    .insert(schema.videos)
    .values(
      [...allYt.values()].map(([yt, dur, title]) => ({
        title,
        source: "youtube" as const,
        youtubeId: yt,
        status: "ready" as const,
        durationSec: dur,
        thumbnailUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      })),
    )
    .returning({ id: schema.videos.id, youtubeId: schema.videos.youtubeId });
  for (const v of vRows) videoIds.set(v.youtubeId!, v.id);

  /* ---------------- Khóa học, chương, bài ---------------- */
  const teacherIds = new Map<string, string | undefined>();
  for (const s of new Set(COURSES.map((c) => c.teacher))) teacherIds.set(s, await ctx.ids.teacher(s));

  const lessonIdByTitle = new Map<string, string>(); // `${courseSlug}|${title}`
  const lessonsByCourse = new Map<string, { id: string; isFree: boolean }[]>();
  const courseIds = new Map<string, string>();
  const allSlugs = new Set<string>();

  for (const [ci, spec] of COURSES.entries()) {
    const [course] = await db
      .insert(schema.courses)
      .values({
        slug: spec.slug,
        title: spec.title,
        subtitle: spec.subtitle,
        description: spec.description,
        level: spec.level,
        category: spec.category,
        goals: spec.goals,
        outcomes: spec.outcomes,
        tags: spec.tags,
        formats: spec.formats,
        format: spec.formats.includes("Lớp học trực tuyến") ? "live" : "video",
        coverStyle: spec.cover,
        badge: spec.badge ?? null,
        teacherId: teacherIds.get(spec.teacher) ?? null,
        price: spec.price,
        salePrice: spec.salePrice ?? null,
        saleEndsAt: spec.saleHours ? new Date(now + spec.saleHours * H) : null,
        durationHours: spec.durationHours,
        weeks: spec.weeks,
        rating: spec.rating,
        ratingCount: spec.ratingCount,
        studentCount: spec.studentCount,
        featured: spec.featured ?? false,
        status: "published",
        order: ci + 1,
        createdAt: new Date(now - (20 - spec.added) * 18 * 24 * H),
      })
      .returning({ id: schema.courses.id });
    courseIds.set(spec.slug, course.id);

    const pool = YT[spec.videoTheme];
    let n = 0;
    let vi = 0;
    const list: { id: string; isFree: boolean }[] = [];
    for (const [mi, m] of spec.modules.entries()) {
      const [modRow] = await db
        .insert(schema.modules)
        .values({ courseId: course.id, order: mi + 1, title: m.title, description: m.desc ?? null })
        .returning({ id: schema.modules.id });
      const rows = m.lessons.map((l, li) => {
        n++;
        const kinds: Kind[] = l.kinds ?? ["Video"];
        const hasVideo = kinds.includes("Video");
        const isTe = spec.slug === "n5-tieng-nhat-co-ban" && l.t === "Thể て (Te-form)";
        let yt: string | null = null;
        if (isTe) yt = "HAdmKhVjVs8";
        else if (hasVideo) yt = pool[vi++ % pool.length][0];
        let slug = `${spec.key}-bai-${n}-${slugify(l.t)}`.slice(0, 80).replace(/-+$/, "");
        while (allSlugs.has(slug)) slug += "-x";
        allSlugs.add(slug);
        return {
          moduleId: modRow.id,
          order: li + 1,
          slug,
          title: l.t,
          summary: isTe ? TE_SUMMARY : `Bài ${n} của khóa ${spec.title}: ${l.t}.`,
          type: (hasVideo ? "video" : kinds.includes("Mini test") ? "quiz" : "text") as "video" | "quiz" | "text",
          content: isTe
            ? TE_CONTENT
            : `<h2>${l.t}</h2><p>Nội dung bài học <strong>${l.t}</strong> thuộc chương “${m.title}”. Xem video bài giảng, ghi chú các ý chính và làm bài luyện tập cuối bài để ghi nhớ lâu hơn.</p>`,
          grammar: isTe ? TE_GRAMMAR : null,
          videoId: yt ? videoIds.get(yt)! : null,
          durationSec: l.dur,
          isFree: !!l.free || (mi === 0 && li === 0),
          hasDocs: kinds.includes("Tài liệu"),
          hasExercise: kinds.includes("Bài tập") || kinds.includes("Mini test"),
          status: "published" as const,
        };
      });
      const inserted = await db.insert(schema.lessons).values(rows).returning({ id: schema.lessons.id, title: schema.lessons.title, isFree: schema.lessons.isFree });
      for (const r of inserted) {
        lessonIdByTitle.set(`${spec.slug}|${r.title}`, r.id);
        list.push({ id: r.id, isFree: r.isFree });
      }
    }
    lessonsByCourse.set(spec.slug, list);
  }

  const teId = lessonIdByTitle.get("n5-tieng-nhat-co-ban|Thể て (Te-form)")!;

  /* ---------------- Từ vựng ---------------- */
  await db.insert(schema.vocab).values(
    TE_VOCAB.map((v, i) => ({
      lessonId: teId,
      order: i + 1,
      word: v.word,
      reading: v.reading,
      romaji: v.romaji,
      pos: v.pos,
      meaning: v.meaning,
      exampleJa: exampleMarked(v.ex),
      exampleRomaji: v.exRo,
      exampleVi: v.exVi,
    })),
  );
  for (const [title, words] of Object.entries(EXTRA_VOCAB)) {
    const lid = lessonIdByTitle.get(`n5-tieng-nhat-co-ban|${title}`) ?? lessonIdByTitle.get(`ngu-phap-n4|${title}`);
    if (lid) await db.insert(schema.vocab).values(words.map((w, i) => ({ ...w, lessonId: lid, order: i + 1 })));
  }

  /* ---------------- Tài liệu ---------------- */
  const teDocs = [
    { name: "bai-12-slide-the-te", kind: "PDF" as const, title: "Slide bài giảng (PDF)", display: 2.4, lines: ["Bai 12: The te (Te-form)", "Quy tac chia 3 nhom dong tu", "Mau cau: V1te, V2 / Vte kudasai / Vte imasu / Vte mo ii desu"] },
    { name: "bai-12-phieu-bai-tap", kind: "DOC" as const, title: "Phiếu bài tập luyện tập", display: 1.1, lines: ["Chia các động từ sau sang thể て:", "1. 食べる → ____", "2. 飲む → ____", "3. 行く → ____", "4. 書く → ____", "5. 来る → ____"] },
    { name: "bai-12-bang-tong-hop", kind: "PDF" as const, title: "Bảng tổng hợp thể て", display: 0.8, lines: ["u, tsu, ru -> tte", "mu, bu, nu -> nde", "ku -> ite (iku -> itte)", "gu -> ide", "su -> shite", "Nhom 2: bo ru + te", "Nhom 3: suru -> shite, kuru -> kite"] },
  ];
  for (const d of teDocs) {
    const f = await writeDoc(d.name, d.kind, d.title, d.lines);
    await db.insert(schema.resources).values({ title: d.title, fileUrl: f.fileUrl, fileType: d.kind, sizeBytes: Math.round(d.display * 1024 * 1024), lessonId: teId, downloads: ctx.int(80, 600) });
  }
  const n4Id = courseIds.get("ngu-phap-n4")!;
  const n4Docs = [
    { name: "n4-giao-trinh-ngu-phap", title: "Giáo trình ngữ pháp N4 (PDF)", mb: 12.4, lines: ["Giao trinh ngu phap N4", "128 trang - 5 chuong"] },
    { name: "n4-flashcard-mau-ngu-phap", title: "Bộ flashcard 100+ mẫu ngữ pháp", mb: 3.1, lines: ["Flashcard 100+ mau ngu phap N4", "Anki & PDF"] },
    { name: "n4-tuyen-tap-bai-tap", title: "Tuyển tập bài tập theo chương", mb: 6.8, lines: ["Tuyen tap bai tap theo 5 chuong"] },
    { name: "n4-de-thi-thu", title: "Đề thi thử JLPT N4 kèm đáp án", mb: 4.2, lines: ["3 de thi thu JLPT N4 kem dap an"] },
  ];
  for (const [i, d] of n4Docs.entries()) {
    const f = await writeDoc(d.name, "PDF", d.title, d.lines);
    await db.insert(schema.resources).values({ title: d.title, fileUrl: f.fileUrl, fileType: "PDF", sizeBytes: Math.round(d.mb * 1024 * 1024), courseId: n4Id, isFree: i === 1, downloads: ctx.int(200, 1500) });
  }
  // tài liệu cho bài đầu mỗi khóa có "Tài liệu"
  const shared = await writeDoc("tom-tat-bai-hoc", "PDF", "Tóm tắt bài học", ["Tom tat noi dung bai hoc", "Tu vung - Ngu phap - Bai tap"]);
  const docLessons = await db.execute<{ id: string; title: string }>(sql`
    select l.id, l.title from ${schema.lessons} l where l.has_docs = true and l.id <> ${teId}
    and not exists (select 1 from ${schema.resources} r where r.lesson_id = l.id)`);
  for (let i = 0; i < docLessons.length; i += 500)
    await db.insert(schema.resources).values(
      docLessons.slice(i, i + 500).map((l) => ({
        title: `Tóm tắt: ${l.title}`,
        fileUrl: shared.fileUrl,
        fileType: "PDF",
        sizeBytes: 300_000 + ctx.int(0, 900_000),
        lessonId: l.id,
        downloads: ctx.int(0, 300),
      })),
    );

  /* ---------------- Đánh giá khóa N4 ---------------- */
  await db.insert(schema.reviews).values(
    REVIEWS_N4.map((r) => ({
      authorName: r.name,
      authorRole: r.role,
      courseId: n4Id,
      teacherId: teacherIds.get("mai") ?? null,
      rating: 5,
      content: r.content,
      status: "approved" as const,
      createdAt: new Date(now - r.days * 24 * H),
    })),
  );

  /* ---------------- Lộ trình đề xuất ---------------- */
  await db
    .insert(schema.settings)
    .values({ key: "roadmap", value: { steps: ROADMAP } })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: { steps: ROADMAP } } });

  /* ---------------- Học viên demo: ghi danh, tiến độ, ghi chú ---------------- */
  const minh = await ctx.ids.user("minhanh@nihongo.vn");
  const n5Id = courseIds.get("n5-tieng-nhat-co-ban")!;
  if (minh) {
    await db
      .insert(schema.enrollments)
      .values([
        { userId: minh, courseId: n5Id, createdAt: new Date(now - 150 * 24 * H) },
        { userId: minh, courseId: n4Id, createdAt: new Date(now - 62 * 24 * H) },
        { userId: minh, courseId: courseIds.get("hiragana-katakana")!, createdAt: new Date(now - 160 * 24 * H) },
      ])
      .onConflictDoNothing();

    const progress: (typeof schema.lessonProgress.$inferInsert)[] = [];
    const n5 = lessonsByCourse.get("n5-tieng-nhat-co-ban")!;
    n5.forEach((l, i) => {
      if (i < 11) progress.push({ userId: minh, lessonId: l.id, percent: 100, completedAt: new Date(now - (40 - i * 3) * 24 * H), updatedAt: new Date(now - (40 - i * 3) * 24 * H) });
    });
    progress.push({ userId: minh, lessonId: teId, percent: 52, updatedAt: new Date(now - 2 * H) });
    const n4 = lessonsByCourse.get("ngu-phap-n4")!;
    n4.forEach((l, i) => {
      if (i < 19) progress.push({ userId: minh, lessonId: l.id, percent: 100, completedAt: new Date(now - (60 - i * 3) * 24 * H), updatedAt: new Date(now - (60 - i * 3) * 24 * H) });
      else if (i === 19) progress.push({ userId: minh, lessonId: l.id, percent: 35, updatedAt: new Date(now - 26 * H) });
    });
    for (const l of lessonsByCourse.get("hiragana-katakana")!)
      progress.push({ userId: minh, lessonId: l.id, percent: 100, completedAt: new Date(now - 150 * 24 * H), updatedAt: new Date(now - 150 * 24 * H) });
    await db.insert(schema.lessonProgress).values(progress).onConflictDoNothing();

    const l10 = lessonIdByTitle.get("n5-tieng-nhat-co-ban|Động từ nhóm 1, 2, 3")!;
    const l11 = lessonIdByTitle.get("n5-tieng-nhat-co-ban|Thể ます (Masu-form)")!;
    await db.insert(schema.notes).values([
      { userId: minh, lessonId: teId, atSec: 135, content: "Thể て dùng để nối các hành động theo thứ tự thời gian.", createdAt: new Date(now - 3 * H) },
      { userId: minh, lessonId: teId, atSec: 412, content: "Nhóm 1: う・つ・る → って; む・ぶ・ぬ → んで; く → いて (ngoại lệ 行く → 行って).", createdAt: new Date(now - 2.5 * H) },
      { userId: minh, lessonId: teId, atSec: 640, content: "Vてください = nhờ ai đó làm gì một cách lịch sự.", createdAt: new Date(now - 2 * H) },
      { userId: minh, lessonId: l11, atSec: 520, content: "ます形: bỏ ます để lấy gốc động từ.", createdAt: new Date(now - 6 * 24 * H) },
      { userId: minh, lessonId: l10, atSec: 302, content: "Nhóm 2: đuôi -iru / -eru (trừ một số ngoại lệ như 帰る, 入る).", createdAt: new Date(now - 9 * 24 * H) },
    ]);

    const teVocab = await db.select({ id: schema.vocab.id, order: schema.vocab.order }).from(schema.vocab).where(eq(schema.vocab.lessonId, teId));
    await db
      .insert(schema.savedVocab)
      .values(teVocab.filter((v) => v.order === 1 || v.order === 3).map((v) => ({ userId: minh, vocabId: v.id })))
      .onConflictDoNothing();
    await db.insert(schema.bookmarks).values({ userId: minh, targetType: "lesson", targetId: teId }).onConflictDoNothing();
  }

  /* ---------------- Học viên khác: ghi danh khóa miễn phí + tiến độ ---------------- */
  const students = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "student"))
    .orderBy(schema.users.createdAt)
    .limit(160);
  const others = students.filter((s) => s.id !== minh);
  const kanaId = courseIds.get("hiragana-katakana")!;
  const kana = lessonsByCourse.get("hiragana-katakana")!;
  const kanaStudents = others.filter(() => ctx.rand() < 0.35);
  if (kanaStudents.length) {
    await db
      .insert(schema.enrollments)
      .values(kanaStudents.map((s) => ({ userId: s.id, courseId: kanaId, createdAt: ctx.daysAgo(ctx.int(5, 300)) })))
      .onConflictDoNothing();
    const prog: (typeof schema.lessonProgress.$inferInsert)[] = [];
    for (const s of kanaStudents) {
      const done = ctx.int(0, kana.length);
      kana.forEach((l, i) => {
        if (i < done) prog.push({ userId: s.id, lessonId: l.id, percent: 100, completedAt: ctx.daysAgo(ctx.int(1, 120)) });
        else if (i === done) prog.push({ userId: s.id, lessonId: l.id, percent: ctx.int(10, 80) });
      });
    }
    if (prog.length) await db.insert(schema.lessonProgress).values(prog).onConflictDoNothing();
  }
  // vài lượt xem bài miễn phí ở các khóa khác (để thống kê/“bài học nổi bật” có số liệu)
  const freeLessons = [...lessonsByCourse.values()].flat().filter((l) => l.isFree);
  const views: (typeof schema.lessonProgress.$inferInsert)[] = [];
  for (const l of freeLessons)
    for (const s of others.slice(0, 60)) if (ctx.rand() < 0.25) views.push({ userId: s.id, lessonId: l.id, percent: ctx.int(20, 100) });
  if (views.length) await db.insert(schema.lessonProgress).values(views).onConflictDoNothing();

  /* ---------------- Bình luận Bài 12 ---------------- */
  const sato = await ctx.ids.user("sato@nihongo.vn");
  const mai = await ctx.ids.user("mai@nihongo.vn");
  const commenters = others.slice(5, 40);
  for (const [i, c] of TE_COMMENTS.entries()) {
    const [row] = await db
      .insert(schema.comments)
      .values({ userId: commenters[i % commenters.length].id, lessonId: teId, content: c.text, likes: c.likes, createdAt: new Date(now - c.hoursAgo * H) })
      .returning({ id: schema.comments.id });
    if (c.reply)
      await db.insert(schema.comments).values({
        userId: (i % 2 ? mai : sato) ?? commenters[0].id,
        lessonId: teId,
        parentId: row.id,
        content: c.reply.text,
        likes: c.reply.likes,
        createdAt: new Date(now - c.reply.hoursAgo * H),
      });
  }
  // thêm bình luận ngắn để đủ ~28 thảo luận
  const shorts = [
    "Cảm ơn cô, bài học rất hay!",
    "Phần ví dụ dễ nhớ quá ạ.",
    "Mình đã hiểu cách chia nhóm 1 rồi 🎉",
    "Có ai học cùng nhóm Zalo không ạ?",
    "Video rõ ràng, tốc độ vừa phải.",
    "Bảng tổng hợp in ra dán bàn học là chuẩn luôn.",
    "Cho em xin thêm bài tập về ～ています với ạ.",
    "Hôm nay học xong bài 12, mai học tiếp bài 13!",
    "Phát âm của cô chuẩn và dễ nghe.",
    "Mình hay nhầm 死ぬ → 死んで, giờ nhớ rồi.",
    "Thể て quan trọng thật, gặp ở khắp nơi.",
    "Nhờ bài này mà mình đọc truyện tranh hiểu hơn.",
  ];
  await db.insert(schema.comments).values(
    shorts.map((t, i) => ({
      userId: commenters[(i + 10) % commenters.length].id,
      lessonId: teId,
      content: t,
      likes: ctx.int(0, 9),
      createdAt: new Date(now - (170 + i * 20) * H),
    })),
  );
  // lượt thích của Minh Anh cho một bình luận
  if (minh) {
    const [top] = await db.select({ id: schema.comments.id }).from(schema.comments).where(eq(schema.comments.lessonId, teId)).orderBy(sql`${schema.comments.likes} desc`).limit(1);
    if (top) await db.insert(schema.commentLikes).values({ commentId: top.id, userId: minh }).onConflictDoNothing();
  }

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.lessons);
  console.log(`  ${COURSES.length} khóa học, ${n} bài học, ${allYt.size} video YouTube`);
}
