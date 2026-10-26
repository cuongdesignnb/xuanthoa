# Nihongo+ — nền tảng học tiếng Nhật online

Monorepo gồm:

| Thư mục | Nội dung |
|---|---|
| `web/` | Next.js 16 (App Router, Tailwind v4, motion) — site học viên + khu quản trị `/admin` |
| `api/` | Fastify 5 + Drizzle ORM + PostgreSQL — REST API, upload, video HLS, AI |
| `deploy/nginx.conf` | Cổng vào: `/api/*` → API, còn lại → web |
| `docker-compose.yml` | postgres + api + web + nginx |

## Chạy bằng Docker (một lệnh)

```bash
cp .env.example .env        # đặt JWT_SECRET (>= 32 ký tự), tuỳ chọn ANTHROPIC_API_KEY
docker compose up -d --build
```

Mở <http://localhost:8080> (đổi cổng bằng `HTTP_PORT`). Lần đầu container `api` tự chạy migration và seed dữ liệu mẫu khi DB trống (`SEED_ON_EMPTY=true`).

Tài khoản demo:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin@nihongo.vn` | `Admin@123` |
| Biên tập nội dung | `editor@nihongo.vn` | `Editor@123` |
| Chăm sóc học viên | `support@nihongo.vn` | `Support@123` |
| Kế toán | `ketoan@nihongo.vn` | `Ketoan@123` |
| Học viên | `minhanh@nihongo.vn` | `Hocvien@123` |

Seed lại toàn bộ dữ liệu mẫu (xoá sạch DB):

```bash
docker compose exec api node dist/db/seed/index.js
```

## Bản online: Vercel + Supabase

| Thành phần | Địa chỉ / cấu hình |
|---|---|
| Web (Next.js) | <https://web-jade-six-27.vercel.app> — Vercel project `web`, env `API_URL=https://xuanthoa-api.vercel.app` (proxy `/api/*`) |
| API (Fastify) | <https://xuanthoa-api.vercel.app> — Vercel project `xuanthoa-api` (thư mục `api/`, function `api/index.js`, region `hnd1`) |
| Database | Supabase Postgres (project `wyxvjhxahgejirmkmgov`, Tokyo), role riêng `nihongo_app` qua transaction pooler `:6543` (migrate/seed dùng `:5432`); RLS bật trên mọi bảng, `anon`/`authenticated` không có quyền |
| Tệp | Supabase Storage bucket công khai `media` (ảnh WebP, avatar, tài liệu) |

Biến môi trường của project `xuanthoa-api`: `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `COOKIE_SECURE=true` (tuỳ chọn `ANTHROPIC_API_KEY`). Bản sao cục bộ nằm ở `.env.supabase` (không commit).

Deploy lại:

```bash
cd api && vercel --prod --yes
cd web && vercel --prod --yes
```

Giới hạn trên Vercel: request tối đa ~4,5 MB (ảnh/tài liệu lớn hơn không upload được), **không upload video** (cần ffmpeg chạy nền) — bài học dùng YouTube; muốn dùng video HLS chống tải thì chạy bản Docker. Seed lên DB cloud không bao giờ tự xoá dữ liệu cũ trừ khi đặt `SEED_FORCE=true`.

## Phát triển trên máy

```bash
docker compose up -d db                 # Postgres ở localhost:5433
cd api && npm i && npm run db:migrate && npm run db:seed && npm run dev   # :4000
cd web && npm i && npm run dev          # :3000 — proxy /api → :4000
```

Đổi schema: sửa `api/src/db/schema.ts` → `npx drizzle-kit generate --name <tên>` → `npm run db:migrate`.

## Tính năng chính

- **Không hardcode client**: mọi nội dung site (khóa học, bài học, bài tập, đề JLPT, blog, giáo viên, đánh giá, gói học, dashboard học viên…) đọc từ API/PostgreSQL.
- **Khu quản trị** đủ màn hình theo menu: Tổng quan, Học viên (+ lượt làm bài), Giáo viên, Khóa học, Bài học, Bài tập, JLPT & Đề thi (+ tạo đề AI), Blog & Tài nguyên, Đơn hàng, Gói học, Doanh thu, Mã giảm giá, Thông báo, Đánh giá & Báo lỗi, Phân quyền nhân sự (ma trận quyền), Báo cáo, Cài đặt, Media Library, Video, Trung tâm hỗ trợ, Log hoạt động. Phân quyền theo module `*.read / *.write`.
- **Trình soạn thảo** (TipTap) gắn vào mọi ô nội dung HTML: tiếng Nhật (IME), furigana `<ruby>`, chuyển romaji → kana, font Nhật, ảnh từ Media Library, YouTube, bảng.
- **AI (Claude)**: tạo đề trắc nghiệm/tự luận theo cấp độ, kỹ năng, chủ đề (xem trước, sửa, lưu) và chấm điểm câu tự luận/ngắn kèm nhận xét. Không có `ANTHROPIC_API_KEY` thì các route AI báo 503 và việc chấm dùng bộ so khớp dự phòng.
- **Video chống tải**: upload → ffmpeg chuyển HLS mã hoá AES-128, khoá & segment chỉ cấp qua token ngắn hạn theo quyền xem bài; player có watermark email, chặn chuột phải/tải. Hoặc nguồn YouTube (youtube-nocookie, điều khiển tuỳ biến).
- **Media Library**: upload ảnh tự chuyển sang WebP (chất lượng/kích thước theo cài đặt) và **xoá bản gốc**.
