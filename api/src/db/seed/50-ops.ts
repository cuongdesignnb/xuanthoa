import { and, eq, inArray, sql } from "drizzle-orm";
import type { SeedCtx } from "./ctx.js";
import type { TicketReply } from "../schema.js";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOffset = (n: number, h = 0, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d;
};

const SKILLS = ["grammar", "vocab", "listening", "reading", "speaking"] as const;
const SKILL_W = [0.35, 0.25, 0.2, 0.15, 0.05];

const TICKETS: { subject: string; message: string; category: string; staffReply: string; userReply?: string }[] = [
  { subject: "Không xem được video bài 12", message: "Em bấm vào video bài 12 khóa N4 thì màn hình đen, chỉ có tiếng. Em dùng Chrome trên Windows.", category: "technical", staffReply: "Chào bạn, bạn thử xoá cache trình duyệt hoặc tắt tiện ích chặn quảng cáo rồi tải lại giúp mình nhé.", userReply: "Em tắt tiện ích là xem được rồi ạ, cảm ơn anh/chị!" },
  { subject: "Thanh toán MoMo bị trừ tiền nhưng chưa kích hoạt", message: "Em đã thanh toán gói Premium 6 tháng qua MoMo, tài khoản đã bị trừ tiền nhưng khóa học vẫn chưa mở.", category: "payment", staffReply: "Bộ phận kế toán đã kiểm tra giao dịch và kích hoạt gói cho bạn. Bạn đăng xuất rồi đăng nhập lại để cập nhật nhé." },
  { subject: "Muốn đổi email đăng nhập", message: "Mình muốn đổi email đăng nhập sang email công ty, làm thế nào ạ?", category: "account", staffReply: "Bạn vui lòng gửi email mới qua ticket này, bên mình sẽ xác minh và cập nhật trong 24h." },
  { subject: "Đáp án câu 7 đề N3 có vẻ sai", message: "Câu 7 phần ngữ pháp đề thi thử N3 số 2, đáp án đúng phải là B chứ không phải C.", category: "content", staffReply: "Cảm ơn bạn đã báo! Giáo viên đã kiểm tra và sửa lại đáp án. Bạn được cộng 50 XP nhé." },
  { subject: "Xin hoá đơn VAT", message: "Công ty em cần hoá đơn VAT cho đơn hàng khóa N2. Em gửi thông tin xuất hoá đơn như thế nào ạ?", category: "payment", staffReply: "Bạn gửi tên công ty, mã số thuế, địa chỉ và email nhận hoá đơn qua ticket này giúp mình nhé." },
  { subject: "Ứng dụng mobile bị thoát khi làm bài", message: "Khi làm bài tập nghe trên iPhone, ứng dụng tự thoát ra màn hình chính.", category: "technical", staffReply: "Bên mình đã ghi nhận lỗi trên iOS 18 và sẽ phát hành bản sửa trong tuần này." },
  { subject: "Tư vấn lộ trình từ N5 lên N3", message: "Em mới học xong bảng chữ cái, muốn thi N3 vào tháng 12 năm sau thì nên học khóa nào?", category: "course", staffReply: "Bạn có thể học N5 Cơ bản (2 tháng) → N4 Toàn diện (3 tháng) → N3 Luyện thi. Mình gửi lộ trình chi tiết qua email nhé." },
  { subject: "Quên mật khẩu không nhận được email", message: "Em bấm quên mật khẩu nhưng không thấy email gửi về, đã kiểm tra cả thư rác.", category: "account", staffReply: "Mình đã đặt lại mật khẩu tạm thời và gửi qua số điện thoại đăng ký của bạn." },
  { subject: "Phát âm trong bài 5 không rõ", message: "Audio phần hội thoại bài 5 khóa giao tiếp bị rè, nghe không rõ.", category: "content", staffReply: "Cảm ơn bạn, đội nội dung sẽ thu âm lại bài 5 trong tuần tới." },
  { subject: "Yêu cầu hoàn tiền khóa N1", message: "Em đăng ký nhầm khóa N1, em muốn đổi sang khóa N3 hoặc được hoàn tiền.", category: "payment", staffReply: "Đơn của bạn đủ điều kiện đổi khóa trong 7 ngày. Mình đã chuyển sang khóa N3 cho bạn." },
  { subject: "Chứng chỉ hoàn thành khóa học", message: "Em đã học xong 100% khóa N5 nhưng chưa thấy chứng chỉ.", category: "course", staffReply: "Chứng chỉ được cấp sau khi bạn hoàn thành bài kiểm tra cuối khóa với điểm từ 70%." },
  { subject: "Không lưu được từ vựng", message: "Bấm ngôi sao lưu từ vựng nhưng tải lại trang thì mất.", category: "technical", staffReply: "Lỗi đã được khắc phục ở bản cập nhật tối qua. Bạn thử lại giúp mình nhé." },
  { subject: "Học nhóm với bạn bè", message: "Có gói học nhóm cho 3 người không ạ?", category: "general", staffReply: "Hiện bên mình có ưu đãi giảm 15% khi đăng ký nhóm từ 3 người, bạn liên hệ hotline để được hỗ trợ." },
  { subject: "Lịch thi JLPT tháng 12", message: "Cho em hỏi hạn đăng ký thi JLPT tháng 12 tại Hà Nội là khi nào?", category: "general", staffReply: "Hạn đăng ký thường vào cuối tháng 8. Bạn theo dõi blog Nihongo+ để cập nhật thông tin mới nhất nhé." },
];

