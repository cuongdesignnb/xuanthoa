import type { FastifyInstance, FastifyRequest } from "fastify";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, unlink, rename, copyFile } from "node:fs/promises";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import os from "node:os";
import path from "node:path";
import { eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { allOf, badRequest, countAll, HttpError, listQuery, notFound, orderOf, pageOf, parse, searchWhere } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";
import { PUBLIC_DIR, publicUrl } from "../lib/storage.js";

const m = schema.media;

type MediaSettings = { webpQuality: number; maxWidth: number; deleteOriginal: boolean };
const DEFAULT_MEDIA: MediaSettings = { webpQuality: 82, maxWidth: 2400, deleteOriginal: true };

export async function mediaSettings(): Promise<MediaSettings> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, "media"));
  const v = (row?.value ?? {}) as Partial<MediaSettings>;
  return {
    webpQuality: clamp(Number(v.webpQuality) || DEFAULT_MEDIA.webpQuality, 30, 100),
    maxWidth: clamp(Number(v.maxWidth) || DEFAULT_MEDIA.maxWidth, 320, 8000),
    deleteOriginal: true, // bản gốc không bao giờ được giữ lại
  };
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/** Giới hạn dung lượng. */
const MAX_IMAGE = 40 * 1024 * 1024;
const MAX_FILE = 50 * 1024 * 1024;

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "tif", "tiff", "bmp", "heic", "heif", "svg", "jfif"]);
/** Tệp không phải ảnh được phép lưu nguyên dạng. */
const FILE_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  srt: "text/plain",
  vtt: "text/vtt",
};

const extOf = (name: string) => path.extname(name).slice(1).toLowerCase();

/** Tên thư mục hiển thị (giữ tiếng Việt), bỏ ký tự lạ. */
function cleanFolder(v: unknown) {
  const s = String(v ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} _/-]+/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s/-]+|[\s/-]+$/g, "")
    .slice(0, 60);
  return s || "general";
}

/** Ghi stream ra tệp tạm, ném 413 nếu vượt giới hạn. */
async function streamToTemp(file: NodeJS.ReadableStream, limit: number) {
  const tmp = path.join(os.tmpdir(), `nh-up-${nanoid(12)}`);
  let bytes = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      bytes += chunk.length;
      if (bytes > limit) cb(new HttpError(413, `Tệp vượt quá giới hạn ${Math.round(limit / 1024 / 1024)}MB`));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(file, counter, createWriteStream(tmp));
  } catch (e) {
    await unlink(tmp).catch(() => {});
    (file as NodeJS.ReadableStream & { resume?: () => void }).resume?.();
    throw e;
  }
  return { tmp, bytes };
}

type Pending = { tmp: string; bytes: number; name: string; mimetype: string };

