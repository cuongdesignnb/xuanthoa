import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import os from "node:os";
import path from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { allOf, badRequest, countAll, forbidden, HttpError, listQuery, notFound, orderOf, pageOf, parse, searchWhere } from "../lib/http.js";
import { can, logActivity, optionalUser, requirePerm, requireUser, type AuthUser } from "../lib/auth.js";
import { PRIVATE_DIR, PUBLIC_DIR, publicUrl, isServerless } from "../lib/storage.js";

const v = schema.videos;

/* ------------------------------------------------------------------ */
/* ffmpeg                                                               */
/* ------------------------------------------------------------------ */

let ffmpegBin: string | null = null;
async function ffmpegPath() {
  if (ffmpegBin) return ffmpegBin;
  const p = process.env.FFMPEG_PATH || ((await import("ffmpeg-static")).default as unknown as string | null);
  if (!p) throw new Error("Không tìm thấy ffmpeg (đặt FFMPEG_PATH)");
  ffmpegBin = p;
  return p;
}

const running = new Map<string, ChildProcess>();

function runFfmpeg(args: string[], videoId?: string): Promise<string> {
  return ffmpegPath().then(
    (bin) =>
      new Promise((resolve, reject) => {
        const child = spawn(bin, ["-hide_banner", "-nostdin", ...args], { windowsHide: true });
        if (videoId) running.set(videoId, child);
        let err = "";
        child.stderr.on("data", (d: Buffer) => {
          err += d.toString();
          if (err.length > 200_000) err = err.slice(-100_000);
        });
        child.on("error", reject);
        child.on("close", (code) => {
          if (videoId && running.get(videoId) === child) running.delete(videoId);
          if (code === 0) resolve(err);
          else reject(new Error(`ffmpeg thoát với mã ${code}: ${err.split(/\r?\n/).filter(Boolean).slice(-3).join(" | ")}`));
        });
      }),
  );
}

const parseDuration = (log: string) => {
  const mm = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return mm ? Math.round(Number(mm[1]) * 3600 + Number(mm[2]) * 60 + Number(mm[3])) : null;
};

const tmpInput = (id: string) => path.join(os.tmpdir(), `nh-video-${id}.src`);
const hlsDirOf = (id: string) => path.join(PRIVATE_DIR, "videos", id);
const thumbRel = (id: string) => path.join("videos", `${id}.webp`);

/** Hàng đợi xử lý tuần tự (tránh quá tải CPU). */
const queue: string[] = [];
let busy = false;

function enqueue(id: string) {
  if (!queue.includes(id)) queue.push(id);
  void drain();
}

async function drain() {
  if (busy) return;
  busy = true;
  try {
    while (queue.length) {
      const id = queue.shift()!;
      await transcode(id).catch(() => {});
    }
  } finally {
    busy = false;
  }
}

