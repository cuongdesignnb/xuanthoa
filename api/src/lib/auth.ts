import type { FastifyInstance, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { HttpError, forbidden, clientIp } from "./http.js";

export const AUTH_COOKIE = "nh_token";

export type Role = "admin" | "staff" | "teacher" | "student";

export type AuthUser = {
  id: string;
  role: Role;
  name: string;
  email: string;
  permissions: string[];
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: Role };
    user: { sub: string; role: Role };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

/**
 * Danh sách quyền dùng trong phân quyền nhân sự. Admin luôn có toàn quyền.
 * Khóa dạng "<module>.read" / "<module>.write".
 */
export const PERMISSIONS = {
  dashboard: "Tổng quan",
  students: "Học viên",
  teachers: "Giáo viên",
  courses: "Khóa học & bài học",
  quizzes: "Bài tập & đề thi",
  posts: "Blog & tài nguyên",
  media: "Media Library & video",
  orders: "Đơn hàng & doanh thu",
  plans: "Gói học",
  coupons: "Mã giảm giá",
  notifications: "Thông báo",
  moderation: "Đánh giá & báo lỗi",
  staff: "Phân quyền nhân sự",
  reports: "Báo cáo",
  settings: "Cài đặt hệ thống",
  support: "Trung tâm hỗ trợ",
  logs: "Log hoạt động",
} as const;
export type PermissionModule = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS).flatMap((m) => [`${m}.read`, `${m}.write`]);

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

async function loadUser(id: string): Promise<AuthUser | null> {
  const row = await db
    .select({
      id: schema.users.id,
      role: schema.users.role,
      name: schema.users.name,
      email: schema.users.email,
      status: schema.users.status,
      permissions: schema.roles.permissions,
    })
    .from(schema.users)
    .leftJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.users.id, id))
    .limit(1);
  const u = row[0];
  if (!u || u.status === "blocked") return null;
  return { id: u.id, role: u.role, name: u.name, email: u.email, permissions: u.permissions ?? [] };
}

/** Đọc JWT từ cookie (hoặc header Bearer). Không ném lỗi nếu chưa đăng nhập. */
export async function optionalUser(req: FastifyRequest): Promise<AuthUser | null> {
  if (req.authUser) return req.authUser;
  try {
    await req.jwtVerify();
  } catch {
    return null;
  }
  const u = await loadUser(req.user.sub);
  if (u) req.authUser = u;
  return u;
}

export async function requireUser(req: FastifyRequest): Promise<AuthUser> {
  const u = await optionalUser(req);
  if (!u) throw new HttpError(401, "Vui lòng đăng nhập");
  return u;
}

export const can = (u: AuthUser, perm: string) =>
  u.role === "admin" || u.permissions.includes(perm) || (perm.endsWith(".read") && u.permissions.includes(perm.replace(".read", ".write")));

/** preHandler: yêu cầu nhân sự (admin/staff/teacher) có quyền `perm`. */
export function requirePerm(perm: string) {
  return async (req: FastifyRequest) => {
    const u = await requireUser(req);
    if (u.role === "student") throw forbidden();
    if (!can(u, perm)) throw forbidden();
  };
}

export const authed = async (req: FastifyRequest) => {
  await requireUser(req);
};

export function setAuthCookie(app: FastifyInstance, reply: import("fastify").FastifyReply, user: { id: string; role: Role }) {
  const token = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "7d" });
  reply.setCookie(AUTH_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}

/** Ghi nhật ký hoạt động (không chặn request nếu lỗi). */
export async function logActivity(
  req: FastifyRequest,
  action: string,
  entity: string,
  entityId?: string | null,
  summary?: string,
  meta?: Record<string, unknown>,
) {
  try {
    const u = req.authUser;
    await db.insert(schema.activityLogs).values({
      userId: u?.id,
      userName: u?.name,
      action,
      entity,
      entityId: entityId ?? null,
      summary,
      meta,
      ip: clientIp(req),
    });
  } catch (e) {
    req.log.warn({ err: e }, "activity log failed");
  }
}
