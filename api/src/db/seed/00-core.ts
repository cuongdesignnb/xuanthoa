import { hashPassword, ALL_PERMISSIONS } from "../../lib/auth.js";
import type { SeedCtx } from "./ctx.js";
import { ensureBucket } from "../../lib/storage.js";

/** Tài khoản demo (in ra khi seed xong). */
export const DEMO = {
  admin: { email: "admin@nihongo.vn", password: "Admin@123" },
  staff: { email: "editor@nihongo.vn", password: "Editor@123" },
  student: { email: "minhanh@nihongo.vn", password: "Hocvien@123" },
};

const TEACHERS = [
  { slug: "sato", name: "Cô Sato Ayaka", badge: "native", native: true, rating: 4.9, reviewCount: 326, skills: ["Giao tiếp", "Văn hóa Nhật"], yearsExp: 6, levelRange: "N5 – N2", bio: "Giáo viên bản ngữ đến từ Tokyo. Chuyên giao tiếp thực tế, phát âm chuẩn và văn hóa đời sống Nhật Bản.", avatarSeed: "Ayaka", avatarBg: "ffe4e8", studentCount: 1480, completionRate: 90 },
  { slug: "minh", name: "Thầy Trần Nhật Minh", badge: "N1", native: false, rating: 4.8, reviewCount: 280, skills: ["JLPT N1", "Ngữ pháp", "Đọc hiểu"], yearsExp: 8, levelRange: "N2 – N1", bio: "Tốt nghiệp ĐH Tokyo, 8 năm giảng dạy tiếng Nhật. Thế mạnh luyện thi JLPT và phương pháp học hiệu quả.", avatarSeed: "Minh", avatarBg: "e0ecff", studentCount: 1940, completionRate: 87 },
  { slug: "mai", name: "Cô Nguyễn Thị Mai", badge: "N2", native: false, rating: 4.9, reviewCount: 412, skills: ["N5 - N3", "Giao tiếp", "Nghe nói"], yearsExp: 5, levelRange: "N5 – N3", bio: "Phong cách dạy gần gũi, sinh động, giúp học viên tự tin giao tiếp sau thời gian ngắn.", avatarSeed: "Yuki", avatarBg: "fde7ef", studentCount: 2580, completionRate: 92 },
  { slug: "tanaka", name: "Thầy Tanaka Hiroshi", badge: "native", native: true, rating: 4.9, reviewCount: 198, skills: ["Giao tiếp", "Kanji", "Văn hóa"], yearsExp: 10, levelRange: "N4 – N1", bio: "Giáo viên bản ngữ, giàu kinh nghiệm dạy người Việt. Thích kết hợp văn hóa Nhật vào bài học.", avatarSeed: "Hiroshi-Tanaka", avatarBg: "fff1d6", studentCount: 1210, completionRate: 84 },
  { slug: "ha", name: "Cô Lê Thu Hà", badge: "N1", native: false, rating: 4.8, reviewCount: 164, skills: ["JLPT N1", "Đọc hiểu", "Viết luận"], yearsExp: 7, levelRange: "N3 – N1", bio: "Thạc sĩ Ngôn ngữ Nhật, chuyên luyện thi JLPT và kỹ năng viết học thuật chi tiết, dễ hiểu.", avatarSeed: "Ha-Le-sensei", avatarBg: "e6f7ec", studentCount: 1620, completionRate: 85 },
  { slug: "hoang-anh", name: "Thầy Phạm Hoàng Anh", badge: "N2", native: false, rating: 4.8, reviewCount: 210, skills: ["N5 - N3", "Giao tiếp", "Kanji"], yearsExp: 4, levelRange: "N5 – N3", bio: "Bài giảng sinh động, nhiều ví dụ thực tế, phù hợp cho người mới bắt đầu và học viên muốn cải thiện giao tiếp.", avatarSeed: "Hoang-Anh-Pham", avatarBg: "ece7ff", studentCount: 980, completionRate: 81 },
  { slug: "yamamoto", name: "Cô Yamamoto Rina", badge: "native", native: true, rating: 4.9, reviewCount: 154, skills: ["Kanji", "Thư pháp", "Văn hóa"], yearsExp: 9, levelRange: "N5 – N1", bio: "Đến từ Osaka, yêu thư pháp Nhật. Giúp học viên ghi nhớ Kanji qua câu chuyện và nét chữ đẹp.", avatarSeed: "Rina-Yamamoto", avatarBg: "ffe9dc", studentCount: 870, completionRate: 88 },
  { slug: "quan", name: "Thầy Đỗ Minh Quân", badge: "N1", native: false, rating: 4.7, reviewCount: 132, skills: ["JLPT N2 - N1", "Nghe hiểu"], yearsExp: 6, levelRange: "N2 – N1", bio: "Từng làm phiên dịch tại Nagoya, chuyên luyện nghe hiểu tốc độ cao và chiến thuật làm đề JLPT.", avatarSeed: "Quan-Do-N1", avatarBg: "dff3ff", studentCount: 760, completionRate: 79 },
  { slug: "linh", name: "Cô Vũ Khánh Linh", badge: "N2", native: false, rating: 4.8, reviewCount: 245, skills: ["N5 - N4", "Bảng chữ cái", "Ngữ pháp"], yearsExp: 5, levelRange: "N5 – N4", bio: "Kiên nhẫn, tỉ mỉ, đồng hành cùng người mới từ bảng chữ cái đến đỗ N4 chỉ trong 6 tháng.", avatarSeed: "Linh-Vu", avatarBg: "fde2f3", studentCount: 1340, completionRate: 89 },
  { slug: "suzuki", name: "Thầy Suzuki Kenta", badge: "native", native: true, rating: 4.8, reviewCount: 176, skills: ["Giao tiếp công sở", "Keigo"], yearsExp: 11, levelRange: "N3 – N1", bio: "Nhiều năm làm nhân sự tại doanh nghiệp Nhật, chuyên tiếng Nhật thương mại và kính ngữ.", avatarSeed: "Kenta-Suzuki", avatarBg: "e3f5e8", studentCount: 690, completionRate: 83 },
  { slug: "thao", name: "Cô Bùi Phương Thảo", badge: "N1", native: false, rating: 4.9, reviewCount: 301, skills: ["JLPT N3", "Kanji", "Từ vựng"], yearsExp: 7, levelRange: "N4 – N2", bio: "Tác giả bộ flashcard Kanji N3 được yêu thích, giúp học viên ôn thi tập trung và hiệu quả.", avatarSeed: "Thao-Bui", avatarBg: "fff3d1", studentCount: 1150, completionRate: 86 },
  { slug: "duc", name: "Thầy Ngô Trí Đức", badge: "N2", native: false, rating: 4.7, reviewCount: 118, skills: ["N5 - N3", "Phát âm", "Hội thoại"], yearsExp: 3, levelRange: "N5 – N3", bio: "Trẻ trung, năng động, áp dụng shadowing và trò chơi giúp lớp học luôn vui vẻ, hiệu quả.", avatarSeed: "Duc-Ngo", avatarBg: "e8e9ff", studentCount: 540, completionRate: 78 },
  {
    slug: "nakamura", name: "Cô Nakamura Yuki", title: "Giáo viên cao cấp tại Nihongo+", badge: "native", native: true, featured: true, rating: 4.9, reviewCount: 520, skills: ["Giao tiếp", "Văn hóa Nhật", "Luyện thi JLPT"], yearsExp: 12, levelRange: "N5 – N1",
    bio: "Giáo viên bản ngữ đến từ Kyoto, chuyên giao tiếp thực tế và văn hóa Nhật Bản.", quote: "Tôi tin rằng học tiếng Nhật không chỉ là học ngôn ngữ, mà còn là khám phá một nền văn hóa tuyệt vời và mở ra những cơ hội mới trong cuộc sống.",
    education: "Cử nhân ĐH Kyoto · Chuyên ngành Sư phạm tiếng Nhật", highlights: ["Giáo viên bản ngữ đến từ Kyoto", "Chuyên giao tiếp thực tế và văn hóa Nhật Bản", "Từng giảng dạy tại nhiều trung tâm quốc tế", "Phong cách dạy nhẹ nhàng, truyền cảm hứng"],
    avatarSeed: "Nakamura-Yuki", avatarBg: "ffe4e8", studentCount: 2210, completionRate: 93,
  },
];

