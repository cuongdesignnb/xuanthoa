import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { notFound, parse } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";

const url = z.string().trim().max(500).optional().default("");

/** Hình dạng hợp lệ của từng khóa cài đặt. */
export const SETTING_SCHEMAS = {
  site: z.object({
    name: z.string().trim().min(1, "Nhập tên website"),
    tagline: z.string().trim().optional().default(""),
    hotline: z.string().trim().optional().default(""),
    email: z.string().trim().email("Email không hợp lệ").or(z.literal("")).default(""),
    adminEmail: z.string().trim().email("Email không hợp lệ").or(z.literal("")).default(""),
    address: z.string().trim().optional().default(""),
    logoUrl: z.string().trim().optional().nullable(),
    faviconUrl: z.string().trim().optional().nullable(),
    version: z.string().trim().optional().default(""),
    maintenance: z.boolean().optional().default(false),
  }),
  social: z.object({ facebook: url, youtube: url, tiktok: url, instagram: url, zalo: url }),
  payment: z.object({
    vnpay: z.boolean(),
    momo: z.boolean(),
    bank: z.boolean(),
    currency: z.string().default("VND"),
    bankName: z.string().trim().optional().default(""),
    bankAccount: z.string().trim().optional().default(""),
    bankHolder: z.string().trim().optional().default(""),
  }),
  ai: z.object({
    model: z.string().trim().min(1, "Nhập tên model"),
    gradingEnabled: z.boolean(),
    generateEnabled: z.boolean().optional().default(true),
    maxTokens: z.coerce.number().int().min(256).max(64000).optional().default(4096),
  }),
  video: z.object({
    allowDownload: z.boolean(),
    watermark: z.boolean(),
    tokenTtlSec: z.coerce.number().int().min(60, "Tối thiểu 60 giây").max(86400, "Tối đa 24 giờ"),
  }),
  media: z.object({
    webpQuality: z.coerce.number().int().min(30, "Từ 30").max(100, "Đến 100"),
    maxWidth: z.coerce.number().int().min(320, "Tối thiểu 320px").max(8000, "Tối đa 8000px"),
    deleteOriginal: z.boolean(),
  }),
} as const;
type Key = keyof typeof SETTING_SCHEMAS;
const isKey = (k: string): k is Key => k in SETTING_SCHEMAS;

/** Thông tin chỉ đọc (không bao giờ trả giá trị bí mật). */
const meta = (key: Key) =>
  key === "ai" ? { keyConfigured: !!process.env.ANTHROPIC_API_KEY } : key === "video" ? { ffmpeg: true } : {};

export default async function settingsRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("settings.read") };
  const write = { preHandler: requirePerm("settings.write") };

  app.get("/api/admin/settings", read, async () => {
    const rows = await db.select().from(schema.settings);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(SETTING_SCHEMAS) as Key[]) {
      const v = rows.find((r) => r.key === k)?.value ?? {};
      out[k] = { ...(v as object), ...meta(k) };
    }
    return out;
  });

  app.get<{ Params: { key: string } }>("/api/admin/settings/:key", read, async (req) => {
    const k = req.params.key;
    if (!isKey(k)) throw notFound("Khóa cài đặt không tồn tại");
    const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, k));
    return { ...((row?.value ?? {}) as object), ...meta(k) };
  });

  app.put<{ Params: { key: string } }>("/api/admin/settings/:key", write, async (req) => {
    const k = req.params.key;
    if (!isKey(k)) throw notFound("Khóa cài đặt không tồn tại");
    const value = parse(SETTING_SCHEMAS[k] as z.ZodType, req.body);
    await db
      .insert(schema.settings)
      .values({ key: k, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
    await logActivity(req, "update", "setting", k, `Cập nhật cài đặt “${k}”`);
    return { ...(value as object), ...meta(k) };
  });

  /* ------------------------ Trạng thái dịch vụ ------------------------ */

  app.get("/api/admin/services", read, async () => ({ items: await db.select().from(schema.services).orderBy(asc(schema.services.key)) }));

  app.patch<{ Params: { key: string } }>("/api/admin/services/:key", write, async (req) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(2).optional(),
        status: z.enum(["ok", "degraded", "down", "maintenance"]).optional(),
        uptime: z.coerce.number().min(0).max(100).optional(),
      }),
      req.body,
    );
    const [s] = await db
      .update(schema.services)
      .set({ ...b, checkedAt: new Date() })
      .where(eq(schema.services.key, req.params.key))
      .returning();
    if (!s) throw notFound("Không tìm thấy dịch vụ");
    await logActivity(req, "update", "service", s.key, `Cập nhật dịch vụ ${s.name}: ${s.status}`);
    return s;
  });
}
