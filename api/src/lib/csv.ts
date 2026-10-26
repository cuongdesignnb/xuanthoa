import type { FastifyReply } from "fastify";

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Tạo CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). */
export function toCsv(headers: { key: string; label: string }[], rows: Record<string, unknown>[]) {
  const lines = [headers.map((h) => cell(h.label)).join(",")];
  for (const r of rows) lines.push(headers.map((h) => cell(r[h.key])).join(","));
  return "﻿" + lines.join("\r\n");
}

export function sendCsv(reply: FastifyReply, filename: string, csv: string) {
  return reply
    .header("content-type", "text/csv; charset=utf-8")
    .header("content-disposition", `attachment; filename="${filename}"`)
    .send(csv);
}
