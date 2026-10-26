/** Kiểu dữ liệu khóa học / bài học trả về từ API (`/api/public/courses…`, `/api/public/lessons…`). */

export type Level = "N5" | "N4" | "N3" | "N2" | "N1";

export type CoverLine = { t: string; c: string; a?: string };
export type CoverStyle = {
  lines: CoverLine[];
  sub?: string;
  deco: string;
  seed: string;
  bg: string;
  tone: string;
  live?: boolean;
};

export type TeacherSummary = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  avatarSeed: string | null;
  avatarBg: string | null;
};

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  level: Level | null;
  category: string;
  goals: string[];
  outcomes: string[];
  tags: string[];
  format: string;
  formats: string[];
  coverUrl: string | null;
  coverStyle: CoverStyle | null;
  badge: string | null;
  price: number;
  salePrice: number | null;
  saleEndsAt: string | null;
  durationHours: number;
  weeks: number | null;
  rating: number;
  ratingCount: number;
  studentCount: number;
  featured: boolean;
  createdAt: string;
  lessonsCount: number;
  firstLessonSlug: string | null;
  teacher: TeacherSummary | null;
};

export type FilterKey = "level" | "goal" | "duration" | "format";

export type CategoryCounts = {
  total: number;
  tabs: { id: string; count: number }[];
  groups: { key: FilterKey; title: string; options: { value: string; label: string; count: number }[] }[];
};

export type LessonRowData = {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  type: "video" | "text" | "quiz";
  durationSec: number;
  isFree: boolean;
  hasDocs: boolean;
  hasExercise: boolean;
  hasVideo: boolean;
  number: number;
  percent: number;
  completed: boolean;
};

export type CourseDetailData = CourseSummary & {
  description: string | null;
  teacher:
    | (TeacherSummary & {
        title: string | null;
        yearsExp: number;
        skills: string[];
        bio: string | null;
        badge: string | null;
        levelRange: string | null;
        rating: number;
      })
    | null;
  effectivePrice: number;
  totalDurationSec: number;
  modules: { id: string; title: string; description: string | null; order: number; durationSec: number; completed: number; lessons: LessonRowData[] }[];
  enrolled: boolean;
  canLearn: boolean;
  progress: { completed: number; total: number; percent: number } | null;
  firstFreeLesson: { slug: string; title: string } | null;
  resumeLesson: { slug: string } | null;
  reviews: {
    avg: number;
    count: number;
    items: { id: string; authorName: string; authorRole: string | null; rating: number; content: string; createdAt: string; avatarUrl: string | null }[];
  };
  resources: { id: string; title: string; fileType: string; sizeBytes: number; isFree: boolean; fileUrl: string | null }[];
};

export type VocabItem = {
  id: string;
  order: number;
  word: string;
  reading: string | null;
  romaji: string | null;
  pos: string | null;
  meaning: string;
  exampleJa: string | null;
  exampleRomaji: string | null;
  exampleVi: string | null;
  saved: boolean;
};

export type TreeLesson = {
  id: string;
  slug: string;
  title: string;
  durationSec: number;
  isFree: boolean;
  type: string;
  number: number;
  percent: number;
  completed: boolean;
  locked: boolean;
};

export type LessonResource = { id: string; title: string; fileUrl: string | null; fileType: string; sizeBytes: number; isFree: boolean };

export type LessonData = {
  lesson: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    type: "video" | "text" | "quiz";
    durationSec: number;
    isFree: boolean;
    hasDocs: boolean;
    hasExercise: boolean;
    quizId: string | null;
    number: number;
    content: string | null;
    grammar: string | null;
  };
  course: { id: string; slug: string; title: string; level: Level | null; coverUrl: string | null };
  module: { id: string; title: string; order: number };
  locked: boolean;
  enrolled: boolean;
  isStaff: boolean;
  video: { id: string; videoId: string | null; youtubeId: string | null; source: "youtube" | "upload"; durationSec: number | null; thumbnailUrl: string | null } | null;
  vocab: VocabItem[];
  vocabCount: number;
  resources: LessonResource[];
  tree: { id: string; title: string; order: number; completed: number; lessons: TreeLesson[] }[];
  progress: { completed: number; total: number; percent: number } | null;
  myProgress: { percent: number; completed: boolean } | null;
  bookmarked: boolean;
  commentsCount: number;
  quiz: { id: string; slug: string; title: string } | null;
  prev: { slug: string; title: string; number: number; locked: boolean } | null;
  next: { slug: string; title: string; number: number; locked: boolean } | null;
};

export type CommentData = {
  id: string;
  parentId: string | null;
  content: string;
  likes: number;
  liked: boolean;
  mine: boolean;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null; role: string };
  replies?: CommentData[];
};

export type NoteData = { id: string; atSec: number; content: string; createdAt: string; lessonId?: string; lesson?: { id: string; slug: string; title: string } };

/* ------------------------------------------------------------------ */
/* Tiện ích hiển thị                                                   */
/* ------------------------------------------------------------------ */

export const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`);

/** 1440 → "24 phút"; 3725 → "1 giờ 2 phút". */
export function minutesLabel(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} phút`;
  return `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ""}`;
}

export const mmss = (sec: number) => {
  const v = Math.max(0, Math.floor(sec));
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const s = String(v % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Giá đang áp dụng (khuyến mãi còn hạn). `now` truyền từ client sau khi mount. */
export function priceOf(c: Pick<CourseSummary, "price" | "salePrice" | "saleEndsAt">, now?: number) {
  const onSale = c.salePrice != null && c.salePrice < c.price && (!c.saleEndsAt || !now || new Date(c.saleEndsAt).getTime() > now);
  return { price: onSale ? c.salePrice! : c.price, original: onSale ? c.price : null, free: (onSale ? c.salePrice! : c.price) === 0 };
}

/** Avatar giáo viên: ảnh thật nếu có, không thì DiceBear. */
export function teacherAvatar(t: Pick<TeacherSummary, "avatarUrl" | "avatarSeed" | "avatarBg" | "name"> | null | undefined, avatarFn: (seed: string, bg?: string) => string) {
  if (!t) return avatarFn("Nihongo");
  return t.avatarUrl || avatarFn(t.avatarSeed || t.name, t.avatarBg || "ffe3e3");
}
