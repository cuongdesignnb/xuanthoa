# Nihongo+ — quy ước chung cho các agent

Monorepo `D:\xuanthoa`:
- `api/` — Fastify 5 + Drizzle ORM + PostgreSQL (TypeScript ESM, import nội bộ có đuôi `.js`).
- `web/` — Next.js 16 (App Router, Tailwind v4, `motion/react`, `lucide-react`). Client site + khu admin `/admin`.
- `refs/` — ảnh tham chiếu giao diện client (`1-blog.webp` … `8-giao-vien.webp`, `0-home.png`) và admin (`9-admin.webp`).
- Postgres chạy trong Docker ở `localhost:5433` (user/pass/db `nihongo`). API dev ở `http://localhost:4000` (tsx watch, tự nạp file route mới). Web dev ở `http://localhost:3123`, proxy `/api/*` → API.
- **Không** khởi động/tắt server, **không** `npm run build`, **không** `npm install` (thư viện đã cài sẵn — xem package.json), **không** git commit, **không** dùng browser tools (pane dùng chung; agent cha sẽ QA trên trình duyệt). Nếu thực sự thiếu thư viện, ghi vào báo cáo.
- Tài khoản seed: admin `admin@nihongo.vn` / `Admin@123`; học viên `minhanh@nihongo.vn` / `Hocvien@123`; biên tập `editor@nihongo.vn` / `Editor@123`. Test API bằng curl: `curl -c /tmp/x.txt -H 'content-type: application/json' -d '{"email":"admin@nihongo.vn","password":"Admin@123"}' localhost:4000/api/auth/login` rồi `curl -b /tmp/x.txt …`.

## Backend (api/)

- **Schema**: `api/src/db/schema.ts` là hợp đồng chung — đọc kỹ. Nếu bạn cần thêm cột/bảng: chỉ THÊM (không đổi/xoá cột người khác dùng), ghi rõ trong báo cáo; sau đó chạy `cd api && npx drizzle-kit generate --name <tên-ngắn>` rồi `npm run db:migrate`. Nếu `drizzle-kit generate` đụng migration của agent khác chạy cùng lúc, chạy lại.
- **Route**: mỗi file trong `api/src/routes/*.ts` `export default async function (app: FastifyInstance)`; server tự nạp. Chỉ tạo file route của phần mình (đặt tên theo mảng, vd `courses.ts`, `courses-admin.ts`).
- **Quy ước đường dẫn**:
  - `/api/public/...` — không cần đăng nhập (client site).
  - `/api/me/...` — học viên đã đăng nhập (`await requireUser(req)`), hoặc `optionalUser(req)` cho dữ liệu cá nhân hoá tuỳ chọn.
  - `/api/admin/...` — nhân sự; dùng `{ preHandler: requirePerm("<module>.read" | "<module>.write") }`. Danh sách module trong `PERMISSIONS` ở `api/src/lib/auth.ts`.
- **Helpers** (`api/src/lib/`): `http.ts` (`parse(zodSchema, data)` → 400 kèm lỗi theo trường, `listQuery`, `pageOf`, `searchWhere`, `orderOf`, `allOf`, `countAll`, `slugify`, `HttpError`, `notFound`), `crud.ts` (`crudRoutes(app, {...})` sinh nhanh list/get/create/update/delete có phân trang + tìm kiếm + lọc + ghi log), `auth.ts` (`requireUser`, `optionalUser`, `requirePerm`, `can`, `logActivity(req, action, entity, id, summary)`), `storage.ts` (`PUBLIC_DIR`, `PRIVATE_DIR`, `publicUrl`).
- Danh sách trả về dạng `{ items, total, page, pageSize }` (query `page`, `pageSize`, `q`, `sort`, `order`, + bộ lọc).
- Mọi thao tác ghi ở admin gọi `logActivity` (crudRoutes đã tự làm).
- **Seed**: `api/src/db/seed/NN-ten.ts` (`export default async function (ctx: SeedCtx)`), chạy theo thứ tự tên bằng `cd api && npm run db:seed` (XOÁ SẠCH DB rồi seed lại — chạy được, nhưng các agent khác cũng seed nên dữ liệu có thể đang thay đổi). `00-core.ts` đã seed: roles, nhân sự, ~160 học viên (trải 12 tháng), 13 giáo viên (slug: sato, minh, mai, tanaka, ha, hoang-anh, yamamoto, quan, linh, suzuki, thao, duc, nakamura), achievements, services, settings. Dùng `ctx.ids.teacher("mai")`, `ctx.ids.user(email)`, `ctx.ids.course(slug)`, `ctx.ids.quiz(slug)`, `ctx.ids.lesson(slug)`, `ctx.int/pick/rand/daysAgo` (PRNG cố định).
- Thứ tự seed đã chia: `10-courses.ts` (khóa học, module, bài học, từ vựng, tài liệu, video YouTube mẫu), `20-quizzes.ts` (bài tập, đề JLPT, câu hỏi, lượt làm), `30-content.ts` (blog, tài liệu miễn phí, đánh giá/testimonial, báo lỗi, bình luận), `40-commerce.ts` (gói học, mã giảm giá, đơn hàng 12 tháng, ghi danh), `50-ops.ts` (thông báo, ticket, task, log, phiên học/kế hoạch/thành tích của học viên).
- Typecheck: `cd api && npx tsc --noEmit` phải sạch.

## Frontend (web/)

