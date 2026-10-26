// Vercel Function: chạy toàn bộ Fastify (đã build ra dist/) trong một hàm serverless.
import { buildServer } from "../dist/server.js";

let ready;

export default async function handler(req, res) {
  ready ??= buildServer().then(async (app) => {
    await app.ready();
    return app;
  });
  const app = await ready;
  app.server.emit("request", req, res);
}
