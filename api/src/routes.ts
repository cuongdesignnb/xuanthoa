/**
 * Danh sách route (import tĩnh để bundler serverless truy vết được).
 * Thêm file mới trong src/routes/ → thêm một dòng ở đây.
 */
import type { FastifyPluginAsync } from "fastify";
import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import commerceRoutes from "./routes/commerce.js";
import coreRoutes from "./routes/core.js";
import coursesRoutes from "./routes/courses.js";
import courses_adminRoutes from "./routes/courses-admin.js";
import dashboardRoutes from "./routes/dashboard.js";
import homeRoutes from "./routes/home.js";
import lessonsRoutes from "./routes/lessons.js";
import logsRoutes from "./routes/logs.js";
import meRoutes from "./routes/me.js";
import mediaRoutes from "./routes/media.js";
import moderationRoutes from "./routes/moderation.js";
import notificationsRoutes from "./routes/notifications.js";
import orders_adminRoutes from "./routes/orders-admin.js";
import postsRoutes from "./routes/posts.js";
import quizzesRoutes from "./routes/quizzes.js";
import quizzes_adminRoutes from "./routes/quizzes-admin.js";
import reportsRoutes from "./routes/reports.js";
import revenueRoutes from "./routes/revenue.js";
import settingsRoutes from "./routes/settings.js";
import staffRoutes from "./routes/staff.js";
import students_adminRoutes from "./routes/students-admin.js";
import supportRoutes from "./routes/support.js";
import tasksRoutes from "./routes/tasks.js";
import teachersRoutes from "./routes/teachers.js";
import videosRoutes from "./routes/videos.js";

export const routes: FastifyPluginAsync[] = [
  aiRoutes,
  authRoutes,
  commerceRoutes,
  coreRoutes,
  coursesRoutes,
  courses_adminRoutes,
  dashboardRoutes,
  homeRoutes,
  lessonsRoutes,
  logsRoutes,
  meRoutes,
  mediaRoutes,
  moderationRoutes,
  notificationsRoutes,
  orders_adminRoutes,
  postsRoutes,
  quizzesRoutes,
  quizzes_adminRoutes,
  reportsRoutes,
  revenueRoutes,
  settingsRoutes,
  staffRoutes,
  students_adminRoutes,
  supportRoutes,
  tasksRoutes,
  teachersRoutes,
  videosRoutes,
];
