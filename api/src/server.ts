import Fastify from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fstatic from "@fastify/static";
import { readdir, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { ZodError } from "zod";
import { HttpError } from "./lib/http.js";
import { AUTH_COOKIE } from "./lib/auth.js";
import { PUBLIC_DIR, PRIVATE_DIR } from "./lib/storage.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export async function buildServer() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    bodyLimit: 5 * 1024 * 1024,
    trustProxy: true,
  });

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET phải dài tối thiểu 32 ký tự");

  await app.register(cors, { origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(","), credentials: true });
  await app.register(cookie);
  await app.register(jwt, { secret, cookie: { cookieName: AUTH_COOKIE, signed: false } });
  await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 20 } });
  await app.register(rateLimit, { global: false });

  await mkdir(PUBLIC_DIR, { recursive: true });
  await mkdir(PRIVATE_DIR, { recursive: true });
  // Tệp công khai (ảnh WebP, tài liệu). Video HLS nằm ở PRIVATE_DIR và chỉ phục vụ qua route có token.
  await app.register(fstatic, {
    root: PUBLIC_DIR,
    prefix: "/api/files/",
    maxAge: "30d",
    immutable: true,
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.status).send({ error: err.message, details: err.details });
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "Dữ liệu không hợp lệ", details: err.issues });
    }
    const e = err as { statusCode?: number; message?: string; code?: string };
    if (e.code === "23505") return reply.code(409).send({ error: "Dữ liệu đã tồn tại (trùng khóa)" });
    if (e.code === "23503") return reply.code(409).send({ error: "Dữ liệu đang được tham chiếu ở nơi khác" });
    if (e.statusCode && e.statusCode < 500) return reply.code(e.statusCode).send({ error: e.message });
    req.log.error(err);
    return reply.code(500).send({ error: "Lỗi máy chủ" });
  });

  app.get("/api/health", async () => ({ ok: true, time: new Date().toISOString() }));

  // Tự nạp mọi file trong src/routes (mỗi file export default một plugin Fastify).
  const routesDir = path.join(here, "routes");
  const files = (await readdir(routesDir)).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".d.ts")).sort();
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(routesDir, f)).href);
    if (typeof mod.default === "function") await app.register(mod.default);
  }

  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}