const OPEN_TICKETS = [
  { subject: "Không đăng nhập được trên điện thoại", message: "Em nhập đúng mật khẩu nhưng ứng dụng báo lỗi kết nối máy chủ.", category: "technical", priority: "high" as const },
  { subject: "Mã giảm giá SAKURA20 không áp dụng được", message: "Em nhập mã SAKURA20 khi thanh toán nhưng báo mã không hợp lệ.", category: "payment", priority: "normal" as const },
  { subject: "Video bài 3 khóa Kanji bị giật", message: "Video bài 3 cứ vài giây lại dừng để tải, mạng nhà em vẫn ổn.", category: "technical", priority: "normal" as const },
  { subject: "Đã chuyển khoản nhưng đơn vẫn chờ thanh toán", message: "Em chuyển khoản lúc 9h sáng nay kèm nội dung mã đơn nhưng đơn vẫn ở trạng thái chờ.", category: "payment", priority: "urgent" as const },
  { subject: "Xin tài liệu PDF bài 8", message: "Bài 8 khóa N4 ghi có tài liệu nhưng em không thấy nút tải.", category: "content", priority: "low" as const },
  { subject: "Đổi trình độ hiện tại trong hồ sơ", message: "Em vừa thi đỗ N4, muốn cập nhật trình độ và nhận gợi ý bài N3.", category: "account", priority: "normal" as const },
];