async function transcode(id: string) {
  const input = tmpInput(id);
  const dir = hlsDirOf(id);
  try {
    const [row] = await db.select({ id: v.id }).from(v).where(eq(v.id, id));
    if (!row) return; // đã bị xoá
    if (!existsSync(input)) throw new Error("Không tìm thấy tệp tải lên");
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    // Khoá AES-128 + IV ngẫu nhiên; khoá nằm trong PRIVATE_DIR, chỉ cấp qua /api/stream/:id/key có token.
    const key = randomBytes(16);
    const iv = randomBytes(16).toString("hex");
    const keyFile = path.join(dir, "enc.key");
    const keyInfo = path.join(dir, "enc.keyinfo");
    await writeFile(keyFile, key);
    await writeFile(keyInfo, `key\n${keyFile}\n${iv}\n`);

    const log = await runFfmpeg(
      [
        "-y",
        "-i", input,
        "-map", "0:v:0", "-map", "0:a:0?",
        "-vf", "scale=-2:'trunc(min(720,ih)/2)*2'",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-profile:v", "main", "-pix_fmt", "yuv420p",
        "-force_key_frames", "expr:gte(t,n_forced*6)", "-sc_threshold", "0",
        "-c:a", "aac", "-b:a", "128k", "-ac", "2",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_key_info_file", keyInfo,
        "-hls_segment_filename", path.join(dir, "seg%04d.ts"),
        path.join(dir, "index.m3u8"),
      ],
      id,
    );
    await unlink(keyInfo).catch(() => {});
    const durationSec = parseDuration(log);

    // Ảnh thumbnail → WebP công khai.
    let thumbnailUrl: string | null = null;
    try {
      const jpg = path.join(os.tmpdir(), `nh-thumb-${id}.jpg`);
      const at = durationSec ? Math.min(3, durationSec / 3) : 0;
      await runFfmpeg(["-y", "-ss", at.toFixed(2), "-i", input, "-frames:v", "1", "-vf", "scale=960:-2", jpg]);
      await mkdir(path.join(PUBLIC_DIR, "videos"), { recursive: true });
      await sharp(jpg).webp({ quality: 80 }).toFile(path.join(PUBLIC_DIR, thumbRel(id)));
      await unlink(jpg).catch(() => {});
      thumbnailUrl = publicUrl(thumbRel(id));
    } catch {
      /* thumbnail không bắt buộc */
    }

    let sizeBytes = 0;
    for (const f of await readdir(dir)) if (f.endsWith(".ts")) sizeBytes += (await stat(path.join(dir, f))).size;

    await db
      .update(v)
      .set({ status: "ready", hlsDir: path.join("videos", id).split(path.sep).join("/"), durationSec, thumbnailUrl, sizeBytes, error: null })
      .where(eq(v.id, id));
    await unlink(input).catch(() => {});
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.update(v).set({ status: "failed", error: msg.slice(0, 500) }).where(eq(v.id, id)).catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    await unlink(input).catch(() => {});
  }
}

/** Khi khởi động lại server: tiếp tục các video đang xử lý (nếu còn tệp tạm), còn lại đánh dấu lỗi. */
async function resumePending() {
  try {
    const rows = await db.select({ id: v.id }).from(v).where(and(eq(v.source, "upload"), inArray(v.status, ["processing", "pending"])));
    for (const r of rows) {
      if (existsSync(tmpInput(r.id))) enqueue(r.id);
      else await db.update(v).set({ status: "failed", error: "Máy chủ khởi động lại khi đang xử lý — vui lòng tải lại video" }).where(eq(v.id, r.id));
    }
  } catch {
    /* DB chưa sẵn sàng */
  }
}

/* ------------------------------------------------------------------ */
/* Token phát video (HMAC, ngắn hạn)                                    */
/* ------------------------------------------------------------------ */

const tokenKey = () => createHmac("sha256", process.env.JWT_SECRET ?? "dev").update("video-stream-v1").digest();
const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signVideoToken(vid: string, uid: string, ttlSec: number) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = b64u(JSON.stringify({ v: vid, u: uid, e: exp }));
  const sig = createHmac("sha256", tokenKey()).update(body).digest("base64url");
  return { token: `${body}.${sig}`, exp };
}

function verifyVideoToken(token: string | undefined, vid: string) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = createHmac("sha256", tokenKey()).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expect.length || !timingSafeEqual(got, expect)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { v: string; u: string; e: number };
    // Cho phép trễ 60 giây để đoạn đang tải dở không bị cắt ngang.
    if (p.v !== vid || p.e + 60 < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

async function videoSettings() {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, "video"));
  const val = (row?.value ?? {}) as { tokenTtlSec?: number; watermark?: boolean };
  return { ttl: Math.min(3600, Math.max(60, Number(val.tokenTtlSec) || 600)), watermark: val.watermark !== false };
}

const isStaff = (u: AuthUser | null) => !!u && u.role !== "student" && (can(u, "media.read") || can(u, "courses.read"));

