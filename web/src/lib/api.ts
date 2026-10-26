/**
 * Lớp gọi API dùng chung cho client và admin.
 * Mọi request đi qua `/api/*` (Next rewrite ở dev, nginx ở Docker) và gửi kèm cookie đăng nhập.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { path: string; message: string }[] | unknown,
  ) {
    super(message);
  }
  /** Lỗi theo trường (từ zod ở backend): { email: "Email không hợp lệ" }. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as { path?: string; message?: string }[]).map((d) => [d.path ?? "", d.message ?? ""]),
    );
  }
}

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export function qs(query?: Query) {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Query; signal?: AbortSignal; headers?: HeadersInit } = {},
): Promise<T> {
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const res = await fetch(`/api${path}${qs(opts.query)}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    credentials: "include",
    signal: opts.signal,
    headers: {
      ...(opts.body !== undefined && !isForm ? { "content-type": "application/json" } : {}),
      ...opts.headers,
    },
    body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const d = data as { error?: string; details?: unknown } | undefined;
    throw new ApiError(res.status, d?.error ?? `Lỗi ${res.status}`, d?.details);
  }
  return data as T;
}

function safeJson(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

/** Upload có tiến độ (XMLHttpRequest) — dùng cho media/video. */
export function upload<T = unknown>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api${path}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = xhr.responseText ? safeJson(xhr.responseText) : undefined;
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(xhr.status, (data as { error?: string })?.error ?? `Lỗi ${xhr.status}`, (data as { details?: unknown })?.details));
    };
    xhr.onerror = () => reject(new ApiError(0, "Không kết nối được máy chủ"));
    xhr.send(form);
  });
}

/* ------------------------------------------------------------------ */
/* Định dạng                                                           */
/* ------------------------------------------------------------------ */

export const vnd = (n: number | null | undefined) => `${(n ?? 0).toLocaleString("vi-VN")}đ`;

/** 1.280.000.000 → "1,28 tỷ"; 650.000.000 → "650 triệu". */
export function vndShort(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  if (n >= 1e3) return `${(n / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}k`;
  return n.toLocaleString("vi-VN");
}

export const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("vi-VN");

/** 12500 → "12.5K". */
export const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K` : String(n);

export function fmtDate(d: string | Date | null | undefined, withTime = false) {
  if (!d) return "—";
  const x = new Date(d);
  const date = x.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return withTime ? `${date} ${x.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : date;
}

/** "12 thg 3, 2024" như thẻ bài viết. */
export const fmtDateShort = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return "—";
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return fmtDate(d);
}

export const duration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
