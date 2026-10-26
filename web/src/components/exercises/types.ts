/** Kiểu dữ liệu & hằng số giao diện cho Bài tập / Đề JLPT (dữ liệu thật lấy từ API). */

export type Level = "N5" | "N4" | "N3" | "N2" | "N1";
export type Skill = "vocab" | "grammar" | "kanji" | "listening" | "reading" | "communication" | "jlpt";
export type Difficulty = "easy" | "medium" | "hard";
export type Status = { kind: "done"; score?: number | null } | { kind: "todo" } | { kind: "progress"; value: number };

/** Thẻ bài tập / đề thi trả về từ /public/quizzes. */
export type QuizCard = {
  id: string;
  slug: string;
  kind: "exercise" | "jlpt";
  title: string;
  description: string | null;
  level: Level;
  skill: Skill;
  topic: string | null;
  difficulty: Difficulty;
  durationMin: number;
  icon: string | null;
  emoji: string | null;
  tone: string | null;
  featured: boolean;
  questionCount: number;
  attemptCount: number;
  createdAt: string;
  status: Status;
  bookmarked: boolean;
};

export type QuizOption = { key: string; text: string };
export type QuizHint = { title?: string; body?: string; exampleJa?: string; exampleVi?: string } | null;

export type PlayQuestion = {
  id: string;
  order: number;
  type: "mcq" | "short" | "essay";
  prompt: string;
  translation: string | null;
  options: QuizOption[];
  hint: QuizHint;
  audioText: string | null;
  scene: string | null;
  points: number;
};

export type QuizDetail = {
  quiz: {
    id: string;
    slug: string;
    kind: "exercise" | "jlpt";
    title: string;
    description: string | null;
    level: Level;
    skill: Skill;
    skillLabel: string;
    topic: string | null;
    difficulty: Difficulty;
    durationMin: number;
    passScore: number;
    icon: string | null;
    emoji: string | null;
    tone: string | null;
    status: string;
    bookmarked: boolean;
  };
  questions: PlayQuestion[];
  related: { quizId: string; quizSlug: string; quizTitle: string; level: Level; question: PlayQuestion } | null;
};

export type Feedback = {
  questionId: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string | null;
  explanationLong: string | null;
  answer?: string;
};

export type ReviewItem = {
  questionId: string;
  order: number;
  type: "mcq" | "short" | "essay";
  prompt: string;
  promptText: string;
  translation: string | null;
  options: QuizOption[];
  answer: string | null;
  correctAnswer: string;
  correct: boolean;
  score: number;
  points: number;
  feedback: string | null;
  gradedBy: "auto" | "ai" | "manual" | null;
  explanation: string | null;
  explanationLong: string | null;
};

export type AttemptResult = {
  attemptId: string;
  quizId: string;
  quizSlug: string;
  quizTitle: string;
  status: string;
  score: number;
  rawScore: number;
  maxScore: number;
  accuracy: number;
  right: number;
  wrong: number;
  skipped: number;
  total: number;
  durationSec: number;
  xp: number;
  passed: boolean;
  passScore: number;
  feedback: string | null;
  aiGraded: boolean;
  streak?: number;
  review: ReviewItem[];
};

export const LEVELS: Level[] = ["N5", "N4", "N3", "N2", "N1"];

/** Kỹ năng hiển thị trong bộ lọc client (nhãn giao diện). */
export const SKILL_FILTERS: { id: Skill; label: string }[] = [
  { id: "vocab", label: "Từ vựng" },
  { id: "grammar", label: "Ngữ pháp" },
  { id: "kanji", label: "Kanji" },
  { id: "listening", label: "Luyện nghe" },
  { id: "jlpt", label: "JLPT" },
];

export const SKILL_LABEL: Record<string, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  kanji: "Kanji",
  listening: "Luyện nghe",
  reading: "Đọc hiểu",
  communication: "Giao tiếp",
  jlpt: "JLPT",
};

export const DIFFICULTY: Record<Difficulty, { label: string; tone: string }> = {
  easy: { label: "Dễ", tone: "bg-emerald-50 text-emerald-600" },
  medium: { label: "Trung bình", tone: "bg-amber-50 text-amber-600" },
  hard: { label: "Khó", tone: "bg-rose-50 text-rose-500" },
};

export const SORTS = [
  { id: "new", label: "Mới nhất" },
  { id: "popular", label: "Phổ biến nhất" },
  { id: "short", label: "Thời gian ngắn nhất" },
  { id: "level", label: "Cấp độ N5 → N1" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Chỗ trống trong câu hỏi. */
export const BLANK_RE = /＿＿＿|____+|（\s*★\s*）/;

export const quizHref = (slug: string) => `/bai-tap/${slug}`;

/** Bỏ thẻ HTML + furigana để đọc TTS. */
export function plainJa(html: string, fill = "") {
  return html
    .replace(/<rt>.*?<\/rt>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/＿＿＿|____+/g, fill)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Đọc tiếng Nhật bằng Web Speech API. */
export function speakJa(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = rate;
  const ja = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja"));
  if (ja) u.voice = ja;
  window.speechSynthesis.speak(u);
  return u;
}

/** Cảnh minh hoạ câu hỏi: JSON {bg, sign, seeds, props} hoặc 1 emoji. */
export type Scene = { bg: string; sign: string; seeds: [string, string]; props: string[] };
export function parseScene(scene: string | null): Scene | { emoji: string } | null {
  if (!scene) return null;
  if (scene.trim().startsWith("{")) {
    try {
      return JSON.parse(scene) as Scene;
    } catch {
      return null;
    }
  }
  return { emoji: scene };
}
