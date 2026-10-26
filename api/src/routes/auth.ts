import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { HttpError, parse } from "../lib/http.js";
import {
  AUTH_COOKIE,
  ALL_PERMISSIONS,
  PERMISSIONS,
  hashPassword,
  logActivity,
  optionalUser,
  requireUser,
  setAuthCookie,
  verifyPassword,
} from "../lib/auth.js";

const loginBody = z.object({ email: z.string().email("Email không hợp lệ"), password: z.string().min(1, "Nhập mật khẩu") });
const registerBody = z.object({
  name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  level: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
});

export default async function authRoutes(app: FastifyInstance) {
  const limit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

  app.post("/api/auth/login", limit, async (req, reply) => {
    const body = parse(loginBody, req.body);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, body.email.toLowerCase())).limit(1);
    if (!u || !(await verifyPassword(body.password, u.passwordHash))) throw new HttpError(401, "Email hoặc mật khẩu không đúng");
    if (u.status === "blocked") throw new HttpError(403, "Tài khoản đã bị khoá");
    setAuthCookie(app, reply, u);
    await db.update(schema.users).set({ lastActiveAt: new Date() }).where(eq(schema.users.id, u.id));
    req.authUser = { id: u.id, role: u.role, name: u.name, email: u.email, permissions: [] };
    if (u.role !== "student") await logActivity(req, "login", "auth", u.id, "Đăng nhập");
    return { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl };
  });

  app.post("/api/auth/register", limit, async (req, reply) => {
    const body = parse(registerBody, req.body);
    const email = body.email.toLowerCase();
    const exists = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (exists.length) throw new HttpError(409, "Email đã được đăng ký");
    const [u] = await db
      .insert(schema.users)
      .values({ name: body.name, email, passwordHash: await hashPassword(body.password), level: body.level ?? "N5" })
      .returning();
    setAuthCookie(app, reply, u);
    return reply.code(201).send({ id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl });
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie(AUTH_COOKIE, { path: "/" });
    return { ok: true };
  });

  /** Người dùng hiện tại (null nếu chưa đăng nhập). */
  app.get("/api/auth/me", async (req) => {
    const au = await optionalUser(req);
    if (!au) return { user: null };
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, au.id)).limit(1);
    const { passwordHash: _ph, ...safe } = u;
    return {
      user: { ...safe, permissions: au.role === "admin" ? ALL_PERMISSIONS : au.permissions },
    };
  });

  app.post("/api/auth/change-password", async (req) => {
    const au = await requireUser(req);
    const body = parse(z.object({ current: z.string(), next: z.string().min(6) }), req.body);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, au.id)).limit(1);
    if (!(await verifyPassword(body.current, u.passwordHash))) throw new HttpError(400, "Mật khẩu hiện tại không đúng");
    await db.update(schema.users).set({ passwordHash: await hashPassword(body.next) }).where(eq(schema.users.id, au.id));
    return { ok: true };
  });

  /** Danh mục quyền cho màn Phân quyền nhân sự. */
  app.get("/api/auth/permissions", async () => ({ modules: PERMISSIONS, all: ALL_PERMISSIONS }));
}
