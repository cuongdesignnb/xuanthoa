import path from "node:path";

const root = path.resolve(process.env.UPLOAD_DIR ?? "./storage");

/** Tệp công khai, phục vụ tại /api/files/<đường dẫn tương đối>. */
export const PUBLIC_DIR = path.join(root, "public");
/** Tệp riêng tư (video HLS, khoá mã hoá) — không bao giờ phục vụ tĩnh. */
export const PRIVATE_DIR = path.join(root, "private");

export const publicUrl = (rel: string) => `/api/files/${rel.split(path.sep).join("/")}`;
