import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";

/**
 * Lưu trữ tệp công khai (ảnh WebP, tài liệu, avatar).
 * - Có SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → Supabase Storage (bucket công khai, mặc định "media").
 * - Không có → ổ đĩa local (UPLOAD_DIR/public), phục vụ tại /api/files/… (chạy Docker / dev).
 * Video HLS riêng tư chỉ dùng ổ đĩa (PRIVATE_DIR) — không bật trên serverless.
 */

const root = path.resolve(process.env.UPLOAD_DIR ?? "./storage");

/** Tệp công khai trên đĩa, phục vụ tại /api/files/<đường dẫn tương đối>. */
export const PUBLIC_DIR = path.join(root, "public");
/** Tệp riêng tư (video HLS, khoá mã hoá) — không bao giờ phục vụ tĩnh. */
export const PRIVATE_DIR = path.join(root, "private");

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const BUCKET = process.env.SUPABASE_BUCKET ?? "media";

/** true khi tệp được lưu trên Supabase Storage. */
export const useSupabaseStorage = !!(SUPABASE_URL && SUPABASE_KEY);

/** Môi trường serverless (Vercel): không có ổ đĩa lâu dài, không chạy ffmpeg nền. */
export const isServerless = !!process.env.VERCEL;

const toPosix = (rel: string) => rel.split(path.sep).join("/").replace(/^\/+/, "");

export const publicUrl = (rel: string) =>
  useSupabaseStorage
    ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURI(toPosix(rel))}`
    : `/api/files/${toPosix(rel)}`;

/** Ghi một tệp công khai và trả về URL. */
export async function putPublic(rel: string, data: Buffer, contentType: string): Promise<string> {
  const key = toPosix(rel);
  if (useSupabaseStorage) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(key)}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY!,
        "content-type": contentType,
        "x-upsert": "true",
        "cache-control": "max-age=31536000",
      },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Supabase Storage upload lỗi ${res.status}: ${await res.text()}`);
    return publicUrl(key);
  }
  const abs = path.join(PUBLIC_DIR, key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
  return publicUrl(key);
}

/** Đường dẫn tương đối của một URL do putPublic trả về (null nếu không thuộc kho này). */
export function relOfUrl(url: string): string | null {
  const supaPrefix = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/` : null;
  let rel: string | null = null;
  if (supaPrefix && url.startsWith(supaPrefix)) rel = decodeURI(url.slice(supaPrefix.length));
  else if (url.startsWith("/api/files/")) rel = decodeURIComponent(url.slice("/api/files/".length));
  if (!rel || rel.split("/").includes("..")) return null;
  return rel;
}

/** Xoá một tệp công khai theo URL (bỏ qua lỗi không tìm thấy). */
export async function removePublic(url: string) {
  const rel = relOfUrl(url);
  if (!rel) return;
  if (useSupabaseStorage && url.startsWith(SUPABASE_URL!)) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY!, "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [rel] }),
    }).catch(() => {});
    return;
  }
  const abs = path.resolve(PUBLIC_DIR, rel);
  if (abs.startsWith(path.resolve(PUBLIC_DIR) + path.sep)) await rm(abs, { force: true }).catch(() => {});
}

/** Tạo bucket công khai nếu chưa có (chạy lúc setup/seed). */
export async function ensureBucket() {
  if (!useSupabaseStorage) return;
  const headers = { authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY!, "content-type": "application/json" };
  const got = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, { headers });
  if (got.ok) return;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 50 * 1024 * 1024 }),
  });
  if (!res.ok && res.status !== 409) throw new Error(`Không tạo được bucket ${BUCKET}: ${await res.text()}`);
}
