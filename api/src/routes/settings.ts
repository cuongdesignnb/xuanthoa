import { aiConfig, aiEnv, aiError, aiStored, testAiConnection } from "../lib/ai.js";
import { encryptSecret } from "../lib/secret.js";
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
    /** Khoá API (chỉ ghi): để trống = giữ khoá cũ. Được mã hoá trước khi lưu, không bao giờ trả ra ngoài. */
    apiKey: z.string().trim().max(500).optional().default(""),
    clearKey: z.boolean().optional().default(false),
    baseUrl: z
      .string()
      .trim()
      .max(300)
      .refine((v) => !v || /^https:\/\//.test(v) || /^http:\/\/(localhost|127\.0\.0\.1)/.test(v), "Địa chỉ phải bắt đầu bằng https://")
      .optional()
      .default(""),
    model: z.string().trim().max(120).optional().default(""),
    fallbackModel: z.string().trim().max(120).optional().default(""),
    timeoutSec: z.coerce.number().int().min(10, "Tối thiểu 10 giây").max(290, "Tối đa 290 giây").optional().default(120),
    gradingEnabled: z.boolean(),
    generateEnabled: z.boolean().optional().default(true),
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

/** Thông tin chỉ đọc kèm theo (không bao giờ trả giá trị bí mật). */
async function meta(key: Key) {
  if (key === "video") return { ffmpeg: true };
  if (key !== "ai") return {};
  const [c, st] = await Promise.all([aiConfig(), aiStored()]);
  const env = aiEnv();
  return {
    keyConfigured: !!c.key,
    keySource: c.keySource,
    keyLast4: c.keySource === "admin" ? (st.apiKeyLast4 ?? "") : c.keySource === "env" ? env.key.slice(-4) : "",
    effective: { baseUrl: c.base, model: c.model, fallbackModel: c.fallback ?? "" },
    envDefaults: { baseUrl: env.base, model: env.model, hasKey: !!env.key },
  };
}

/** Bỏ trường bí mật trước khi trả về client. */
const publicValue = (v: unknown) => {
  const { apiKeyEnc: _e, apiKey: _k, ...rest } = (v ?? {}) as Record<string, unknown>;
  return rest;
};

export default async function settingsRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("settings.read") };
  const write = { preHandler: requirePerm("settings.write") };

  app.get("/api/admin/settings", read, async () => {
    const rows = await db.select().from(schema.settings);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(SETTING_SCHEMAS) as Key[]) {
      const v = rows.find((r) => r.key === k)?.value ?? {};
      out[k] = { ...publicValue(v), ...(await meta(k)) };
    }
    return out;
  });

  app.get<{ Params: { key: string } }>("/api/admin/settings/:key", read, async (req) => {
    const k = req.params.key;
    if (!isKey(k)) throw notFound("Khóa cài đặt không tồn tại");
    const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, k));
    return { ...publicValue(row?.value), ...(await meta(k)) };
  });

  app.put<{ Params: { key: string } }>("/api/admin/settings/:key", write, async (req) => {
    const k = req.params.key;
    if (!isKey(k)) throw notFound("Khóa cài đặt không tồn tại");
    let value = parse(SETTING_SCHEMAS[k] as z.ZodType, req.body) as Record<string, unknown>;
    if (k === "ai") {
      // Khoá API: mã hoá khi có giá trị mới, giữ khoá cũ khi để trống, xoá khi clearKey.
      const prev = await aiStored();
      const { apiKey, clearKey, ...rest } = value as { apiKey: string; clearKey: boolean } & Record<string, unknown>;
      value = {
        ...rest,
        ...(clearKey
          ? {}
          : apiKey
            ? { apiKeyEnc: encryptSecret(apiKey), apiKeyLast4: apiKey.slice(-4) }
            : prev.apiKeyEnc
              ? { apiKeyEnc: prev.apiKeyEnc, apiKeyLast4: prev.apiKeyLast4 }
              : {}),
      };
    }
    await db
      .insert(schema.settings)
      .values({ key: k, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
    await logActivity(req, "update", "setting", k, `Cập nhật cài đặt “${k}”`);
    return { ...publicValue(value), ...(await meta(k)) };
  });

  /** Kiểm tra kết nối AI với giá trị đang nhập (chưa lưu) hoặc đã lưu. */
  app.post("/api/admin/settings/ai/test", { ...write, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
    const b = parse(
      z.object({
        apiKey: z.string().trim().max(500).optional(),
        baseUrl: z.string().trim().max(300).optional(),
        model: z.string().trim().max(120).optional(),
        fallbackModel: z.string().trim().max(120).optional(),
      }),
      req.body ?? {},
    );
    try {
      return await testAiConnection(b);
    } catch (e) {
      throw aiError(e);
    }
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