/** Kiểm tra quyền xem video qua một bài học cụ thể. */
async function lessonAccess(lessonId: string, u: AuthUser | null) {
  const [l] = await db
    .select({
      id: schema.lessons.id,
      videoId: schema.lessons.videoId,
      isFree: schema.lessons.isFree,
      status: schema.lessons.status,
      courseId: schema.modules.courseId,
      courseStatus: schema.courses.status,
    })
    .from(schema.lessons)
    .innerJoin(schema.modules, eq(schema.modules.id, schema.lessons.moduleId))
    .innerJoin(schema.courses, eq(schema.courses.id, schema.modules.courseId))
    .where(eq(schema.lessons.id, lessonId));
  if (!l) throw notFound("Không tìm thấy bài học");
  if (isStaff(u)) return l;
  if (l.status !== "published" || l.courseStatus !== "published") throw notFound("Không tìm thấy bài học");
  if (l.isFree) return l;
  if (!u) throw new HttpError(401, "Vui lòng đăng nhập để xem bài học này", { code: "login" });
  const [en] = await db
    .select({ userId: schema.enrollments.userId })
    .from(schema.enrollments)
    .where(and(eq(schema.enrollments.userId, u.id), eq(schema.enrollments.courseId, l.courseId), eq(schema.enrollments.status, "active")));
  if (!en) throw new HttpError(403, "Đăng ký khóa học để xem bài này", { code: "locked" });
  return l;
}

/** Kiểm tra quyền xem video (không có bài học cụ thể): nhân sự, hoặc có bài học miễn phí/đã ghi danh dùng video này. */
async function videoAccess(videoId: string, u: AuthUser) {
  if (isStaff(u)) return;
  const [r] = await db.execute<{ ok: boolean }>(sql`
    select exists(
      select 1 from ${schema.lessons} l
      join ${schema.modules} mo on mo.id = l.module_id
      join ${schema.courses} c on c.id = mo.course_id
      where l.video_id = ${videoId} and l.status = 'published' and c.status = 'published'
        and (l.is_free or exists(select 1 from ${schema.enrollments} e where e.user_id = ${u.id} and e.course_id = c.id and e.status = 'active'))
    ) as ok`);
  if (!r?.ok) throw new HttpError(403, "Đăng ký khóa học để xem bài này", { code: "locked" });
}

async function issueToken(videoId: string, u: AuthUser | null) {
  const [row] = await db.select().from(v).where(eq(v.id, videoId));
  if (!row) throw notFound("Không tìm thấy video");
  if (row.source === "youtube") return { source: "youtube" as const, youtubeId: row.youtubeId, title: row.title };
  if (row.status !== "ready") throw new HttpError(409, row.status === "failed" ? "Video xử lý lỗi" : "Video đang được xử lý, vui lòng quay lại sau");
  const cfg = await videoSettings();
  const { token, exp } = signVideoToken(row.id, u?.id ?? "anon", cfg.ttl);
  return {
    source: "upload" as const,
    token,
    expiresAt: exp,
    ttl: cfg.ttl,
    url: `/api/stream/${row.id}/index.m3u8?t=${encodeURIComponent(token)}`,
    poster: row.thumbnailUrl,
    durationSec: row.durationSec,
    title: row.title,
    watermark: cfg.watermark ? (u?.email ?? null) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

const VIDEO_EXT = new Set(["mp4", "mov", "webm", "m4v", "mkv"]);
const MAX_VIDEO = 2 * 1024 * 1024 * 1024;

export function parseYoutubeId(input: string) {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1, 12).match(/^[\w-]{11}$/)?.[0] ?? null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const q = u.searchParams.get("v");
      if (q && /^[\w-]{11}$/.test(q)) return q;
      return u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null;
    }
  } catch {
    /* noop */
  }
  return null;
}

const noStore = (reply: FastifyReply) =>
  reply.header("Cache-Control", "private, no-store, max-age=0").header("Content-Disposition", "inline").header("X-Content-Type-Options", "nosniff");

function tokenOf(req: FastifyRequest) {
  return (req.query as { t?: string }).t;
}

