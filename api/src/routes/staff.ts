import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { HttpError, allOf, countAll, forbidden, listQuery, notFound, orderOf, pageOf, parse, searchWhere } from "../lib/http.js";
import { ALL_PERMISSIONS, PERMISSIONS, hashPassword, logActivity, requirePerm, requireUser } from "../lib/auth.js";

const { users, roles } = schema;
const STAFF_ROLES = ["admin", "staff", "teacher"] as const;

const staffBody = z.object({
  name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự"),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  phone: z.string().trim().optional().nullable(),
  role: z.enum(STAFF_ROLES),
  roleId: z.string().optional().nullable(),
  status: z.enum(["active", "blocked", "pending"]).default("active"),
  avatarUrl: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});
const staffUpdate = staffBody.partial().extend({ password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").optional().or(z.literal("")) });

const roleBody = z.object({
  name: z.string().trim().min(2, "Tên nhóm tối thiểu 2 ký tự"),
  description: z.string().trim().optional().nullable(),
  permissions: z.array(z.string()).refine((a) => a.every((p) => ALL_PERMISSIONS.includes(p)), "Có quyền không hợp lệ"),
});

const fieldErr = (path: string, message: string) => new HttpError(400, "Dữ liệu không hợp lệ", [{ path, message }]);

async function activeAdminCount(excludeId?: string) {
  const [{ n }] = await db
    .select({ n: countAll })
    .from(users)
    .where(allOf(eq(users.role, "admin"), eq(users.status, "active"), excludeId ? ne(users.id, excludeId) : undefined));
  return n;
}

export default async function staffRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("staff.read") };
  const write = { preHandler: requirePerm("staff.write") };

  /* ----------------------------- Nhân sự ----------------------------- */

  app.get("/api/admin/staff", read, async (req) => {
    const q = parse(
      listQuery.extend({ role: z.enum(STAFF_ROLES).optional().or(z.literal("")), roleId: z.string().optional(), status: z.string().optional() }),
      req.query,
    );
    const where = allOf(
      inArray(users.role, [...STAFF_ROLES]),
      searchWhere(q.q, [users.name, users.email, users.phone]),
      q.role ? eq(users.role, q.role) : undefined,
      q.roleId ? eq(users.roleId, q.roleId) : undefined,
      q.status ? eq(users.status, q.status as "active") : undefined,
    );
    const { limit, offset } = pageOf(q);
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatarUrl: users.avatarUrl,
          role: users.role,
          roleId: users.roleId,
          roleName: roles.name,
          status: users.status,
          lastActiveAt: users.lastActiveAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(roles, eq(roles.id, users.roleId))
        .where(where)
        .orderBy(orderOf(q, { name: users.name, role: users.role, createdAt: users.createdAt, lastActiveAt: users.lastActiveAt }, users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: countAll }).from(users).where(where),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  app.post("/api/admin/staff", write, async (req, reply) => {
    const b = parse(staffBody, req.body);
    const email = b.email.toLowerCase();
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists) throw fieldErr("email", "Email đã được sử dụng");
    const { password, ...rest } = b;
    const [u] = await db
      .insert(users)
      .values({ ...rest, email, passwordHash: await hashPassword(password) })
      .returning({ id: users.id, name: users.name });
    await logActivity(req, "create", "staff", u.id, `Thêm nhân sự ${u.name}`);
    return reply.code(201).send(u);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/staff/:id", write, async (req) => {
    const me = await requireUser(req);
    const b = parse(staffUpdate, req.body);
    const [cur] = await db.select().from(users).where(and(eq(users.id, req.params.id), inArray(users.role, [...STAFF_ROLES]))).limit(1);
    if (!cur) throw notFound("Không tìm thấy nhân sự");

    const roleChanged = (b.role && b.role !== cur.role) || (b.roleId !== undefined && b.roleId !== cur.roleId);
    const statusChanged = b.status && b.status !== cur.status;
    if (cur.id === me.id && (roleChanged || statusChanged)) throw forbidden("Bạn không thể tự thay đổi vai trò, nhóm quyền hoặc trạng thái của chính mình");
    if (cur.role === "admin" && cur.status === "active" && ((b.role && b.role !== "admin") || (b.status && b.status !== "active"))) {
      if ((await activeAdminCount(cur.id)) === 0) throw forbidden("Không thể gỡ quản trị viên cuối cùng của hệ thống");
    }

    const { password, email, ...rest } = b;
    const data: Partial<typeof users.$inferInsert> = { ...rest };
    if (email && email.toLowerCase() !== cur.email) {
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      if (exists) throw fieldErr("email", "Email đã được sử dụng");
      data.email = email.toLowerCase();
    }
    if (password) data.passwordHash = await hashPassword(password);
    const [u] = await db.update(users).set(data).where(eq(users.id, cur.id)).returning({ id: users.id, name: users.name, status: users.status });
    await logActivity(req, statusChanged ? (b.status === "active" ? "activate" : "deactivate") : "update", "staff", u.id, `${statusChanged ? (b.status === "active" ? "Kích hoạt" : "Vô hiệu hoá") : "Cập nhật"} nhân sự ${u.name}`);
    return u;
  });

  /** Vô hiệu hoá tài khoản nhân sự (không xoá dữ liệu). */
  app.delete<{ Params: { id: string } }>("/api/admin/staff/:id", write, async (req, reply) => {
    const me = await requireUser(req);
    if (req.params.id === me.id) throw forbidden("Bạn không thể vô hiệu hoá chính mình");
    const [cur] = await db.select().from(users).where(and(eq(users.id, req.params.id), inArray(users.role, [...STAFF_ROLES]))).limit(1);
    if (!cur) throw notFound("Không tìm thấy nhân sự");
    if (cur.role === "admin" && (await activeAdminCount(cur.id)) === 0) throw forbidden("Không thể gỡ quản trị viên cuối cùng của hệ thống");
    await db.update(users).set({ status: "blocked" }).where(eq(users.id, cur.id));
    await logActivity(req, "deactivate", "staff", cur.id, `Vô hiệu hoá nhân sự ${cur.name}`);
    return reply.code(204).send();
  });

  /* ---------------------------- Nhóm quyền --------------------------- */

  app.get("/api/admin/roles", read, async () => {
    const items = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        permissions: roles.permissions,
        createdAt: roles.createdAt,
        userCount: sql<number>`(select count(*)::int from users u where u.role_id = ${roles.id})`,
      })
      .from(roles)
      .orderBy(roles.createdAt);
    return { items, modules: PERMISSIONS, all: ALL_PERMISSIONS };
  });

  app.post("/api/admin/roles", write, async (req, reply) => {
    const b = parse(roleBody, req.body);
    const [dup] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, b.name)).limit(1);
    if (dup) throw fieldErr("name", "Tên nhóm đã tồn tại");
    const [r] = await db.insert(roles).values(b).returning();
    await logActivity(req, "create", "role", r.id, `Tạo nhóm quyền ${r.name}`);
    return reply.code(201).send(r);
  });

  app.patch<{ Params: { id: string } }>("/api/admin/roles/:id", write, async (req) => {
    const me = await requireUser(req);
    const b = parse(roleBody.partial(), req.body);
    const [cur] = await db.select().from(roles).where(eq(roles.id, req.params.id)).limit(1);
    if (!cur) throw notFound("Không tìm thấy nhóm quyền");
    if (me.role !== "admin") {
      const [mine] = await db.select({ roleId: users.roleId }).from(users).where(eq(users.id, me.id));
      if (mine?.roleId === cur.id) throw forbidden("Bạn không thể tự sửa nhóm quyền của chính mình");
    }
    if (b.name && b.name !== cur.name) {
      const [dup] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, b.name)).limit(1);
      if (dup) throw fieldErr("name", "Tên nhóm đã tồn tại");
    }
    const [r] = await db.update(roles).set(b).where(eq(roles.id, cur.id)).returning();
    await logActivity(req, "update", "role", r.id, `Cập nhật nhóm quyền ${r.name}`, b.permissions ? { permissions: b.permissions } : undefined);
    return r;
  });

  app.delete<{ Params: { id: string } }>("/api/admin/roles/:id", write, async (req, reply) => {
    const [cur] = await db.select().from(roles).where(eq(roles.id, req.params.id)).limit(1);
    if (!cur) throw notFound("Không tìm thấy nhóm quyền");
    const [{ n }] = await db.select({ n: countAll }).from(users).where(eq(users.roleId, cur.id));
    if (n > 0) throw new HttpError(409, `Nhóm đang được gán cho ${n} nhân sự — hãy chuyển họ sang nhóm khác trước`);
    await db.delete(roles).where(eq(roles.id, cur.id));
    await logActivity(req, "delete", "role", cur.id, `Xoá nhóm quyền ${cur.name}`);
    return reply.code(204).send();
  });
}
