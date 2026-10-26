import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  primaryKey,
  uniqueIndex,
  index,
  serial,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

export const userRole = pgEnum("user_role", ["admin", "staff", "teacher", "student"]);
export const userStatus = pgEnum("user_status", ["active", "blocked", "pending"]);
export const level = pgEnum("jlpt_level", ["N5", "N4", "N3", "N2", "N1"]);
export const publishStatus = pgEnum("publish_status", ["draft", "review", "published", "archived"]);
export const videoSource = pgEnum("video_source", ["upload", "youtube"]);
export const videoStatus = pgEnum("video_status", ["pending", "processing", "ready", "failed"]);
export const lessonType = pgEnum("lesson_type", ["video", "text", "quiz"]);
export const quizKind = pgEnum("quiz_kind", ["exercise", "jlpt"]);
export const difficulty = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const questionType = pgEnum("question_type", ["mcq", "short", "essay"]);
export const attemptStatus = pgEnum("attempt_status", ["in_progress", "submitted", "graded"]);
export const orderStatus = pgEnum("order_status", ["pending", "paid", "refund_requested", "refunded", "cancelled"]);
export const couponType = pgEnum("coupon_type", ["percent", "fixed"]);
export const moderation = pgEnum("moderation_status", ["pending", "approved", "hidden"]);
export const ticketStatus = pgEnum("ticket_status", ["open", "pending", "resolved", "closed"]);
export const priority = pgEnum("priority", ["low", "normal", "high", "urgent"]);
export const audience = pgEnum("audience", ["all", "students", "teachers", "level", "user"]);

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()::text`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Người dùng, phân quyền                                              */
/* ------------------------------------------------------------------ */

/** Nhóm quyền cho nhân sự (admin/staff). `permissions` là danh sách khóa dạng "courses.write". */
export const roles = pgTable("roles", {
  id: id(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    role: userRole("role").notNull().default("student"),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    status: userStatus("status").notNull().default("active"),
    level: level("level"),
    targetLevel: level("target_level"),
    targetDate: text("target_date"),
    streak: integer("streak").notNull().default(0),
    xp: integer("xp").notNull().default(0),
    bio: text("bio"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), index("users_role_idx").on(t.role)],
);

/* ------------------------------------------------------------------ */
/* Media & video                                                       */
/* ------------------------------------------------------------------ */

/** Ảnh/tệp trong Media Library. Ảnh luôn được chuyển sang WebP và xoá bản gốc khi upload. */
export const media = pgTable("media", {
  id: id(),
  filename: text("filename").notNull(),
  originalName: text("original_name"),
  url: text("url").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt"),
  folder: text("folder").notNull().default("general"),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/** Video bài học: upload (HLS mã hoá AES-128, khoá cấp qua token) hoặc YouTube. */
export const videos = pgTable("videos", {
  id: id(),
  title: text("title").notNull(),
  source: videoSource("source").notNull(),
  youtubeId: text("youtube_id"),
  status: videoStatus("status").notNull().default("pending"),
  /** Thư mục HLS trong storage (không public). */
  hlsDir: text("hls_dir"),
  durationSec: integer("duration_sec"),
  thumbnailUrl: text("thumbnail_url"),
  sizeBytes: integer("size_bytes"),
  error: text("error"),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Giáo viên, khóa học, bài học                                        */
/* ------------------------------------------------------------------ */

export const teachers = pgTable("teachers", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  title: text("title"),
  avatarSeed: text("avatar_seed"),
  avatarUrl: text("avatar_url"),
  avatarBg: text("avatar_bg"),
  /** "N5 – N3" … */
  levelRange: text("level_range"),
  /** "native" | "N1" | "N2" */
  badge: text("badge"),
  native: boolean("native").notNull().default(false),
  skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
  yearsExp: integer("years_exp").notNull().default(0),
  bio: text("bio"),
  quote: text("quote"),
  education: text("education"),
  highlights: text("highlights").array().notNull().default(sql`'{}'::text[]`),
  rating: real("rating").notNull().default(5),
  reviewCount: integer("review_count").notNull().default(0),
  studentCount: integer("student_count").notNull().default(0),
  completionRate: integer("completion_rate").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  status: publishStatus("status").notNull().default("published"),
  order: integer("order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const courses = pgTable(
  "courses",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    /** HTML từ trình soạn thảo. */
    description: text("description"),
    level: level("level"),
    /** "level" | "jlpt" | "communication" | "kanji" | "business" … */
    category: text("category").notNull().default("level"),
    goals: text("goals").array().notNull().default(sql`'{}'::text[]`),
    outcomes: text("outcomes").array().notNull().default(sql`'{}'::text[]`),
    format: text("format").notNull().default("video"),
    /** Các hình thức học hiển thị ở bộ lọc: "Video bài giảng", "Lớp học trực tuyến"… */
    formats: text("formats").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    coverUrl: text("cover_url"),
    /** Thiết kế bìa vẽ bằng CSS (màu, chữ lớn, avatar) khi không có ảnh. */
    coverStyle: jsonb("cover_style").$type<Record<string, unknown>>(),
    badge: text("badge"),
    teacherId: text("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    price: integer("price").notNull().default(0),
    salePrice: integer("sale_price"),
    saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),
    durationHours: integer("duration_hours").notNull().default(0),
    weeks: integer("weeks"),
    rating: real("rating").notNull().default(5),
    ratingCount: integer("rating_count").notNull().default(0),
    studentCount: integer("student_count").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    status: publishStatus("status").notNull().default("draft"),
    order: integer("order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("courses_status_idx").on(t.status), index("courses_level_idx").on(t.level)],
);

export const modules = pgTable("modules", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  title: text("title").notNull(),
  description: text("description"),
});

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary"),
    type: lessonType("type").notNull().default("video"),
    /** HTML từ trình soạn thảo (hỗ trợ <ruby> furigana). */
    content: text("content"),
    /** Nội dung tab Ngữ pháp. */
    grammar: text("grammar"),
    videoId: text("video_id").references(() => videos.id, { onDelete: "set null" }),
    durationSec: integer("duration_sec").notNull().default(0),
    isFree: boolean("is_free").notNull().default(false),
    hasDocs: boolean("has_docs").notNull().default(false),
    hasExercise: boolean("has_exercise").notNull().default(false),
    quizId: text("quiz_id"),
    status: publishStatus("status").notNull().default("published"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId)],
);

export const vocab = pgTable("vocab", {
  id: id(),
  lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  word: text("word").notNull(),
  reading: text("reading"),
  romaji: text("romaji"),
  pos: text("pos"),
  meaning: text("meaning").notNull(),
  exampleJa: text("example_ja"),
  exampleRomaji: text("example_romaji"),
  exampleVi: text("example_vi"),
});

/** Tài liệu đính kèm (bài học, khóa học hoặc tài liệu miễn phí trên blog). */
export const resources = pgTable("resources", {
  id: id(),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull().default("PDF"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  downloads: integer("downloads").notNull().default(0),
  lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "cascade" }),
  isFree: boolean("is_free").notNull().default(false),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Bài tập, đề thi, câu hỏi, lượt làm                                  */
/* ------------------------------------------------------------------ */

export const quizzes = pgTable(
  "quizzes",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    kind: quizKind("kind").notNull().default("exercise"),
    title: text("title").notNull(),
    description: text("description"),
    level: level("level").notNull(),
    /** "vocab" | "grammar" | "kanji" | "listening" | "jlpt" | "reading" | "communication" */
    skill: text("skill").notNull().default("grammar"),
    topic: text("topic"),
    difficulty: difficulty("difficulty").notNull().default("medium"),
    durationMin: integer("duration_min").notNull().default(15),
    icon: text("icon"),
    emoji: text("emoji"),
    tone: text("tone"),
    /** "manual" | "ai" */
    source: text("source").notNull().default("manual"),
    passScore: integer("pass_score").notNull().default(60),
    featured: boolean("featured").notNull().default(false),
    status: publishStatus("status").notNull().default("published"),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("quizzes_kind_idx").on(t.kind, t.level)],
);

export type QuestionOption = { key: string; text: string };
export type QuestionHint = { title?: string; body?: string; exampleJa?: string; exampleVi?: string };

export const questions = pgTable(
  "questions",
  {
    id: id(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
    type: questionType("type").notNull().default("mcq"),
    /** Câu hỏi; có thể chứa HTML <ruby> và chỗ trống "____". */
    prompt: text("prompt").notNull(),
    translation: text("translation"),
    options: jsonb("options").$type<QuestionOption[]>().notNull().default([]),
    /** Khóa đáp án đúng (mcq) hoặc đáp án mẫu (short/essay). */
    answer: text("answer").notNull(),
    explanation: text("explanation"),
    explanationLong: text("explanation_long"),
    hint: jsonb("hint").$type<QuestionHint>(),
    audioText: text("audio_text"),
    scene: text("scene"),
    points: integer("points").notNull().default(1),
  },
  (t) => [index("questions_quiz_idx").on(t.quizId)],
);

export type AttemptAnswer = {
  questionId: string;
  answer: string;
  correct?: boolean;
  score?: number;
  feedback?: string;
  /** Ai chấm câu này: "auto" (trắc nghiệm / so khớp), "ai" (Claude), "manual" (giáo viên). Chỉ là kiểu TS trong jsonb, không đổi cột. */
  gradedBy?: "auto" | "ai" | "manual";
};

export const attempts = pgTable(
  "attempts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<AttemptAnswer[]>().notNull().default([]),
    score: real("score"),
    maxScore: real("max_score"),
    /** Nhận xét tổng thể do AI chấm. */
    feedback: text("feedback"),
    status: attemptStatus("status").notNull().default("in_progress"),
    durationSec: integer("duration_sec"),
    startedAt: createdAt(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [index("attempts_user_idx").on(t.userId), index("attempts_quiz_idx").on(t.quizId)],
);

/* ------------------------------------------------------------------ */
/* Học viên: ghi danh, tiến độ, từ vựng đã lưu, phiên học              */
/* ------------------------------------------------------------------ */

export const enrollments = pgTable(
  "enrollments",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    percent: integer("percent").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const savedVocab = pgTable(
  "saved_vocab",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vocabId: text("vocab_id")
      .notNull()
      .references(() => vocab.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.vocabId] })],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "lesson" | "quiz" | "post" | "teacher" */
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId] })],
);

/** Thời gian học theo ngày và kỹ năng (biểu đồ dashboard học viên). */
export const studySessions = pgTable(
  "study_sessions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    skill: text("skill").notNull(),
    minutes: integer("minutes").notNull(),
    lessons: integer("lessons").notNull().default(0),
  },
  (t) => [index("study_sessions_user_day_idx").on(t.userId, t.day)],
);

/** Kế hoạch học trong tuần của học viên. */
export const planItems = pgTable("plan_items", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("lesson"),
  minutes: integer("minutes").notNull().default(15),
  done: boolean("done").notNull().default(false),
});

export const achievements = pgTable("achievements", {
  id: id(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  tone: text("tone"),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    earnedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.achievementId] })],
);

/* ------------------------------------------------------------------ */
/* Blog                                                                */
/* ------------------------------------------------------------------ */

export const posts = pgTable(
  "posts",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    content: text("content"),
    /** "grammar" | "kanji" | "jlpt" | "culture" | "tips" | "study-abroad" */
    category: text("category").notNull(),
    coverUrl: text("cover_url"),
    coverStyle: jsonb("cover_style").$type<Record<string, unknown>>(),
    authorId: text("author_id").references(() => teachers.id, { onDelete: "set null" }),
    readMin: integer("read_min").notNull().default(5),
    views: integer("views").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    guide: boolean("guide").notNull().default(false),
    status: publishStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("posts_status_idx").on(t.status, t.publishedAt)],
);

/* ------------------------------------------------------------------ */
/* Thương mại: gói học, đơn hàng, mã giảm giá                          */
/* ------------------------------------------------------------------ */

export const plans = pgTable("plans", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull(),
  /** Giá mỗi tháng khi trả theo năm. */
  priceYearly: integer("price_yearly").notNull(),
  features: text("features").array().notNull().default(sql`'{}'::text[]`),
  /** Cấp độ khóa học được mở khi mua gói (vd ["N5","N4"]); rỗng = tất cả. */
  levels: text("levels").array().notNull().default(sql`'{}'::text[]`),
  highlighted: boolean("highlighted").notNull().default(false),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: createdAt(),
});

export const coupons = pgTable("coupons", {
  id: id(),
  code: text("code").notNull().unique(),
  type: couponType("type").notNull().default("percent"),
  value: integer("value").notNull(),
  maxUses: integer("max_uses"),
  used: integer("used").notNull().default(0),
  minAmount: integer("min_amount").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const orders = pgTable(
  "orders",
  {
    id: id(),
    code: text("code").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id").references(() => plans.id, { onDelete: "set null" }),
    courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
    /** Nhãn hiển thị: "N5 - Cơ bản", "Premium 6 tháng"… */
    itemName: text("item_name").notNull(),
    /** "month" | "year" | "lifetime" */
    billing: text("billing").notNull().default("lifetime"),
    amount: integer("amount").notNull(),
    discount: integer("discount").notNull().default(0),
    couponCode: text("coupon_code"),
    /** "vnpay" | "momo" | "bank" | "card" */
    paymentMethod: text("payment_method").notNull().default("vnpay"),
    status: orderStatus("status").notNull().default("pending"),
    note: text("note"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("orders_status_idx").on(t.status, t.createdAt), index("orders_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Tương tác: đánh giá, báo lỗi, thảo luận, thông báo, hỗ trợ          */
/* ------------------------------------------------------------------ */

export const reviews = pgTable("reviews", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role"),
  courseId: text("course_id").references(() => courses.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").references(() => teachers.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  /** Hiển thị ở trang chủ / trang giáo viên. */
  featured: boolean("featured").notNull().default(false),
  status: moderation("status").notNull().default("pending"),
  createdAt: createdAt(),
});

export const reports = pgTable("reports", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  /** "lesson" | "question" | "post" | "video" | "other" */
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  targetTitle: text("target_title"),
  content: text("content").notNull(),
  status: ticketStatus("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: createdAt(),
});

export const comments = pgTable("comments", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  content: text("content").notNull(),
  likes: integer("likes").notNull().default(0),
  status: moderation("status").notNull().default("approved"),
  createdAt: createdAt(),
});

/** Lượt thích bình luận bài học (mỗi người một lần). */
export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })],
);

export const notes = pgTable("notes", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  atSec: integer("at_sec").notNull().default(0),
  content: text("content").notNull(),
  createdAt: createdAt(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: audience("audience").notNull().default("all"),
  level: level("level"),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  /** "in_app" | "email" | "push" */
  channels: text("channels").array().notNull().default(sql`'{in_app}'::text[]`),
  link: text("link"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const notificationReads = pgTable(
  "notification_reads",
  {
    notificationId: text("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.userId] })],
);

export type TicketReply = { by: string; byName: string; staff: boolean; content: string; at: string };

export const tickets = pgTable("tickets", {
  id: id(),
  code: text("code").notNull().unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull().default("general"),
  status: ticketStatus("status").notNull().default("open"),
  priority: priority("priority").notNull().default("normal"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  replies: jsonb("replies").$type<TicketReply[]>().notNull().default([]),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Vận hành: lịch nhắc việc, nhật ký, cài đặt, newsletter             */
/* ------------------------------------------------------------------ */

export const tasks = pgTable("tasks", {
  id: id(),
  title: text("title").notNull(),
  note: text("note"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  color: text("color").notNull().default("red"),
  done: boolean("done").notNull().default(false),
  /** "todo" | "in_progress" | "done" */
  state: text("state").notNull().default("todo"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    summary: text("summary"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_logs_created_idx").on(t.createdAt)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

export const subscribers = pgTable("subscribers", {
  email: text("email").primaryKey(),
  createdAt: createdAt(),
});

/** Trạng thái dịch vụ (widget "Tình trạng hệ thống"). */
export const services = pgTable("services", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  uptime: real("uptime").notNull().default(99.9),
  status: text("status").notNull().default("ok"),
  checkedAt: updatedAt(),
});
