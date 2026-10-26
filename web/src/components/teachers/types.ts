import { avatar } from "../ui";

/** Kiểu dữ liệu & hằng số giao diện trang giáo viên (dữ liệu từ /public/teachers…). */
export type FilterId = "all" | "native" | "jlpt" | "giao-tiep" | "kanji" | "n5n3" | "n2n1";
export type SortId = "popular" | "rating" | "experience" | "name";

export type Teacher = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  avatarSeed: string | null;
  avatarBg: string | null;
  levelRange: string | null;
  badge: string | null;
  native: boolean;
  skills: string[];
  yearsExp: number;
  bio: string | null;
  rating: number;
  reviewCount: number;
  studentCount: number;
  featured: boolean;
};

export type TeacherFull = Teacher & {
  quote: string | null;
  education: string | null;
  highlights: string[];
  completionRate: number;
};

export type Review = {
  id: string;
  authorName: string;
  authorRole: string | null;
  rating: number;
  content: string;
  featured: boolean;
  createdAt: string;
  avatarUrl: string | null;
  teacherName: string | null;
  teacherSlug: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
};

/** Ảnh giáo viên: ảnh tải lên nếu có, không thì avatar minh hoạ. */
export const teacherAvatar = (t: { avatarUrl: string | null; avatarSeed: string | null; name: string; avatarBg?: string | null }, bg = "transparent") =>
  t.avatarUrl || avatar(t.avatarSeed || t.name, bg);

/** "native" → "Bản ngữ"; "N1" giữ nguyên. */
export const badgeLabel = (t: { badge: string | null; native: boolean }) => (t.native || t.badge === "native" ? "Bản ngữ" : (t.badge ?? ""));