/** Chuyển một tệp tạm thành bản ghi media (ảnh → WebP, tệp → giữ nguyên). Luôn xoá tệp tạm. */
async function storeOne(p: Pending, folder: string, userId: string | undefined, cfg: MediaSettings) {
  const ext = extOf(p.name);
  const now = new Date();
  const relDir = path.join("media", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  await mkdir(path.join(PUBLIC_DIR, relDir), { recursive: true });
  const id = nanoid(16);
  const isImage = p.mimetype.startsWith("image/") || IMAGE_EXT.has(ext);
  try {
    if (isImage) {
      if (p.bytes > MAX_IMAGE) throw badRequest(`Ảnh vượt quá ${MAX_IMAGE / 1024 / 1024}MB`);
      // Đọc vào bộ nhớ để sharp không giữ handle tệp tạm (Windows không xoá được tệp đang mở).
      const input = await readFile(p.tmp);
      await unlink(p.tmp).catch(() => {});
      let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
      try {
        meta = await sharp(input, { failOn: "none" }).metadata();
      } catch {
        throw badRequest(`Không đọc được ảnh "${p.name}" (định dạng chưa hỗ trợ)`);
      }
      const animated = (meta.pages ?? 1) > 1 && (meta.format === "gif" || meta.format === "webp");
      const rel = path.join(relDir, `${id}.webp`);
      const out = path.join(PUBLIC_DIR, rel);
      let img = sharp(input, { failOn: "none", animated, limitInputPixels: 268402689 });
      if (!animated) img = img.rotate();
      const info = await img
        .resize({ width: cfg.maxWidth, withoutEnlargement: true })
        .webp({ quality: cfg.webpQuality, effort: 4 })
        .toFile(out);
      const height = animated ? (info.height ?? 0) / Math.max(1, meta.pages ?? 1) : info.height;
      const [row] = await db
        .insert(m)
        .values({
          filename: path.basename(p.name, path.extname(p.name)) + ".webp",
          originalName: p.name,
          url: publicUrl(rel),
          mime: "image/webp",
          size: info.size,
          width: info.width,
          height: Math.round(height),
          folder,
          createdById: userId,
        })
        .returning();
      return { ...row, originalSize: p.bytes, savedPercent: p.bytes ? Math.round((1 - info.size / p.bytes) * 100) : 0, converted: true };
    }
    const mime = FILE_EXT[ext];
    if (!mime) throw badRequest(`Loại tệp ".${ext || "?"}" không được phép`);
    if (p.bytes > MAX_FILE) throw badRequest(`Tệp vượt quá ${MAX_FILE / 1024 / 1024}MB`);
    const rel = path.join(relDir, `${id}.${ext}`);
    const out = path.join(PUBLIC_DIR, rel);
    await rename(p.tmp, out).catch(async () => {
      await copyFile(p.tmp, out);
    });
    const [row] = await db
      .insert(m)
      .values({ filename: p.name, originalName: p.name, url: publicUrl(rel), mime, size: p.bytes, folder, createdById: userId })
      .returning();
    return { ...row, originalSize: p.bytes, savedPercent: 0, converted: false };
  } finally {
    await unlink(p.tmp).catch(() => {});
  }
}

/** Đường dẫn đĩa của một url /api/files/... (chặn thoát thư mục). */
export function fileOfUrl(url: string) {
  if (!url.startsWith("/api/files/")) return null;
  const rel = decodeURIComponent(url.slice("/api/files/".length));
  const abs = path.resolve(PUBLIC_DIR, rel);
  return abs.startsWith(path.resolve(PUBLIC_DIR) + path.sep) ? abs : null;
}

async function removeRows(req: FastifyRequest, ids: string[]) {
  if (!ids.length) return 0;
  const rows = await db.delete(m).where(inArray(m.id, ids)).returning();
  for (const r of rows) {
    const f = fileOfUrl(r.url);
    if (f) await rm(f, { force: true }).catch(() => {});
  }
  if (rows.length === 1) await logActivity(req, "delete", "media", rows[0].id, `Xoá tệp ${rows[0].filename}`);
  else if (rows.length) await logActivity(req, "delete", "media", null, `Xoá ${rows.length} tệp media`);
  return rows.length;
}

export default async function mediaRoutes(app: FastifyInstance) {
  /** Upload một hoặc nhiều tệp (multipart). Ảnh → WebP, bản gốc không được giữ. */
  app.post("/api/admin/media", { preHandler: requirePerm("media.write") }, async (req, reply) => {
    if (!req.isMultipart()) throw badRequest("Yêu cầu multipart/form-data");
    const pending: Pending[] = [];
    let folder = cleanFolder((req.query as { folder?: string }).folder);
    try {
      for await (const part of req.parts()) {
        if (part.type === "file") {
          if (!part.filename) {
            part.file.resume();
            continue;
          }
          const { tmp, bytes } = await streamToTemp(part.file, Math.max(MAX_IMAGE, MAX_FILE));
          pending.push({ tmp, bytes, name: part.filename, mimetype: part.mimetype || "" });
        } else if (part.fieldname === "folder") {
          folder = cleanFolder(part.value);
        }
      }
    } catch (e) {
      await Promise.all(pending.map((p) => unlink(p.tmp).catch(() => {})));
      throw e;
    }
    if (!pending.length) throw badRequest("Chưa chọn tệp nào");

    const cfg = await mediaSettings();
    const items: Record<string, unknown>[] = [];
    const errors: { name: string; error: string }[] = [];
    for (const p of pending) {
      try {
        items.push(await storeOne(p, folder, req.authUser?.id, cfg));
      } catch (e) {
        errors.push({ name: p.name, error: e instanceof Error ? e.message : String(e) });
      }
    }
    if (!items.length) throw badRequest(errors[0]?.error ?? "Upload thất bại", errors);
    await logActivity(
      req,
      "create",
      "media",
      items.length === 1 ? String(items[0].id) : null,
      items.length === 1 ? `Tải lên ${items[0].filename}` : `Tải lên ${items.length} tệp`,
    );
    return reply.code(201).send({ items, errors });
  });

  app.get("/api/admin/media", { preHandler: requirePerm("media.read") }, async (req) => {
    const q = parse(
      listQuery.extend({ folder: z.string().optional(), type: z.enum(["image", "file", ""]).optional() }),
      req.query,
    );
    const where = allOf(
      searchWhere(q.q, [m.filename, m.originalName, m.alt]),
      q.folder ? eq(m.folder, q.folder) : undefined,
      q.type === "image" ? sql`${m.mime} like 'image/%'` : q.type === "file" ? sql`${m.mime} not like 'image/%'` : undefined,
    );
    const { limit, offset } = pageOf(q);
    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(m)
        .where(where)
        .orderBy(orderOf(q, { createdAt: m.createdAt, size: m.size, filename: m.filename }, m.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(m).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  app.get("/api/admin/media/folders", { preHandler: requirePerm("media.read") }, async () => {
    const rows = await db.select({ folder: m.folder, count: countAll }).from(m).groupBy(m.folder).orderBy(m.folder);
    const [{ total, size }] = await db.select({ total: countAll, size: sql<number>`coalesce(sum(${m.size}),0)::bigint` }).from(m);
    return { items: rows, total, size: Number(size) };
  });

  app.get<{ Params: { id: string } }>("/api/admin/media/:id", { preHandler: requirePerm("media.read") }, async (req) => {
    const [row] = await db.select().from(m).where(eq(m.id, req.params.id));
    if (!row) throw notFound();
    return row;
  });

  app.patch<{ Params: { id: string } }>("/api/admin/media/:id", { preHandler: requirePerm("media.write") }, async (req) => {
    const body = parse(
      z.object({
        alt: z.string().max(300).nullable().optional(),
        folder: z.string().max(60).optional(),
        filename: z.string().trim().min(1, "Tên tệp không được trống").max(200).optional(),
      }),
      req.body,
    );
    const data: Partial<typeof m.$inferInsert> = {};
    if (body.alt !== undefined) data.alt = body.alt;
    if (body.folder !== undefined) data.folder = cleanFolder(body.folder);
    if (body.filename !== undefined) data.filename = body.filename;
    const [row] = await db.update(m).set(data).where(eq(m.id, req.params.id)).returning();
    if (!row) throw notFound();
    await logActivity(req, "update", "media", row.id, `Cập nhật tệp ${row.filename}`);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/media/:id", { preHandler: requirePerm("media.write") }, async (req, reply) => {
    const n = await removeRows(req, [req.params.id]);
    if (!n) throw notFound();
    return reply.code(204).send();
  });

  app.post("/api/admin/media/bulk-delete", { preHandler: requirePerm("media.write") }, async (req) => {
    const { ids } = parse(z.object({ ids: z.array(z.string()).min(1).max(500) }), req.body);
    return { deleted: await removeRows(req, ids) };
  });

  /** Chuyển nhiều tệp sang thư mục khác. */
  app.post("/api/admin/media/bulk-move", { preHandler: requirePerm("media.write") }, async (req) => {
    const { ids, folder } = parse(z.object({ ids: z.array(z.string()).min(1).max(500), folder: z.string().max(60) }), req.body);
    const rows = await db.update(m).set({ folder: cleanFolder(folder) }).where(inArray(m.id, ids)).returning({ id: m.id });
    await logActivity(req, "update", "media", null, `Chuyển ${rows.length} tệp sang "${cleanFolder(folder)}"`);
    return { moved: rows.length };
  });
}