- **Gọi API**: `web/src/lib/api.ts` (`api(path, {method, body, query})` — path KHÔNG có tiền tố `/api`, vd `api("/public/courses")`; `upload(path, formData, onProgress)`; `ApiError.fieldErrors`; định dạng `vnd`, `vndShort`, `num`, `compact`, `fmtDate`, `fmtDateShort`, `timeAgo`, `duration`).
  `web/src/lib/hooks.ts`: `useApi<T>(path | null)` → `{data, loading, error, reload, mutate}` (cache dùng chung), `invalidate(prefix)`, `useTable<T>(basePath)` (phân trang/tìm kiếm/lọc/sắp xếp cho admin), `useMutation`, `useDebounced`.
  `web/src/lib/auth.tsx`: `useAuth()` → `{ user, loading, isStaff, can(perm), login, register, logout, refresh }`.
- **KHÔNG HARDCODE DỮ LIỆU** ở client: mọi nội dung (khóa học, giáo viên, bài viết, giá, đánh giá, số liệu…) phải đến từ API/DB. Các file `web/src/components/*/data.ts` hiện có là dữ liệu tạm — chuyển nội dung vào seed của bạn rồi xoá phần dữ liệu khỏi client (chỉ giữ type/hằng số giao diện thuần như tên tab, màu theo cấp độ). Có trạng thái loading (skeleton) và trống/lỗi.
- **Client site**: giữ nguyên thiết kế đã có (đã khớp ảnh tham chiếu), chỉ thay nguồn dữ liệu. Trang cần đăng nhập dùng `<PageShell user>` (tự chuyển `/dang-nhap?next=`). Header đã đọc `useAuth()`.
  Route động (vd `/khoa-hoc/[slug]`): `cacheComponents` đang bật — `page.tsx` (server) nhận `params` (Promise) và render `<Suspense fallback=…><Inner params={params} /></Suspense>`, trong đó `async function Inner({ params }) { const { slug } = await params; return <ClientComp slug={slug} /> }`. Không gọi Math.random()/Date.now() khi render. `useSearchParams()` phải nằm trong `<Suspense>`.
  Avatar người: `avatar(seed, bg)` ở `web/src/components/ui.tsx` (DiceBear; tên nữ tự ra tóc nữ). Giáo viên có `avatarUrl` (ưu tiên) hoặc `avatarSeed`/`avatarBg`.
- **Admin**: trang đặt trong `web/src/app/admin/(panel)/<route>/page.tsx` (layout đã có sidebar/topbar/guard). Component đặt trong `web/src/components/admin/<mảng>/`.
  Bộ UI dùng chung — BẮT BUỘC dùng, không tự viết lại:
  - `@/components/admin/ui`: `Button, IconButton, Input, Textarea, Select, Switch, Checkbox, Field, TagInput, Badge, StatusBadge, STATUS, Level, Card, Panel, Tabs, Modal, Drawer, useConfirm, toast, Spinner, Skeleton, EmptyState, ErrorState, Avatar, Dropdown, ImageInput, cx`.
  - `@/components/admin/table`: `DataTable, TableCard, TableToolbar, Pagination, BulkBar, type Column`.
  - `@/components/admin/charts`: `BarChart, Donut, Sparkline, ProgressBar, Ring, DONUT_COLORS`.
  - `@/components/admin/page`: `PageHeader, StatCard, AdminHero, useForm`.
  - `@/components/admin/editor/RichTextEditor` (props `value, onChange, placeholder, minHeight, toolbar: "full" | "basic"`) — gắn vào mọi ô nội dung HTML (mô tả khóa học, nội dung bài học, ngữ pháp, blog, câu hỏi, thông báo…).
  - `@/components/admin/media/MediaPicker` (qua `ImageInput`), `@/components/admin/media/VideoPicker` (props `value: {videoId, youtubeUrl}, onChange`), `@/components/video/VideoPlayer` (props `lessonId, videoId, youtube, poster, onProgress, onEnded, seekTo, className`).
  - Mẫu trang danh sách: `PageHeader` + `TableCard` (`useTable("/admin/x")`) + `Drawer`/`Modal` form với `useForm` + `toast` + `useConfirm` cho xoá + `invalidate("/admin/x")` sau khi ghi.
  - Menu và đường dẫn admin: `web/src/components/admin/nav.ts` (đừng đổi file này; nếu cần thêm mục, ghi vào báo cáo).
  - Admin phải responsive (sidebar thành drawer trên mobile — đã có), bảng cuộn ngang trên mobile.
- Ngôn ngữ giao diện: tiếng Việt. Japanese dùng class `font-jp`.
- Kiểm tra: `cd web && npx tsc --noEmit` và `npx eslint <thư mục của bạn>` phải sạch. Kiểm tra trang trả 200: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3123/<route>`; kiểm tra API bằng curl với cookie.
- Chỉ sửa file trong phạm vi được giao. File dùng chung (`schema.ts`, `lib/*`, `components/admin/ui|table|charts|page|Shell|nav`, `components/site.tsx`, `Header.tsx`, `lib/*` của web) — nếu thấy lỗi/thiếu, sửa tối thiểu và ghi rõ trong báo cáo.
- Báo cáo cuối: file đã tạo/sửa, endpoint đã thêm, thay đổi schema/file dùng chung, những gì chưa làm được.

## Lưu ý kỹ thuật (bổ sung)
- **postgres-js + `sql` thô**: KHÔNG truyền đối tượng `Date` vào template `sql\`...${date}...\`` (lỗi "The string argument must be of type string… Received an instance of Date"). Dùng `${date.toISOString()}`. Các toán tử Drizzle (`gte(col, date)`, `lt`, `.values({...})`) thì nhận Date bình thường.
