import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Mã hoá bí mật lưu trong DB (vd khoá AI nhập ở trang Cài đặt) bằng AES-256-GCM.
 * Khoá mã hoá suy ra từ JWT_SECRET (hoặc SETTINGS_SECRET nếu đặt riêng) — đổi secret thì phải nhập lại bí mật.
 */
const keyOf = () => createHash("sha256").update(`${process.env.SETTINGS_SECRET || process.env.JWT_SECRET || ""}:settings`).digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyOf(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(token: string | undefined | null): string {
  if (!token?.startsWith("v1:")) return "";
  try {
    const [, iv, tag, data] = token.split(":");
    const d = createDecipheriv("aes-256-gcm", keyOf(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    return ""; // secret đã đổi hoặc dữ liệu hỏng → coi như chưa cấu hình
  }
}
