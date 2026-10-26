CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'submitted', 'graded');--> statement-breakpoint
CREATE TYPE "public"."audience" AS ENUM('all', 'students', 'teachers', 'level', 'user');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."lesson_type" AS ENUM('video', 'text', 'quiz');--> statement-breakpoint
CREATE TYPE "public"."jlpt_level" AS ENUM('N5', 'N4', 'N3', 'N2', 'N1');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'refund_requested', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('mcq', 'short', 'essay');--> statement-breakpoint
CREATE TYPE "public"."quiz_kind" AS ENUM('exercise', 'jlpt');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'pending', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff', 'teacher', 'student');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked', 'pending');--> statement-breakpoint
CREATE TYPE "public"."video_source" AS ENUM('upload', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text,
	"tone" text,
	CONSTRAINT "achievements_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"user_name" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"summary" text,
	"meta" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"quiz_id" text NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" real,
	"max_score" real,
	"feedback" text,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
	"duration_sec" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_target_type_target_id_pk" PRIMARY KEY("user_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"parent_id" text,
	"content" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"status" "moderation_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"code" text NOT NULL,
	"type" "coupon_type" DEFAULT 'percent' NOT NULL,
	"value" integer NOT NULL,
	"max_uses" integer,
	"used" integer DEFAULT 0 NOT NULL,
	"min_amount" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"level" "jlpt_level",
	"category" text DEFAULT 'level' NOT NULL,
	"goals" text[] DEFAULT '{}'::text[] NOT NULL,
	"outcomes" text[] DEFAULT '{}'::text[] NOT NULL,
	"format" text DEFAULT 'video' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"cover_url" text,
	"cover_style" jsonb,
	"badge" text,
	"teacher_id" text,
	"price" integer DEFAULT 0 NOT NULL,
	"sale_price" integer,
	"sale_ends_at" timestamp with time zone,
	"duration_hours" integer DEFAULT 0 NOT NULL,
	"weeks" integer,
	"rating" real DEFAULT 5 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"student_count" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"percent" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"module_id" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"type" "lesson_type" DEFAULT 'video' NOT NULL,
	"content" text,
	"grammar" text,
	"video_id" text,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"has_docs" boolean DEFAULT false NOT NULL,
	"has_exercise" boolean DEFAULT false NOT NULL,
	"quiz_id" text,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"filename" text NOT NULL,
	"original_name" text,
	"url" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"folder" text DEFAULT 'general' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"course_id" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"at_sec" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"notification_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_reads_notification_id_user_id_pk" PRIMARY KEY("notification_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" "audience" DEFAULT 'all' NOT NULL,
	"level" "jlpt_level",
	"user_id" text,
	"channels" text[] DEFAULT '{in_app}'::text[] NOT NULL,
	"link" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text,
	"course_id" text,
	"item_name" text NOT NULL,
	"billing" text DEFAULT 'lifetime' NOT NULL,
	"amount" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"coupon_code" text,
	"payment_method" text DEFAULT 'vnpay' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'lesson' NOT NULL,
	"minutes" integer DEFAULT 15 NOT NULL,
	"done" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_monthly" integer NOT NULL,
	"price_yearly" integer NOT NULL,
	"features" text[] DEFAULT '{}'::text[] NOT NULL,
	"highlighted" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"content" text,
	"category" text NOT NULL,
	"cover_url" text,
	"cover_style" jsonb,
	"author_id" text,
	"read_min" integer DEFAULT 5 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"guide" boolean DEFAULT false NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"quiz_id" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"type" "question_type" DEFAULT 'mcq' NOT NULL,
	"prompt" text NOT NULL,
	"translation" text,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"answer" text NOT NULL,
	"explanation" text,
	"explanation_long" text,
	"hint" jsonb,
	"audio_text" text,
	"scene" text,
	"points" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"slug" text NOT NULL,
	"kind" "quiz_kind" DEFAULT 'exercise' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"level" "jlpt_level" NOT NULL,
	"skill" text DEFAULT 'grammar' NOT NULL,
	"topic" text,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"duration_min" integer DEFAULT 15 NOT NULL,
	"icon" text,
	"emoji" text,
	"tone" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"pass_score" integer DEFAULT 60 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quizzes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text,
	"target_type" text NOT NULL,
	"target_id" text,
	"target_title" text,
	"content" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"title" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text DEFAULT 'PDF' NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"lesson_id" text,
	"course_id" text,
	"is_free" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text,
	"author_name" text NOT NULL,
	"author_role" text,
	"course_id" text,
	"teacher_id" text,
	"rating" integer NOT NULL,
	"content" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "saved_vocab" (
	"user_id" text NOT NULL,
	"vocab_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_vocab_user_id_vocab_id_pk" PRIMARY KEY("user_id","vocab_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"uptime" real DEFAULT 99.9 NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"skill" text NOT NULL,
	"minutes" integer NOT NULL,
	"lessons" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"email" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"due_at" timestamp with time zone NOT NULL,
	"color" text DEFAULT 'red' NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"state" text DEFAULT 'todo' NOT NULL,
	"assignee_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"avatar_seed" text,
	"avatar_url" text,
	"avatar_bg" text,
	"level_range" text,
	"badge" text,
	"native" boolean DEFAULT false NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"years_exp" integer DEFAULT 0 NOT NULL,
	"bio" text,
	"quote" text,
	"education" text,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"rating" real DEFAULT 5 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"student_count" integer DEFAULT 0 NOT NULL,
	"completion_rate" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teachers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"code" text NOT NULL,
	"user_id" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "priority" DEFAULT 'normal' NOT NULL,
	"assignee_id" text,
	"replies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"user_id" text NOT NULL,
	"achievement_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_id_achievement_id_pk" PRIMARY KEY("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"role_id" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"level" "jlpt_level",
	"target_level" "jlpt_level",
	"target_date" text,
	"streak" integer DEFAULT 0 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"bio" text,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"title" text NOT NULL,
	"source" "video_source" NOT NULL,
	"youtube_id" text,
	"status" "video_status" DEFAULT 'pending' NOT NULL,
	"hls_dir" text,
	"duration_sec" integer,
	"thumbnail_url" text,
	"size_bytes" integer,
	"error" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocab" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"lesson_id" text,
	"order" integer DEFAULT 0 NOT NULL,
	"word" text NOT NULL,
	"reading" text,
	"romaji" text,
	"pos" text,
	"meaning" text NOT NULL,
	"example_ja" text,
	"example_romaji" text,
	"example_vi" text
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_teachers_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_vocab" ADD CONSTRAINT "saved_vocab_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_vocab" ADD CONSTRAINT "saved_vocab_vocab_id_vocab_id_fk" FOREIGN KEY ("vocab_id") REFERENCES "public"."vocab"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab" ADD CONSTRAINT "vocab_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_created_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "attempts_user_idx" ON "attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attempts_quiz_idx" ON "attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "courses_level_idx" ON "courses" USING btree ("level");--> statement-breakpoint
CREATE INDEX "lessons_module_idx" ON "lessons" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "questions_quiz_idx" ON "questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quizzes_kind_idx" ON "quizzes" USING btree ("kind","level");--> statement-breakpoint
CREATE INDEX "study_sessions_user_day_idx" ON "study_sessions" USING btree ("user_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");