const NOTIFS = [
  { title: "Ra mắt khóa N3 Luyện thi tổng hợp 2026", body: "<p>Khóa <strong>N3 Luyện thi tổng hợp</strong> đã chính thức mở đăng ký với 120 bài học và 10 đề thi thử.</p><p>Ưu đãi <em>giảm 30%</em> cho 500 học viên đầu tiên!</p>", audience: "all" as const, link: "/khoa-hoc", ago: 2 },
  { title: "Bảo trì hệ thống 23:00 thứ Bảy", body: "<p>Hệ thống sẽ bảo trì từ <strong>23:00 – 01:00</strong> để nâng cấp máy chủ video. Tiến độ học của bạn vẫn được lưu đầy đủ.</p>", audience: "all" as const, ago: 5 },
  { title: "Thử thách 30 ngày Kanji", body: "<p>Tham gia thử thách học <strong>5 Kanji mỗi ngày</strong> trong 30 ngày để nhận huy hiệu đặc biệt.</p>", audience: "students" as const, link: "/bai-tap", ago: 8 },
  { title: "Đề thi thử N4 tháng này đã sẵn sàng", body: "<p>Đề thi thử <strong>JLPT N4</strong> mới nhất đã có trên hệ thống. Làm bài và xem phân tích điểm chi tiết ngay!</p>", audience: "level" as const, level: "N4" as const, link: "/bai-tap", ago: 3 },
  { title: "Lịch họp giáo viên tháng 11", body: "<p>Mời các thầy cô tham dự buổi họp chuyên môn lúc <strong>9:00 thứ Hai</strong> tuần tới qua Google Meet.</p>", audience: "teachers" as const, ago: 1 },
  { title: "Mẹo ghi nhớ từ vựng hiệu quả", body: "<p>Áp dụng phương pháp <strong>lặp lại ngắt quãng</strong> giúp bạn nhớ từ vựng lâu hơn tới 3 lần. Đọc bài viết mới trên blog nhé!</p>", audience: "students" as const, link: "/blog", ago: 12 },
  { title: "Ưu đãi Premium cuối tháng", body: "<p>Nâng cấp <strong>Nihongo+ Premium</strong> 12 tháng chỉ còn 199.000đ/tháng đến hết ngày 31.</p>", audience: "students" as const, ago: 18 },
  { title: "Ôn tập N3 cấp tốc", body: "<p>Chuỗi livestream ôn tập ngữ pháp N3 mỗi tối thứ Tư với thầy Minh.</p>", audience: "level" as const, level: "N3" as const, ago: 22 },
];

const SCHEDULED = [
  { title: "Nhắc lịch thi JLPT tháng 12", body: "<p>Chỉ còn <strong>30 ngày</strong> đến kỳ thi JLPT. Hãy hoàn thành ít nhất 2 đề thi thử mỗi tuần!</p>", audience: "students" as const, inDays: 3 },
  { title: "Khai giảng lớp giao tiếp cùng giáo viên bản ngữ", body: "<p>Lớp giao tiếp online cùng cô Nakamura khai giảng vào tối thứ Sáu tuần sau.</p>", audience: "all" as const, inDays: 7 },
];

