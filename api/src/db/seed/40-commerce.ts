/**
 * Thương mại: gói học, mã giảm giá, ~12 tháng đơn hàng (doanh thu tăng dần), ghi danh người mua.
 * Mục tiêu khớp ảnh tham chiếu admin: 12 tháng ≈ 12,8 tỷ; tháng này ≈ 1,28 tỷ (+22% so với tháng trước);
 * phân bổ ≈ Khóa học 51% / Subscription 33% / Workshop 10% / Tài liệu 6%; 8 yêu cầu hoàn tiền.
 */
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { hashPassword } from "../../lib/auth.js";
import type { SeedCtx } from "./ctx.js";

type Lvl = "N5" | "N4" | "N3" | "N2" | "N1";
type Status = "pending" | "paid" | "refund_requested" | "refunded" | "cancelled";
type OrderRow = {
  code: string;
  userId: string;
  planId: string | null;
  courseId: string | null;
  itemName: string;
  billing: string;
  amount: number;
  discount: number;
  couponCode: string | null;
  paymentMethod: string;
  status: Status;
  note: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

const PLANS = [
  {
    code: "co-ban",
    name: "Cơ bản",
    description: "Phù hợp cho người mới bắt đầu",
    priceMonthly: 99000,
    features: ["Truy cập toàn bộ bài học N5 – N4", "Bài tập theo chủ đề", "Theo dõi tiến độ học tập"],
    levels: ["N5", "N4"],
    highlighted: false,
  },
  {
    code: "nang-cao",
    name: "Nâng cao",
    description: "Dành cho người học nghiêm túc",
    priceMonthly: 199000,
    features: ["Truy cập toàn bộ khóa học N5 – N3", "Bài tập nâng cao, luyện đề JLPT", "Flashcard, luyện nghe – nói", "Hỗ trợ lộ trình từ giáo viên"],
    levels: ["N5", "N4", "N3"],
    highlighted: true,
  },
  {
    code: "premium",
    name: "Premium",
    description: "Cho mục tiêu du học và làm việc tại Nhật",
    priceMonthly: 349000,
    features: ["Truy cập tất cả khóa học N5 – N1", "Luyện đề chuyên sâu, đề thi thật", "Giáo viên chấm & nhận xét bài nói", "Tư vấn lộ trình du học – việc làm"],
    levels: [],
    highlighted: false,
  },
];

const WORKSHOPS = [
  ["Workshop Phỏng vấn xin việc tại Nhật", 990000],
  ["Workshop Kính ngữ & giao tiếp công sở", 790000],
  ["Workshop Luyện nói cùng giáo viên bản xứ (4 buổi)", 1290000],
  ["Workshop Chiến lược thi JLPT N3", 690000],
  ["Workshop Văn hóa doanh nghiệp Nhật Bản", 890000],
  ["Workshop Viết CV & thư xin việc tiếng Nhật", 590000],
] as const;

const DOCS = [
  ["Tài liệu Trọn bộ đề JLPT N3 (PDF + audio)", 349000],
  ["Tài liệu Flashcard 1.000 Kanji N3", 249000],
  ["Tài liệu Sổ tay ngữ pháp N5 – N4", 199000],
  ["Tài liệu Trọn bộ đề JLPT N2 (PDF + audio)", 399000],
  ["Tài liệu Từ vựng chuyên ngành IT tiếng Nhật", 299000],
  ["Tài liệu Bộ luyện nghe Shadowing N4 – N3", 279000],
] as const;

/** Khóa học dự phòng khi chưa có dữ liệu khóa học. */
const FALLBACK_COURSES = [
  ["N5 - Cơ bản", 459000, "N5"],
  ["N4 - Toàn diện", 699000, "N4"],
  ["N3 - Chuyên sâu", 899000, "N3"],
  ["N2 - Luyện thi", 1190000, "N2"],
  ["N1 - Luyện thi chuyên sâu", 1490000, "N1"],
] as const;

const REFUND_NOTES = [
  "Em đăng ký nhầm khóa học, mong được hoàn tiền để mua khóa khác.",
  "Lịch làm việc thay đổi nên em không thể theo học được nữa.",
  "Bị trừ tiền 2 lần cho cùng một đơn, nhờ admin kiểm tra giúp.",
  "Nội dung chưa phù hợp với trình độ hiện tại của mình.",
  "Mình đã mua gói năm nhưng muốn chuyển sang gói tháng.",
  "Video bị lỗi không xem được trên điện thoại, mong được hỗ trợ hoàn tiền.",
  "Con em đã mua trùng khóa này bằng tài khoản khác.",
  "Em muốn huỷ do chuyển công tác ra nước ngoài.",
];

const FIRST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Mai", "Trịnh", "Cao"];
const MID_F = ["Thị", "Thảo", "Ngọc", "Thu", "Khánh", "Minh", "Hoàng", "Phương", "Bảo", "Gia", "Thanh", "Hải", "Diệu", "Quỳnh"];
const MID_M = ["Văn", "Đức", "Minh", "Quang", "Hoàng", "Gia", "Thành", "Hữu", "Tuấn", "Anh", "Công", "Đình", "Nhật", "Trung"];
const LAST_F = ["Linh", "Yến", "Mai", "Anh", "Phương", "Hân", "Trang", "Hà", "Vy", "Ngân", "Thảo", "Nhung", "Hương", "Châu", "Uyên", "Trâm", "My", "Giang"];
const LAST_M = ["Minh", "Huy", "Nam", "Tuấn", "Long", "Khoa", "Phúc", "Đạt", "Hiếu", "Dũng", "Sơn", "Kiên", "Bảo", "Hưng", "Quân", "Thắng", "Duy", "Tùng"];

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const r1000 = (n: number) => Math.round(n / 1000) * 1000;

export default async function seedCommerce(ctx: SeedCtx) {
  const { db, schema, rand, int, pick } = ctx;
  const { plans, coupons, orders, users, courses, enrollments } = schema;
  const now = new Date();
  const H = 3600_000;

  /* ------------------------------ Gói học ------------------------------ */
  const planRows = await db
    .insert(plans)
    .values([
      ...PLANS.map((p, i) => ({ ...p, priceYearly: r1000(p.priceMonthly * 0.8), order: i, active: true })),
      {
        code: "doanh-nghiep",
        name: "Doanh nghiệp",
        description: "Đào tạo tiếng Nhật cho đội ngũ (từ 10 tài khoản)",
        priceMonthly: 2990000,
        priceYearly: 2390000,
        features: ["10 tài khoản Premium", "Báo cáo tiến độ cho quản lý", "Lớp kính ngữ công sở riêng", "Hoá đơn VAT"],
        levels: [],
        highlighted: false,
        active: false,
        order: 3,
      },
    ])
    .returning();
  const planByCode = Object.fromEntries(planRows.map((p) => [p.code, p]));
  const activePlans = planRows.filter((p) => p.active);

  /* ---------------------------- Mã giảm giá ---------------------------- */
  const y = now.getFullYear();
  const D = (yy: number, m: number, d: number) => new Date(yy, m - 1, d);
  const couponDefs = [
    { code: "WELCOME10", type: "percent" as const, value: 10, maxUses: null, minAmount: 0, startsAt: new Date(now.getTime() - 400 * 864e5), endsAt: null, active: true },
    { code: "NIHONGO20", type: "percent" as const, value: 20, maxUses: 3000, minAmount: 300000, startsAt: new Date(now.getTime() - 180 * 864e5), endsAt: D(y, 12, 31), active: true },
    { code: "SAKURA50K", type: "fixed" as const, value: 50000, maxUses: 2000, minAmount: 200000, startsAt: new Date(now.getTime() - 120 * 864e5), endsAt: null, active: true },
    { code: "JLPT2026", type: "percent" as const, value: 15, maxUses: 1000, minAmount: 400000, startsAt: D(y, 9, 1), endsAt: D(y, 12, 6), active: true },
    { code: "TET2026", type: "percent" as const, value: 25, maxUses: 1500, minAmount: 0, startsAt: D(2026, 1, 15), endsAt: D(2026, 2, 28), active: true },
    { code: "SUMMER30", type: "percent" as const, value: 30, maxUses: 800, minAmount: 500000, startsAt: D(2026, 6, 1), endsAt: D(2026, 8, 31), active: true },
    { code: "FLASH15", type: "percent" as const, value: 15, maxUses: 120, minAmount: 0, startsAt: D(2026, 4, 10), endsAt: D(2026, 4, 20), active: true },
    { code: "BLACKFRIDAY", type: "percent" as const, value: 30, maxUses: 500, minAmount: 0, startsAt: D(y, 11, 20), endsAt: D(y, 11, 30), active: true },
    { code: "NEWYEAR2027", type: "fixed" as const, value: 100000, maxUses: 1000, minAmount: 500000, startsAt: D(y + 1, 1, 1), endsAt: D(y + 1, 1, 15), active: true },
    { code: "STAFF100", type: "percent" as const, value: 100, maxUses: 20, minAmount: 0, startsAt: null, endsAt: null, active: false },
  ];
  await db.insert(coupons).values(couponDefs.map((c) => ({ ...c, used: 0 })));
  const usable = couponDefs.filter((c) => c.active && !(c.type === "percent" && c.value >= 100));

  /* ----------------------- Khóa học (từ seed 10) ----------------------- */
  const courseRows = await db
    .select({ id: courses.id, slug: courses.slug, title: courses.title, level: courses.level, price: courses.price, salePrice: courses.salePrice, featured: courses.featured })
    .from(courses)
    .where(eq(courses.status, "published"));
  const paidCourses = courseRows
    .filter((c) => c.price > 0)
    .map((c) => ({
      ...c,
      amount: c.salePrice && c.salePrice < c.price ? c.salePrice : c.price,
      weight: (c.featured ? 3 : 1) * ({ N5: 3, N4: 2.6, N3: 2, N2: 1.2, N1: 0.8 }[c.level ?? "N3"] ?? 1),
    }));
  const coursesByLevel = (lv: Lvl) => paidCourses.filter((c) => c.level === lv);
  const planCourses = (planId: string) => {
    const p = planRows.find((x) => x.id === planId)!;
    return courseRows.filter((c) => !p.levels.length || (c.level && p.levels.includes(c.level))).map((c) => c.id);
  };
  const totalW = paidCourses.reduce((s, c) => s + c.weight, 0);
  const pickCourse = () => {
    let x = rand() * totalW;
    for (const c of paidCourses) if ((x -= c.weight) <= 0) return c;
    return paidCourses[0];
  };

  /* ------------------------ Học viên bổ sung --------------------------- */
  const hash = await hashPassword("Hocvien@123");
  const extra: (typeof users.$inferInsert)[] = [];
  const usedEmails = new Set<string>();
  const regWeight = [0.55, 0.62, 0.7, 0.68, 0.78, 0.84, 0.9, 0.97, 1.02, 1.08, 0.95, 1.18];
  const regTotal = regWeight.reduce((a, b) => a + b, 0);
  const EXTRA = 2400;
  for (let i = 0; i < EXTRA; i++) {
    const female = rand() < 0.58;
    const name = `${pick(FIRST)} ${pick(female ? MID_F : MID_M)} ${pick(female ? LAST_F : LAST_M)}`;
    const parts = strip(name).split(" ");
    let email = "";
    do email = `${parts.slice(1).join("")}.${parts[0]}${int(1, 999)}@${pick(["gmail.com", "gmail.com", "gmail.com", "yahoo.com", "outlook.com", "icloud.com"])}`;
    while (usedEmails.has(email));
    usedEmails.add(email);
    // ~35% đăng ký trước 12 tháng (năm trước); còn lại trải theo đà tăng trưởng
    let created: Date;
    if (rand() < 0.35) created = new Date(now.getTime() - (366 + Math.floor(Math.pow(rand(), 0.8) * 364)) * 864e5);
    else {
      let x = rand() * regTotal;
      let m = 0;
      while ((x -= regWeight[m]) > 0 && m < 11) m++;
      const ms = new Date(now.getFullYear(), now.getMonth() - 11 + m, 1);
      const me = m === 11 ? new Date(now.getTime() - 40 * H) : new Date(now.getFullYear(), now.getMonth() - 10 + m, 1);
      created = new Date(ms.getTime() + rand() * (me.getTime() - ms.getTime()));
    }
    created.setHours(int(7, 23), int(0, 59));
    extra.push({
      email,
      passwordHash: hash,
      name,
      phone: `09${int(10000000, 99999999)}`,
      level: pick(["N5", "N5", "N5", "N4", "N4", "N3", "N2", "N1"] as const),
      targetLevel: pick(["N4", "N3", "N3", "N2"] as const),
      targetDate: pick(["07/2026", "12/2026", "07/2027"]),
      streak: int(0, 30),
      xp: int(0, 4000),
      createdAt: created,
      lastActiveAt: new Date(Math.max(created.getTime(), now.getTime() - int(0, 60) * 864e5)),
    });
  }
  // Học viên trong bảng "Đăng ký gần đây"
  const REF = [
    { name: "Nguyễn Thảo Linh", email: "thaolinh.nguyen@gmail.com", level: "N5" as const, daysAgo: 6 },
    { name: "Trần Đức Minh", email: "ducminh.tran@gmail.com", level: "N4" as const, daysAgo: 40 },
    { name: "Lê Hoàng Yến", email: "hoangyen.le@gmail.com", level: "N3" as const, daysAgo: 95 },
    { name: "Phạm Quang Huy", email: "quanghuy.pham@gmail.com", level: "N3" as const, daysAgo: 70 },
    { name: "Vũ Thị Mai", email: "thimai.vu@gmail.com", level: "N5" as const, daysAgo: 3 },
  ];
  for (const r of REF)
    extra.push({ email: r.email, passwordHash: hash, name: r.name, level: r.level, targetLevel: "N3", targetDate: "12/2026", createdAt: new Date(now.getTime() - r.daysAgo * 864e5), lastActiveAt: now });
  for (let i = 0; i < extra.length; i += 500) await db.insert(users).values(extra.slice(i, i + 500));

  const students = (
    await db.select({ id: users.id, email: users.email, createdAt: users.createdAt }).from(users).where(and(eq(users.role, "student"), eq(users.status, "active")))
  ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const refIds = new Set((await db.select({ id: users.id }).from(users).where(inArray(users.email, REF.map((r) => r.email)))).map((u) => u.id));
  const buyers = students.filter((s) => !refIds.has(s.id) && s.email !== "minhanh@nihongo.vn");
  const createdTimes = buyers.map((s) => s.createdAt.getTime());
  /** Người mua đã đăng ký trước thời điểm `t` (ưu tiên người mới đăng ký). */
  const pickBuyer = (t: number) => {
    let lo = 0;
    let hi = createdTimes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (createdTimes[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    const n = Math.max(1, lo);
    if (rand() < 0.4) {
      // người đăng ký trong ~60 ngày gần đây
      let k = n - 1;
      while (k > 0 && createdTimes[k] > t - 60 * 864e5) k--;
      return buyers[int(k, n - 1)];
    }
    return buyers[int(0, n - 1)];
  };

  /* ------------------------------ Đơn hàng ----------------------------- */
  // Doanh thu thực (đã thanh toán) mục tiêu mỗi tháng, tính bằng tỷ VND — cũ → mới
  // 12 tháng năm trước (≈ 9,43 tỷ → tăng trưởng ≈ +36%) rồi 12 tháng gần nhất (≈ 12,8 tỷ)
  const TARGET = [
    0.62, 0.66, 0.7, 0.68, 0.74, 0.77, 0.8, 0.83, 0.86, 0.89, 0.92, 0.96,
    0.8, 0.86, 0.93, 0.89, 1.0, 1.06, 1.13, 1.2, 1.27, 1.33, 1.049, 1.28,
  ];
  const SHARE: [string, number][] = [
    ["course", 0.51],
    ["sub", 0.33],
    ["workshop", 0.1],
    ["doc", 0.06],
  ];
  const METHODS = ["vnpay", "vnpay", "vnpay", "vnpay", "momo", "momo", "momo", "bank", "bank", "card"];
  const owned = new Set<string>(); // userId|courseId đã mua
  const rows: OrderRow[] = [];
  const codes = new Set<string>();
  const mkCode = (d: Date) => {
    const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    let c = "";
    do c = `NH${ymd}${String(int(0, 9999)).padStart(4, "0")}`;
    while (codes.has(c));
    codes.add(c);
    return c;
  };
  const couponFor = (t: Date, amount: number) => {
    if (rand() > 0.16) return null;
    const ok = usable.filter((c) => (!c.startsAt || c.startsAt <= t) && (!c.endsAt || c.endsAt >= t) && amount >= c.minAmount);
    if (!ok.length) return null;
    const c = pick(ok);
    return { code: c.code, discount: Math.min(amount, c.type === "percent" ? r1000((amount * c.value) / 100) : c.value) };
  };

  type Item = { planId: string | null; courseId: string | null; itemName: string; billing: string; amount: number };
  const makeItem = (kind: string, userId: string): Item | null => {
    if (kind === "course") {
      if (!paidCourses.length) {
        const [name, price] = pick(FALLBACK_COURSES);
        return { planId: null, courseId: null, itemName: name, billing: "lifetime", amount: price };
      }
      for (let k = 0; k < 6; k++) {
        const c = pickCourse();
        if (owned.has(`${userId}|${c.id}`)) continue;
        return { planId: null, courseId: c.id, itemName: c.title, billing: "lifetime", amount: c.amount };
      }
      return null;
    }
    if (kind === "sub") {
      const p = pick([activePlans[0], activePlans[1], activePlans[1], activePlans[1], activePlans[2], activePlans[2]]);
      const r = rand();
      if (r < 0.42) return { planId: p.id, courseId: null, itemName: `${p.name} 12 tháng`, billing: "year", amount: p.priceYearly * 12 };
      if (r < 0.62) return { planId: p.id, courseId: null, itemName: `${p.name} 6 tháng`, billing: "month", amount: r1000(p.priceMonthly * 6 * 0.9) };
      return { planId: p.id, courseId: null, itemName: `${p.name} 1 tháng`, billing: "month", amount: p.priceMonthly };
    }
    const [name, price] = kind === "workshop" ? pick(WORKSHOPS) : pick(DOCS);
    return { planId: null, courseId: null, itemName: name, billing: "lifetime", amount: price };
  };

  const lastRandom = now.getTime() - 30 * H; // các đơn ngẫu nhiên cũ hơn 5 đơn tham chiếu
  for (let m = 0; m < TARGET.length; m++) {
    const ms = new Date(now.getFullYear(), now.getMonth() - 23 + m, 1).getTime();
    const me = m === 23 ? lastRandom : new Date(now.getFullYear(), now.getMonth() - 22 + m, 1).getTime();
    for (const [kind, share] of SHARE) {
      let need = TARGET[m] * 1e9 * share;
      let guard = 0;
      while (need > 0 && guard++ < 20000) {
        const t = new Date(ms + rand() * (me - ms));
        t.setHours(int(7, 23), int(0, 59), int(0, 59));
        if (t.getTime() > me) t.setTime(me - int(1, 600) * 60_000);
        const u = pickBuyer(t.getTime());
        const item = makeItem(kind, u.id);
        if (!item) continue;
        const cp = couponFor(t, item.amount);
        const discount = cp?.discount ?? 0;
        // Trạng thái: phần lớn đã thanh toán
        const age = (now.getTime() - t.getTime()) / 864e5;
        const x = rand();
        let status: Status = "paid";
        if (x < 0.025) status = age < 3 ? "pending" : "cancelled";
        else if (x < 0.04 && age > 20) status = "refunded";
        const paidAt = status === "pending" || status === "cancelled" ? null : new Date(t.getTime() + int(1, 25) * 60_000);
        if (item.courseId && status !== "cancelled" && status !== "pending") owned.add(`${u.id}|${item.courseId}`);
        rows.push({
          code: mkCode(t),
          userId: u.id,
          ...item,
          discount,
          couponCode: cp?.code ?? null,
          paymentMethod: pick(METHODS),
          status,
          note: status === "refunded" ? pick(REFUND_NOTES) : status === "cancelled" ? "Quá hạn thanh toán, hệ thống tự huỷ" : null,
          paidAt,
          createdAt: t,
        });
        if (status === "paid") need -= item.amount - discount;
      }
    }
  }

  // 8 yêu cầu hoàn tiền: đơn đã thanh toán trong 3 tuần gần đây
  const recentPaid = rows.filter((r) => r.status === "paid" && now.getTime() - r.createdAt.getTime() < 21 * 864e5 && !r.planId);
  for (let i = 0; i < 8 && recentPaid.length; i++) {
    const r = recentPaid.splice(int(0, recentPaid.length - 1), 1)[0];
    r.status = "refund_requested";
    r.note = REFUND_NOTES[i];
  }
  // Một ít đơn chờ thanh toán trong 2 ngày gần đây
  for (let i = 0; i < 14; i++) {
    const t = new Date(now.getTime() - (30 + int(1, 40)) * H);
    const u = pickBuyer(t.getTime());
    const item = makeItem(pick(["course", "course", "sub", "workshop"]), u.id);
    if (!item) continue;
    rows.push({ code: mkCode(t), userId: u.id, ...item, discount: 0, couponCode: null, paymentMethod: pick(METHODS), status: "pending", note: null, paidAt: null, createdAt: t });
  }

  // 5 đơn "Đăng ký gần đây" như ảnh tham chiếu (mới nhất)
  const refUser = async (email: string) => (await ctx.ids.user(email))!;
  const courseFor = (lv: Lvl) => coursesByLevel(lv).sort((a, b) => b.weight - a.weight)[0] ?? null;
  const REF_ORDERS: { email: string; itemName: string; amount: number; level?: Lvl; plan?: string; status: Status; hoursAgo: number; method: string }[] = [
    { email: "thaolinh.nguyen@gmail.com", itemName: "N5 - Cơ bản", amount: 459000, level: "N5", status: "paid", hoursAgo: 2.3, method: "vnpay" },
    { email: "ducminh.tran@gmail.com", itemName: "N4 - Toàn diện", amount: 699000, level: "N4", status: "paid", hoursAgo: 5.4, method: "momo" },
    { email: "hoangyen.le@gmail.com", itemName: "Premium 6 tháng", amount: r1000(349000 * 6 * 0.9), plan: "premium", status: "pending", hoursAgo: 7.6, method: "bank" },
    { email: "quanghuy.pham@gmail.com", itemName: "N3 - Chuyên sâu", amount: 899000, level: "N3", status: "paid", hoursAgo: 19.8, method: "card" },
    { email: "thimai.vu@gmail.com", itemName: "N5 - Cơ bản", amount: 459000, level: "N5", status: "paid", hoursAgo: 25.4, method: "vnpay" },
  ];
  for (const r of REF_ORDERS) {
    const t = new Date(now.getTime() - r.hoursAgo * H);
    const userId = await refUser(r.email);
    const course = r.level ? courseFor(r.level) : null;
    if (course) owned.add(`${userId}|${course.id}`);
    rows.push({
      code: mkCode(t),
      userId,
      planId: r.plan ? planByCode[r.plan].id : null,
      courseId: course?.id ?? null,
      itemName: r.itemName,
      billing: r.plan ? "month" : "lifetime",
      amount: r.amount,
      discount: 0,
      couponCode: null,
      paymentMethod: r.method,
      status: r.status,
      note: null,
      paidAt: r.status === "paid" ? new Date(t.getTime() + 3 * 60_000) : null,
      createdAt: t,
    });
  }

  // Học viên demo: N5 cơ bản + Ngữ pháp N4 (+ 1 tài liệu)
  const demoId = await ctx.ids.user("minhanh@nihongo.vn");
  const demoCourses = courseRows.length
    ? await db
        .select({ id: courses.id, title: courses.title, price: courses.price, salePrice: courses.salePrice, level: courses.level, slug: courses.slug })
        .from(courses)
        .where(
          or(
            ilike(courses.title, "N5%cơ bản%"),
            ilike(courses.title, "%tiếng Nhật cơ bản%"),
            ilike(courses.slug, "%ngu-phap-n4%"),
            ilike(courses.title, "%ngữ pháp%N4%"),
          ),
        )
    : [];
  const demoN5 = demoCourses.find((c) => c.slug === "n5-tieng-nhat-co-ban") ?? demoCourses.find((c) => c.level === "N5") ?? courseFor("N5");
  const demoN4 = demoCourses.find((c) => c.slug === "ngu-phap-n4") ?? demoCourses.find((c) => c.level === "N4") ?? courseFor("N4");
  if (demoId) {
    const demo: [typeof demoN5, number][] = [
      [demoN5, 150],
      [demoN4, 62],
    ];
    for (const [c, days] of demo) {
      const t = new Date(now.getTime() - days * 864e5);
      const amount = c ? ("amount" in c ? (c as { amount: number }).amount : c.salePrice && c.salePrice < c.price ? c.salePrice : c.price) : 459000;
      if (c) owned.add(`${demoId}|${c.id}`);
      rows.push({
        code: mkCode(t),
        userId: demoId,
        planId: null,
        courseId: c?.id ?? null,
        itemName: c?.title ?? (days > 100 ? "N5 - Cơ bản" : "N4 - Toàn diện"),
        billing: "lifetime",
        amount: amount || 459000,
        discount: days > 100 ? r1000((amount || 459000) * 0.1) : 0,
        couponCode: days > 100 ? "WELCOME10" : null,
        paymentMethod: "momo",
        status: "paid",
        note: null,
        paidAt: new Date(t.getTime() + 5 * 60_000),
        createdAt: t,
      });
    }
    const t = new Date(now.getTime() - 18 * 864e5);
    rows.push({ code: mkCode(t), userId: demoId, planId: null, courseId: null, itemName: DOCS[1][0], billing: "lifetime", amount: DOCS[1][1], discount: 0, couponCode: null, paymentMethod: "vnpay", status: "paid", note: null, paidAt: new Date(t.getTime() + 2 * 60_000), createdAt: t });
  }

  for (let i = 0; i < rows.length; i += 1000) await db.insert(orders).values(rows.slice(i, i + 1000));

  /* --------------------------- Lượt dùng mã ---------------------------- */
  await db.execute(sql`
    update ${coupons} c set used = x.n
    from (select coupon_code, count(*)::int as n from ${orders} where coupon_code is not null and status in ('paid','refund_requested','refunded') group by coupon_code) x
    where x.coupon_code = c.code`);
  // FLASH15: đã dùng hết lượt
  await db.update(coupons).set({ used: 120 }).where(eq(coupons.code, "FLASH15"));

  /* ----------------------------- Ghi danh ------------------------------ */
  const enrollMap = new Map<string, Date>();
  const addEnroll = (userId: string, courseId: string, at: Date) => {
    const k = `${userId}|${courseId}`;
    const prev = enrollMap.get(k);
    if (!prev || at < prev) enrollMap.set(k, at);
  };
  const planCourseCache = new Map<string, string[]>();
  for (const o of rows) {
    if (o.status !== "paid" && o.status !== "refund_requested") continue;
    if (o.courseId) addEnroll(o.userId, o.courseId, o.paidAt!);
    else if (o.planId && now.getTime() - o.paidAt!.getTime() < (o.billing === "year" || o.itemName.includes("6 tháng") ? 365 : 31) * 864e5) {
      // Gói còn hiệu lực → mở khoá các khóa thuộc cấp độ của gói
      if (!planCourseCache.has(o.planId)) planCourseCache.set(o.planId, planCourses(o.planId));
      for (const cid of planCourseCache.get(o.planId)!) addEnroll(o.userId, cid, o.paidAt!);
    }
  }
  const enrollRows = [...enrollMap.entries()].map(([k, createdAt]) => {
    const [userId, courseId] = k.split("|");
    return { userId, courseId, createdAt, status: "active" };
  });
  const added: { courseId: string }[] = [];
  for (let i = 0; i < enrollRows.length; i += 1000)
    added.push(...(await db.insert(enrollments).values(enrollRows.slice(i, i + 1000)).onConflictDoNothing().returning({ courseId: enrollments.courseId })));
  const perCourse = new Map<string, number>();
  for (const a of added) perCourse.set(a.courseId, (perCourse.get(a.courseId) ?? 0) + 1);
  for (const [courseId, n] of perCourse) await db.update(courses).set({ studentCount: sql`${courses.studentCount} + ${n}` }).where(eq(courses.id, courseId));

  const paid = rows.filter((r) => r.status === "paid");
  const rev = paid.reduce((s, r) => s + r.amount - r.discount, 0);
  console.log(
    `  ${planRows.length} gói, ${couponDefs.length} mã giảm giá, ${extra.length} học viên mới, ${rows.length} đơn (${paid.length} đã thanh toán, ${(rev / 1e9).toFixed(2)} tỷ), ${added.length} ghi danh mới${paidCourses.length ? "" : " (chưa có khóa học — dùng đơn dự phòng)"}`,
  );
}