const FIRST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
const MID = ["Thảo", "Đức", "Hoàng", "Quang", "Thị", "Minh", "Thu", "Gia", "Khánh", "Ngọc"];
const LAST = ["Linh", "Minh", "Yến", "Huy", "Mai", "Anh", "Phương", "Hân", "Nam", "Trang", "Tuấn", "Hà", "Long", "Vy"];

export default async function seedCore(ctx: SeedCtx) {
  const { db, schema } = ctx;
  await ensureBucket();

  /* Nhóm quyền */
  const [adminRole, editorRole, supportRole, accountantRole] = await db
    .insert(schema.roles)
    .values([
      { name: "Quản trị viên", description: "Toàn quyền hệ thống", permissions: ALL_PERMISSIONS },
      {
        name: "Biên tập nội dung",
        description: "Quản lý khóa học, bài học, bài tập, blog và media",
        permissions: ["dashboard.read", "courses.write", "quizzes.write", "posts.write", "media.write", "teachers.read", "moderation.write"],
      },
      {
        name: "Chăm sóc học viên",
        description: "Hỗ trợ học viên, xử lý ticket, đánh giá và thông báo",
        permissions: ["dashboard.read", "students.write", "support.write", "moderation.write", "notifications.write", "orders.read"],
      },
      {
        name: "Kế toán",
        description: "Theo dõi đơn hàng, doanh thu, mã giảm giá",
        permissions: ["dashboard.read", "orders.write", "plans.write", "coupons.write", "reports.read"],
      },
    ])
    .returning();

  /* Nhân sự */
  await db.insert(schema.users).values([
    { email: DEMO.admin.email, passwordHash: await hashPassword(DEMO.admin.password), name: "Nguyễn Minh Anh", role: "admin", roleId: adminRole.id, avatarUrl: null, phone: "0901 234 567" },
    { email: DEMO.staff.email, passwordHash: await hashPassword(DEMO.staff.password), name: "Trần Thu Trang", role: "staff", roleId: editorRole.id, phone: "0902 345 678" },
    { email: "support@nihongo.vn", passwordHash: await hashPassword("Support@123"), name: "Lê Văn Hùng", role: "staff", roleId: supportRole.id },
    { email: "ketoan@nihongo.vn", passwordHash: await hashPassword("Ketoan@123"), name: "Phạm Hồng Nhung", role: "staff", roleId: accountantRole.id },
  ]);

  /* Học viên demo (dùng cho dashboard học viên) + học viên ngẫu nhiên trải đều 12 tháng */
  const studentHash = await hashPassword(DEMO.student.password);
  const students = [
    { email: DEMO.student.email, passwordHash: studentHash, name: "Minh Anh", level: "N4" as "N5" | "N4" | "N3" | "N2" | "N1", targetLevel: "N3" as "N4" | "N3" | "N2", targetDate: "12/2026", streak: 12, xp: 2450, createdAt: ctx.daysAgo(200), lastActiveAt: new Date() },
  ];
  for (let i = 0; i < 160; i++) {
    const name = `${ctx.pick(FIRST)} ${ctx.pick(MID)} ${ctx.pick(LAST)}`;
    const ago = Math.floor(Math.pow(ctx.rand(), 1.6) * 365);
    students.push({
      email: `hocvien${i + 1}@example.com`,
      passwordHash: studentHash,
      name,
      level: ctx.pick(["N5", "N5", "N4", "N4", "N3", "N2", "N1"] as const),
      targetLevel: ctx.pick(["N4", "N3", "N2"] as const),
      targetDate: "12/2026",
      streak: ctx.int(0, 40),
      xp: ctx.int(0, 6000),
      createdAt: ctx.daysAgo(ago),
      lastActiveAt: ctx.daysAgo(Math.min(ago, Math.floor(Math.pow(ctx.rand(), 2) * 90))),
    });
  }
  await db.insert(schema.users).values(students.map((s, i) => ({ ...s, status: i % 37 === 36 ? ("blocked" as const) : ("active" as const) })));

  /* Giáo viên (tài khoản đăng nhập cho 3 giáo viên chính) */
  const teacherUsers = await db
    .insert(schema.users)
    .values([
      { email: "mai@nihongo.vn", passwordHash: await hashPassword("Teacher@123"), name: "Nguyễn Thị Mai", role: "teacher" },
      { email: "minh@nihongo.vn", passwordHash: await hashPassword("Teacher@123"), name: "Trần Nhật Minh", role: "teacher" },
      { email: "sato@nihongo.vn", passwordHash: await hashPassword("Teacher@123"), name: "Sato Ayaka", role: "teacher" },
    ])
    .returning();
  const userBySlug: Record<string, string> = { mai: teacherUsers[0].id, minh: teacherUsers[1].id, sato: teacherUsers[2].id };
  await db.insert(schema.teachers).values(
    TEACHERS.map((t, i) => ({ ...t, order: i, userId: userBySlug[t.slug] ?? null, createdAt: ctx.daysAgo(i === TEACHERS.length - 1 ? 12 : 700 - i * 45) })),
  );

  /* Thành tích */
  await db.insert(schema.achievements).values([
    { code: "diligent", title: "Học viên chăm chỉ", description: "Học liên tục 7 ngày", icon: "sakura", tone: "pink" },
    { code: "streak10", title: "Giữ lửa 10 ngày", description: "Đạt chuỗi 10 ngày học", icon: "flame", tone: "orange" },
    { code: "lessons50", title: "Hoàn thành bài 50", description: "Hoàn thành 50 bài học", icon: "book", tone: "blue" },
    { code: "n4fighter", title: "N4 Fighter", description: "Đang chinh phục N4", icon: "fuji", tone: "indigo" },
    { code: "first-quiz", title: "Bài kiểm tra đầu tiên", description: "Hoàn thành bài tập đầu tiên", icon: "star", tone: "amber" },
  ]);

  /* Trạng thái dịch vụ */
  await db.insert(schema.services).values([
    { key: "api", name: "API & Backend", uptime: 99.9 },
    { key: "payment", name: "Thanh toán (VNPAY/MoMo)", uptime: 99.9 },
    { key: "email", name: "Email & Thông báo", uptime: 99.8 },
    { key: "cdn", name: "CDN & Tài nguyên", uptime: 99.9 },
    { key: "mobile", name: "Ứng dụng mobile (iOS/Android)", uptime: 99.9 },
  ]);

  /* Cài đặt hệ thống */
  await db.insert(schema.settings).values([
    { key: "site", value: { name: "Nihongo+", tagline: "Học tiếng Nhật, mở rộng tương lai", hotline: "1900 6868", email: "hotro@nihongo.plus", adminEmail: "admin@nihongo.vn", version: "2.5.0" } },
    { key: "social", value: { facebook: "#", youtube: "#", tiktok: "#", instagram: "#" } },
    { key: "payment", value: { vnpay: true, momo: true, bank: true, currency: "VND" } },
    { key: "ai", value: { model: "", gradingEnabled: true } },
    { key: "video", value: { allowDownload: false, watermark: true, tokenTtlSec: 600 } },
    { key: "media", value: { webpQuality: 82, maxWidth: 2400, deleteOriginal: true } },
  ]);

  console.log("  Tài khoản demo:", DEMO);
}