export default async function seedOps(ctx: SeedCtx) {
  const { db, schema } = ctx;
  /** Không để mốc thời gian nằm trong tương lai (daysAgo(0) có thể ra giờ muộn hơn hiện tại). */
  const clamp = (d: Date) => new Date(Math.min(d.getTime(), Date.now() - ctx.int(5, 90) * 60_000));
  const ago = (days: number) => clamp(ctx.daysAgo(days));
  const S = schema;

  const staff = await db
    .select({ id: S.users.id, name: S.users.name, email: S.users.email, role: S.users.role })
    .from(S.users)
    .where(inArray(S.users.role, ["admin", "staff"]));
  const by = (email: string) => staff.find((s) => s.email === email) ?? staff[0];
  const admin = by("admin@nihongo.vn");
  const support = by("support@nihongo.vn");
  const editor = by("editor@nihongo.vn");
  const accountant = by("ketoan@nihongo.vn");

  const students = await db
    .select({ id: S.users.id, name: S.users.name, email: S.users.email, level: S.users.level })
    .from(S.users)
    .where(eq(S.users.role, "student"));
  const minh = students.find((s) => s.email === "minhanh@nihongo.vn");
  const others = students.filter((s) => s.email !== "minhanh@nihongo.vn");

  /* ---------------------------- Thông báo ---------------------------- */
  const sent = await db
    .insert(S.notifications)
    .values(
      NOTIFS.map((n) => {
        const at = ago(n.ago);
        return { title: n.title, body: n.body, audience: n.audience, level: "level" in n ? n.level : null, link: n.link ?? null, channels: ["in_app", "email"], sentAt: at, createdAt: at, createdById: admin.id };
      }),
    )
    .returning();
  if (minh)
    sent.push(
      ...(await db
        .insert(S.notifications)
        .values([
          { title: "Chúc mừng chuỗi 10 ngày học!", body: "<p>Bạn vừa đạt <strong>chuỗi 10 ngày học liên tiếp</strong> 🔥. Tiếp tục giữ lửa nhé!</p>", audience: "user", userId: minh.id, sentAt: ago(2), createdAt: ago(2), createdById: admin.id },
          { title: "Ticket hỗ trợ đã được phản hồi", body: "<p>Yêu cầu hỗ trợ của bạn đã có phản hồi mới từ đội ngũ Nihongo+.</p>", audience: "user", userId: minh.id, link: "/tai-khoan?tab=tickets", sentAt: ago(0), createdAt: ago(0), createdById: support.id },
        ])
        .returning()),
    );
  await db.insert(S.notifications).values([
    ...SCHEDULED.map((n) => ({ title: n.title, body: n.body, audience: n.audience, channels: ["in_app", "email", "push"], scheduledAt: dayOffset(n.inDays, 9, 0), createdById: admin.id })),
    { title: "Khảo sát mức độ hài lòng Q4", body: "<p>Mời bạn dành 2 phút góp ý để Nihongo+ phục vụ tốt hơn.</p>", audience: "students" as const, createdById: support.id },
  ]);

  // Lượt đọc: khoảng 30–70% học viên đã đọc mỗi thông báo gửi chung.
  const reads: { notificationId: string; userId: string; readAt: Date }[] = [];
  for (const n of sent) {
    if (n.audience === "user") continue;
    const pool = n.audience === "level" ? students.filter((s) => s.level === n.level) : students;
    const rate = 0.3 + ctx.rand() * 0.4;
    for (const s of pool) if (s.email !== "minhanh@nihongo.vn" && ctx.rand() < rate) reads.push({ notificationId: n.id, userId: s.id, readAt: n.sentAt ?? new Date() });
  }
  // Minh Anh: đã đọc các thông báo cũ, còn 3 cái mới chưa đọc.
  if (minh)
    for (const n of sent.filter((x) => x.audience !== "teachers" && (x.sentAt?.getTime() ?? 0) < Date.now() - 4 * 86400000))
      reads.push({ notificationId: n.id, userId: minh.id, readAt: new Date() });
  for (let i = 0; i < reads.length; i += 1000) await db.insert(S.notificationReads).values(reads.slice(i, i + 1000)).onConflictDoNothing();

  /* ----------------------------- Ticket ------------------------------ */
  const ticketRows: (typeof S.tickets.$inferInsert)[] = [];
  let code = 1001;
  const reply = (u: { id: string; name: string }, staffSide: boolean, content: string, at: Date): TicketReply => ({ by: u.id, byName: u.name, staff: staffSide, content, at: at.toISOString() });

  // 6 ticket mới (chưa xử lý) — khớp "6 ticket hỗ trợ mới" trên dashboard.
  OPEN_TICKETS.forEach((t, i) => {
    const u = i === 5 && minh ? minh : ctx.pick(others);
    const at = new Date(Date.now() - ctx.int(1, 20) * 3600_000);
    ticketRows.push({ code: `TK${code++}`, userId: u.id, subject: t.subject, message: t.message, category: t.category, priority: t.priority, status: "open", assigneeId: i < 2 ? support.id : null, replies: [], createdAt: at, updatedAt: at });
  });
  // ~34 ticket đã/đang xử lý.
  for (let i = 0; i < 34; i++) {
    const t = TICKETS[i % TICKETS.length];
    const u = i === 0 && minh ? minh : ctx.pick(others);
    const created = ago(ctx.int(1, 60));
    const status = ctx.pick(["pending", "pending", "resolved", "resolved", "resolved", "closed"] as const);
    const staffUser = t.category === "payment" ? accountant : ctx.rand() < 0.75 ? support : admin;
    const r1 = clamp(new Date(created.getTime() + ctx.int(1, 8) * 3600_000));
    const replies = [reply(staffUser, true, t.staffReply, r1)];
    if (t.userReply && status !== "pending") replies.push(reply(u, false, t.userReply, clamp(new Date(r1.getTime() + ctx.int(1, 20) * 3600_000))));
    if (status === "closed") replies.push(reply(staffUser, true, "Cảm ơn bạn đã liên hệ. Ticket sẽ được đóng, nếu cần hỗ trợ thêm bạn cứ tạo yêu cầu mới nhé!", clamp(new Date(r1.getTime() + 2 * 86400000))));
    ticketRows.push({
      code: `TK${code++}`,
      userId: u.id,
      subject: t.subject,
      message: t.message,
      category: t.category,
      priority: ctx.pick(["low", "normal", "normal", "normal", "high"] as const),
      status,
      assigneeId: staffUser.id,
      replies,
      createdAt: created,
      updatedAt: new Date(replies[replies.length - 1].at),
    });
  }
  await db.insert(S.tickets).values(ticketRows);

  /* ------------------------ Lịch & nhắc việc ------------------------- */
  const today = [
    { h: 9, title: "Họp team nội dung", note: "Thảo luận kế hoạch khóa N4 mới", color: "red", state: "in_progress" },
    { h: 11, title: "Duyệt 12 đánh giá khóa học", note: "Kiểm duyệt phản hồi học viên", color: "blue", state: "todo" },
    { h: 14, title: "Làm việc với đối tác", note: "Trao đổi về chương trình workshop", color: "amber", state: "todo" },
    { h: 16, title: "Xem xét báo cáo doanh thu", note: "Đánh giá tình hình tháng này", color: "amber", state: "todo" },
    { h: 17, title: "Trả lời ticket hỗ trợ", note: "Xử lý các yêu cầu hỗ trợ mới", color: "red", state: "todo" },
  ];
  const upcoming = [
    { d: 1, h: 9, m: 30, title: "Phỏng vấn giáo viên bản ngữ", note: "Ứng viên từ Osaka", color: "violet" },
    { d: 1, h: 15, m: 0, title: "Duyệt bài blog JLPT tháng 12", note: "3 bài chờ xuất bản", color: "blue" },
    { d: 2, h: 10, m: 0, title: "Kiểm tra đề thi thử N3 do AI tạo", note: "Rà soát đáp án và giải thích", color: "green" },
    { d: 2, h: 16, m: 30, title: "Gửi thông báo ưu đãi cuối tháng", note: "Soạn nội dung email", color: "red" },
    { d: 3, h: 9, m: 0, title: "Họp tổng kết tuần", note: "Báo cáo KPI các nhóm", color: "red" },
    { d: 4, h: 14, m: 0, title: "Quay video bài giảng Kanji N3", note: "Studio tầng 5", color: "amber" },
    { d: 5, h: 10, m: 0, title: "Đối soát thanh toán VNPAY/MoMo", note: "Cùng bộ phận kế toán", color: "green" },
    { d: 6, h: 11, m: 0, title: "Lên kế hoạch nội dung tháng tới", note: "", color: "blue" },
  ];
  const past = [
    { d: -1, h: 10, title: "Cập nhật bảng giá gói học", color: "amber" },
    { d: -1, h: 15, title: "Xử lý yêu cầu hoàn tiền", color: "red" },
    { d: -2, h: 9, title: "Đào tạo nhân sự CSKH mới", color: "violet" },
    { d: -3, h: 14, title: "Kiểm tra tốc độ CDN video", color: "blue" },
  ];
  await db.insert(S.tasks).values([
    ...today.map((t) => ({ title: t.title, note: t.note, color: t.color, state: t.state, done: false, dueAt: dayOffset(0, t.h, 0), assigneeId: admin.id })),
    ...upcoming.map((t, i) => ({ title: t.title, note: t.note || null, color: t.color, state: "todo", done: false, dueAt: dayOffset(t.d, t.h, t.m), assigneeId: i % 3 === 2 ? editor.id : admin.id })),
    ...past.map((t) => ({ title: t.title, color: t.color, state: "done", done: true, dueAt: dayOffset(t.d, t.h, 0), assigneeId: admin.id })),
  ]);

  /* ------------------------- Nhật ký hoạt động ------------------------ */
  const ACTS: { who: typeof admin; action: string; entity: string; summary: () => string }[] = [
    { who: admin, action: "login", entity: "auth", summary: () => "Đăng nhập" },
    { who: editor, action: "login", entity: "auth", summary: () => "Đăng nhập" },
    { who: support, action: "login", entity: "auth", summary: () => "Đăng nhập" },
    { who: editor, action: "update", entity: "lesson", summary: () => `Cập nhật bài học “Bài ${ctx.int(1, 30)}: ${ctx.pick(["て形", "から・まで", "で", "～たり～たりする", "い形容詞", "敬語"])}”` },
    { who: editor, action: "create", entity: "quiz", summary: () => `Tạo bài tập “Luyện ${ctx.pick(["ngữ pháp", "từ vựng", "nghe"])} ${ctx.pick(["N5", "N4", "N3"])} #${ctx.int(1, 40)}”` },
    { who: editor, action: "publish", entity: "post", summary: () => `Xuất bản bài viết “${ctx.pick(["Bí quyết đỗ N3", "100 Kanji cơ bản", "Văn hoá trà đạo", "Kính ngữ công sở"])}”` },
    { who: editor, action: "upload", entity: "media", summary: () => `Tải lên ${ctx.int(1, 8)} ảnh vào Media Library` },
    { who: editor, action: "approve", entity: "review", summary: () => `Duyệt đánh giá khóa học (${ctx.int(4, 5)}★)` },
    { who: support, action: "reply", entity: "ticket", summary: () => `Trả lời ticket TK${ctx.int(1001, 1040)}` },
    { who: support, action: "update", entity: "ticket", summary: () => `Cập nhật ticket TK${ctx.int(1001, 1040)}: trạng thái → resolved` },
    { who: support, action: "send", entity: "notification", summary: () => `Gửi thông báo “${ctx.pick(NOTIFS).title}”` },
    { who: support, action: "update", entity: "student", summary: () => `Cập nhật học viên ${ctx.pick(others).name}` },
    { who: accountant, action: "update", entity: "order", summary: () => `Xác nhận thanh toán đơn NH${ctx.int(100000, 999999)}` },
    { who: accountant, action: "refund", entity: "order", summary: () => `Hoàn tiền đơn NH${ctx.int(100000, 999999)}` },
    { who: accountant, action: "create", entity: "coupon", summary: () => `Tạo mã giảm giá ${ctx.pick(["SAKURA", "FUJI", "JLPT", "TET"])}${ctx.int(10, 50)}` },
    { who: admin, action: "update", entity: "setting", summary: () => `Cập nhật cài đặt “${ctx.pick(["site", "payment", "ai", "video", "media"])}”` },
    { who: admin, action: "update", entity: "role", summary: () => `Cập nhật nhóm quyền ${ctx.pick(["Biên tập nội dung", "Chăm sóc học viên", "Kế toán"])}` },
    { who: admin, action: "block", entity: "student", summary: () => `Khoá học viên ${ctx.pick(others).name}` },
    { who: admin, action: "create", entity: "course", summary: () => `Tạo khóa học “${ctx.pick(["N3 Luyện thi tổng hợp", "Kanji N2", "Giao tiếp công sở"])}”` },
    { who: admin, action: "export", entity: "student", summary: () => `Xuất CSV ${ctx.int(50, 160)} học viên` },
  ];
  const logs = Array.from({ length: 300 }, () => {
    const a = ctx.pick(ACTS);
    const at = ago(Math.floor(Math.pow(ctx.rand(), 1.3) * 30));
    return {
      userId: a.who.id,
      userName: a.who.name,
      action: a.action,
      entity: a.entity,
      entityId: null,
      summary: a.summary(),
      ip: `113.${ctx.int(160, 190)}.${ctx.int(0, 255)}.${ctx.int(1, 254)}`,
      createdAt: at,
    };
  }).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  await db.insert(S.activityLogs).values(logs);

  /* ------------------ Học viên: phiên học, kế hoạch… ------------------ */
  const sample = [minh, ...others.filter((_, i) => i % 5 === 0).slice(0, 30)].filter(Boolean) as typeof students;
  const sessions: (typeof S.studySessions.$inferInsert)[] = [];
  // Mẫu tuần như ảnh tham chiếu (T2→CN, phút).
  const WEEK_PATTERN = [45, 70, 90, 65, 35, 60, 80];
  for (const s of sample) {
    const isMinh = s.id === minh?.id;
    const activity = isMinh ? 0.85 : 0.25 + ctx.rand() * 0.5;
    for (let d = 119; d >= 0; d--) {
      const date = dayOffset(-d);
      // Minh Anh: học liên tục 12 ngày gần nhất (chuỗi 12 ngày), nghỉ đúng ngày thứ 13.
      if (isMinh && d === 12) continue;
      if (!(isMinh && d < 12) && ctx.rand() > activity) continue;
      const dow = (date.getDay() + 6) % 7;
      const total = isMinh ? Math.max(15, WEEK_PATTERN[dow] + ctx.int(-12, 12)) : ctx.int(10, 75);
      for (let k = 0; k < SKILLS.length; k++) {
        const share = SKILL_W[k] * (0.7 + ctx.rand() * 0.6);
        const minutes = Math.round(total * share);
        if (minutes < 3) continue;
        sessions.push({ userId: s.id, day: ymd(date), skill: SKILLS[k], minutes, lessons: minutes >= 15 ? Math.round(minutes / 20) || 1 : 0 });
      }
    }
  }
  for (let i = 0; i < sessions.length; i += 2000) await db.insert(S.studySessions).values(sessions.slice(i, i + 2000));

  // Kế hoạch tuần này (thứ Hai → CN).
  const now = new Date();
  const monday = dayOffset(-((now.getDay() + 6) % 7));
  const todayIdx = (now.getDay() + 6) % 7;
  const POOL = [
    { title: "Ôn tập từ vựng N4 (20 từ)", kind: "review", minutes: 15 },
    { title: "Bài 15: で (Nơi diễn ra hành động)", kind: "lesson", minutes: 20 },
    { title: "Luyện nghe: Hội thoại đời sống", kind: "listening", minutes: 15 },
    { title: "Làm bài tập ngữ pháp", kind: "exercise", minutes: 15 },
    { title: "Bài 14: から・まで (Khoảng thời gian)", kind: "lesson", minutes: 20 },
    { title: "Luyện đọc: Đoạn văn ngắn N4", kind: "reading", minutes: 10 },
  ];
  const planRows: (typeof S.planItems.$inferInsert)[] = [];
  for (const s of sample.slice(0, 10)) {
    for (let w = -1; w <= 1; w++)
      for (let d = 0; d < 7; d++) {
        const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7 + d);
        const isToday = w === 0 && d === todayIdx;
        const pastDay = w < 0 || (w === 0 && d < todayIdx);
        const items = isToday ? POOL.slice(0, 4) : [0, 1, 2, 3].map((i) => POOL[(d + w * 3 + 21 + i) % POOL.length]);
        items.forEach((p, i) => planRows.push({ userId: s.id, day: ymd(date), ...p, done: pastDay || (isToday && i === 0) }));
      }
  }
  if (planRows.length) await db.insert(S.planItems).values(planRows);

  // Thành tích.
  const ach = await db.select().from(S.achievements);
  const code2id = Object.fromEntries(ach.map((a) => [a.code, a.id]));
  const ua: { userId: string; achievementId: string; earnedAt: Date }[] = [];
  if (minh)
    ["diligent", "streak10", "lessons50", "n4fighter", "first-quiz"]
      .filter((c) => code2id[c])
      .forEach((c, i) => ua.push({ userId: minh.id, achievementId: code2id[c], earnedAt: ctx.daysAgo(60 - i * 12) }));
  for (const s of sample.slice(1)) for (const a of ach) if (ctx.rand() < 0.35) ua.push({ userId: s.id, achievementId: a.id, earnedAt: ctx.daysAgo(ctx.int(1, 100)) });
  if (ua.length) await db.insert(S.userAchievements).values(ua).onConflictDoNothing();

  /* --------- Minh Anh: ghi danh + tiến độ + từ vựng (nếu file trước chưa seed) --------- */
  if (!minh) return;
  let enrolled = await db.select({ courseId: S.enrollments.courseId }).from(S.enrollments).where(eq(S.enrollments.userId, minh.id));
  if (!enrolled.length) {
    const courses = await db
      .select({ id: S.courses.id, level: S.courses.level })
      .from(S.courses)
      .where(and(inArray(S.courses.level, ["N5", "N4"]), eq(S.courses.status, "published")))
      .orderBy(S.courses.order)
      .limit(6);
    const pick = [courses.find((c) => c.level === "N4"), courses.find((c) => c.level === "N5")].filter(Boolean) as { id: string }[];
    if (pick.length) {
      await db.insert(S.enrollments).values(pick.map((c, i) => ({ userId: minh.id, courseId: c.id, createdAt: ctx.daysAgo(150 - i * 40) }))).onConflictDoNothing();
      enrolled = pick.map((c) => ({ courseId: c.id }));
    }
  }
  if (!enrolled.length) {
    console.log("  50-ops: chưa có khóa học — bỏ qua tiến độ học của Minh Anh");
    return;
  }
  const [{ n: progressCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(S.lessonProgress).where(eq(S.lessonProgress.userId, minh.id));
  if (!progressCount) {
    const lessons = await db.execute<{ id: string; courseId: string; level: string | null }>(sql`
      select l.id, m.course_id as "courseId", c.level from lessons l join modules m on m.id = l.module_id join courses c on c.id = m.course_id
      where m.course_id in (${sql.join(enrolled.map((e) => sql`${e.courseId}`), sql`, `)})
      order by c.level desc, m."order", l."order"`);
    const rows: (typeof S.lessonProgress.$inferInsert)[] = [];
    const byCourse = new Map<string, typeof lessons>();
    for (const l of lessons) byCourse.set(l.courseId, [...(byCourse.get(l.courseId) ?? []), l] as never);
    for (const [, ls] of byCourse) {
      const isN4 = ls[0]?.level === "N4";
      const doneN = isN4 ? Math.round(ls.length * 0.62) : ls.length; // N5 xong, N4 ~62%
      ls.forEach((l, i) => {
        if (i < doneN) rows.push({ userId: minh.id, lessonId: l.id, percent: 100, completedAt: ctx.daysAgo(doneN - i + 1), updatedAt: ctx.daysAgo(doneN - i + 1) });
        else if (i === doneN) rows.push({ userId: minh.id, lessonId: l.id, percent: 80, updatedAt: new Date() });
      });
    }
    if (rows.length) await db.insert(S.lessonProgress).values(rows).onConflictDoNothing();
  }
  const [{ n: savedCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(S.savedVocab).where(eq(S.savedVocab.userId, minh.id));
  if (!savedCount) {
    const words = await db.execute<{ id: string }>(sql`
      select v.id from vocab v join lessons l on l.id = v.lesson_id join modules m on m.id = l.module_id
      where m.course_id in (${sql.join(enrolled.map((e) => sql`${e.courseId}`), sql`, `)})
      order by (v.word in ('頑張る', '旅行', '美しい')) desc, v."order" limit 12`);
    if (words.length)
      await db
        .insert(S.savedVocab)
        .values(words.map((w, i) => ({ userId: minh.id, vocabId: w.id, createdAt: new Date(Date.now() - i * 3600_000) })))
        .onConflictDoNothing();
  }
}