export default async function videoRoutes(app: FastifyInstance) {
  // Serverless (Vercel): không có ổ đĩa lâu dài/ffmpeg nền → chỉ dùng video YouTube.
  if (!isServerless) void resumePending();

  /* ---------- Admin ---------- */

  app.get("/api/admin/videos", { preHandler: requirePerm("media.read") }, async (req) => {
    const q = parse(
      listQuery.extend({ source: z.enum(["upload", "youtube", ""]).optional(), status: z.enum(["pending", "processing", "ready", "failed", ""]).optional() }),
      req.query,
    );
    const where = allOf(searchWhere(q.q, [v.title, v.youtubeId]), q.source ? eq(v.source, q.source) : undefined, q.status ? eq(v.status, q.status) : undefined);
    const { limit, offset } = pageOf(q);
    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(v)
        .where(where)
        .orderBy(orderOf(q, { createdAt: v.createdAt, title: v.title, durationSec: v.durationSec, status: v.status }, v.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(v).where(where),
    ]);
    // Số bài học đang dùng mỗi video.
    const ids = items.map((i) => i.id);
    const usage = ids.length
      ? await db
          .select({ videoId: schema.lessons.videoId, n: countAll })
          .from(schema.lessons)
          .where(inArray(schema.lessons.videoId, ids))
          .groupBy(schema.lessons.videoId)
      : [];
    const used = new Map(usage.map((u) => [u.videoId, u.n]));
    return { items: items.map((i) => ({ ...i, hlsDir: undefined, lessonCount: used.get(i.id) ?? 0 })), total, page: q.page, pageSize: q.pageSize };
  });

  app.get<{ Params: { id: string } }>("/api/admin/videos/:id", { preHandler: requirePerm("media.read") }, async (req) => {
    const [row] = await db.select().from(v).where(eq(v.id, req.params.id));
    if (!row) throw notFound();
    return { ...row, hlsDir: undefined };
  });

  app.get<{ Params: { id: string } }>("/api/admin/videos/:id/status", { preHandler: requirePerm("media.read") }, async (req) => {
    const [row] = await db
      .select({ id: v.id, status: v.status, error: v.error, durationSec: v.durationSec, thumbnailUrl: v.thumbnailUrl })
      .from(v)
      .where(eq(v.id, req.params.id));
    if (!row) throw notFound();
    return { ...row, queuePosition: row.status === "processing" ? queue.indexOf(row.id) + 1 : 0 };
  });

  /** Upload video (multipart, một hoặc nhiều tệp; trường `title` tuỳ chọn). Trả về ngay, xử lý HLS chạy nền. */
  app.post("/api/admin/videos", { preHandler: requirePerm("media.write") }, async (req, reply) => {
    if (isServerless)
      throw new HttpError(501, "Bản cloud chưa hỗ trợ upload video (cần máy chủ có ffmpeg). Vui lòng dùng link YouTube.");
    if (!req.isMultipart()) throw badRequest("Yêu cầu multipart/form-data");
    const files: { tmp: string; name: string; bytes: number }[] = [];
    let title = "";
    try {
      for await (const part of req.parts()) {
        if (part.type === "file") {
          const ext = path.extname(part.filename || "").slice(1).toLowerCase();
          if (!part.filename || !(VIDEO_EXT.has(ext) || part.mimetype?.startsWith("video/"))) {
            part.file.resume();
            throw badRequest(`Tệp "${part.filename}" không phải video (mp4, mov, webm)`);
          }
          const tmp = path.join(os.tmpdir(), `nh-vup-${randomBytes(8).toString("hex")}`);
          let bytes = 0;
          const counter = new Transform({
            transform(chunk: Buffer, _e, cb) {
              bytes += chunk.length;
              if (bytes > MAX_VIDEO) cb(new HttpError(413, "Video vượt quá 2GB"));
              else cb(null, chunk);
            },
          });
          try {
            await pipeline(part.file, counter, createWriteStream(tmp));
          } catch (e) {
            await unlink(tmp).catch(() => {});
            throw e;
          }
          files.push({ tmp, name: part.filename, bytes });
        } else if (part.fieldname === "title") {
          title = String(part.value ?? "").trim();
        }
      }
    } catch (e) {
      await Promise.all(files.map((f) => unlink(f.tmp).catch(() => {})));
      throw e;
    }
    if (!files.length) throw badRequest("Chưa chọn video");

    const items = [];
    for (const f of files) {
      const name = (files.length === 1 && title) || path.basename(f.name, path.extname(f.name)).replace(/[_-]+/g, " ").trim() || "Video";
      const [row] = await db
        .insert(v)
        .values({ title: name.slice(0, 200), source: "upload", status: "processing", sizeBytes: f.bytes, createdById: req.authUser?.id })
        .returning();
      // Đổi tên tệp tạm theo id để có thể tiếp tục xử lý nếu server khởi động lại.
      await rename(f.tmp, tmpInput(row.id));
      items.push(row);
      enqueue(row.id);
      await logActivity(req, "create", "video", row.id, `Tải lên video ${row.title}`);
    }
    return reply.code(202).send({ items });
  });

  app.post("/api/admin/videos/youtube", { preHandler: requirePerm("media.write") }, async (req, reply) => {
    const body = parse(
      z.object({
        url: z.string().trim().min(1, "Nhập link YouTube"),
        title: z.string().trim().max(200).optional(),
        durationSec: z.coerce.number().int().min(0).optional(),
      }),
      req.body,
    );
    const yid = parseYoutubeId(body.url);
    if (!yid) throw badRequest("Dữ liệu không hợp lệ", [{ path: "url", message: "Link YouTube không hợp lệ" }]);
    const [exists] = await db.select().from(v).where(and(eq(v.source, "youtube"), eq(v.youtubeId, yid)));
    if (exists) return reply.code(200).send(exists);
    const [row] = await db
      .insert(v)
      .values({
        title: body.title || `YouTube ${yid}`,
        source: "youtube",
        youtubeId: yid,
        status: "ready",
        durationSec: body.durationSec ?? null,
        thumbnailUrl: `https://i.ytimg.com/vi/${yid}/hqdefault.jpg`,
        createdById: req.authUser?.id,
      })
      .returning();
    await logActivity(req, "create", "video", row.id, `Thêm video YouTube ${row.title}`);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/videos/:id", { preHandler: requirePerm("media.write") }, async (req) => {
    const body = parse(
      z.object({
        title: z.string().trim().min(1, "Nhập tiêu đề").max(200).optional(),
        durationSec: z.coerce.number().int().min(0).nullable().optional(),
        thumbnailUrl: z.string().max(500).nullable().optional(),
      }),
      req.body,
    );
    const [row] = await db.update(v).set(body).where(eq(v.id, req.params.id)).returning();
    if (!row) throw notFound();
    await logActivity(req, "update", "video", row.id, `Cập nhật video ${row.title}`);
    return { ...row, hlsDir: undefined };
  });

  /** Thử xử lý lại video lỗi (chỉ khi còn tệp tạm). */
  app.post<{ Params: { id: string } }>("/api/admin/videos/:id/retry", { preHandler: requirePerm("media.write") }, async (req) => {
    const [row] = await db.select().from(v).where(eq(v.id, req.params.id));
    if (!row) throw notFound();
    if (!existsSync(tmpInput(row.id))) throw badRequest("Tệp gốc không còn — vui lòng tải lại video");
    await db.update(v).set({ status: "processing", error: null }).where(eq(v.id, row.id));
    enqueue(row.id);
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/videos/:id", { preHandler: requirePerm("media.write") }, async (req, reply) => {
    const [row] = await db.delete(v).where(eq(v.id, req.params.id)).returning();
    if (!row) throw notFound();
    const i = queue.indexOf(row.id);
    if (i >= 0) queue.splice(i, 1);
    running.get(row.id)?.kill("SIGKILL");
    setTimeout(async () => {
      await rm(hlsDirOf(row.id), { recursive: true, force: true }).catch(() => {});
      await rm(path.join(PUBLIC_DIR, thumbRel(row.id)), { force: true }).catch(() => {});
      await unlink(tmpInput(row.id)).catch(() => {});
    }, 500);
    await logActivity(req, "delete", "video", row.id, `Xoá video ${row.title}`);
    return reply.code(204).send();
  });

  /* ---------- Cấp token phát ---------- */

  /** Theo video (nhân sự xem trước, hoặc học viên có quyền qua bài học). Body tuỳ chọn { lessonId }. */
  app.post<{ Params: { id: string } }>("/api/me/videos/:id/token", async (req) => {
    const u = await requireUser(req);
    const { lessonId } = parse(z.object({ lessonId: z.string().optional() }).default({}), req.body ?? {});
    if (lessonId) {
      const l = await lessonAccess(lessonId, u);
      if (l.videoId !== req.params.id) throw forbidden();
    } else await videoAccess(req.params.id, u);
    return issueToken(req.params.id, u);
  });

  /** Theo bài học (khách xem được bài miễn phí). */
  app.get<{ Params: { lessonId: string } }>("/api/public/lessons/:lessonId/video-token", async (req) => {
    const u = await optionalUser(req);
    const l = await lessonAccess(req.params.lessonId, u);
    if (!l.videoId) throw notFound("Bài học chưa có video");
    return issueToken(l.videoId, u);
  });

  /* ---------- Stream HLS (mọi request đều kiểm tra token) ---------- */

  const idRe = /^[\w-]{8,64}$/;

  app.get<{ Params: { id: string } }>("/api/stream/:id/index.m3u8", async (req, reply) => {
    const { id } = req.params;
    const t = tokenOf(req);
    if (!idRe.test(id) || !verifyVideoToken(t, id)) return noStore(reply).code(401).send({ error: "Token không hợp lệ hoặc đã hết hạn" });
    let text: string;
    try {
      text = await readFile(path.join(hlsDirOf(id), "index.m3u8"), "utf8");
    } catch {
      throw notFound("Không tìm thấy video");
    }
    const qt = `t=${encodeURIComponent(t!)}`;
    const out = text
      .split(/\r?\n/)
      .map((line) => {
        if (line.startsWith("#EXT-X-KEY")) return line.replace(/URI="[^"]*"/, `URI="/api/stream/${id}/key?${qt}"`);
        if (line && !line.startsWith("#")) return `/api/stream/${id}/${path.basename(line.trim())}?${qt}`;
        return line;
      })
      .join("\n");
    return noStore(reply).type("application/vnd.apple.mpegurl").send(out);
  });

  app.get<{ Params: { id: string } }>(
    "/api/stream/:id/key",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id } = req.params;
      if (!idRe.test(id) || !verifyVideoToken(tokenOf(req), id)) return noStore(reply).code(401).send({ error: "Token không hợp lệ hoặc đã hết hạn" });
      let key: Buffer;
      try {
        key = await readFile(path.join(hlsDirOf(id), "enc.key"));
      } catch {
        throw notFound();
      }
      return noStore(reply).type("application/octet-stream").send(key);
    },
  );

  app.get<{ Params: { id: string; file: string } }>("/api/stream/:id/:file", async (req, reply) => {
    const { id, file } = req.params;
    if (!idRe.test(id) || !/^seg\d+\.ts$/.test(file)) throw notFound();
    if (!verifyVideoToken(tokenOf(req), id)) return noStore(reply).code(401).send({ error: "Token không hợp lệ hoặc đã hết hạn" });
    const f = path.join(hlsDirOf(id), file);
    let size: number;
    try {
      size = (await stat(f)).size;
    } catch {
      throw notFound();
    }
    return noStore(reply).type("video/mp2t").header("Content-Length", size).send(createReadStream(f));
  });
}
