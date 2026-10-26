/** Kiểu dữ liệu trả về từ GET /api/me/dashboard và /api/me/plan. */

export type PlanItem = { id: string; day: string; title: string; kind: string; minutes: number; done: boolean };
export type PlanDay = { date: string; label: string; short: string; status: "done" | "today" | "todo" | "missed"; minutes: number; lessons: number };
export type SkillShare = { skill: string; label: string; minutes: number; lessons: number; percent: number };

export type WeekPlan = {
  offset: number;
  start: string;
  end: string;
  today: string;
  days: PlanDay[];
  items: PlanItem[];
  skills: SkillShare[];
  totalMinutes: number;
};

export type ChartBar = { label: string; sub: string; minutes: number; lessons: number };

export type DashboardData = {
  user: { id: string; name: string; avatarUrl: string | null; role: string; level: string | null; targetLevel: string | null; targetDate: string | null; xp: number };
  progress: { percent: number; completed: number; total: number };
  streak: number;
  nextLesson: { slug: string; title: string; position: number; level: string | null; tag: string; minutes: number; when: string } | null;
  goal: { level: string | null; date: string | null; percent: number };
  badges: { earned: number; total: number };
  currentCourse: {
    id: string;
    slug: string;
    title: string;
    level: string | null;
    category: string;
    percent: number;
    completed: number;
    total: number;
    lesson: { slug: string; title: string; position: number; percent: number };
    counts: { videoMin: number; exercises: number; vocab: number };
  } | null;
  plan: WeekPlan;
  /** Thời gian học theo kỹ năng trong 7 ngày gần nhất. */
  skills: { items: SkillShare[]; totalMinutes: number };
  chart: { week: ChartBar[]; month: ChartBar[]; skill: ChartBar[] };
  recentLessons: { slug: string; title: string; courseTitle: string; level: string | null; tag: string; percent: number; updatedAt: string }[];
  savedVocab: { items: { id: string; word: string; reading: string | null; meaning: string; pos: string | null }[]; total: number };
  suggested: { slug: string; title: string; skill: string; skillLabel: string; level: string; durationMin: number; questions: number }[];
  achievements: { code: string; title: string; description: string | null; icon: string | null; tone: string | null; earned: boolean; earnedAt: string | null }[];
};

/** "Bài 15: で…" giữ nguyên; tiêu đề không có tiền tố thì thêm "Bài N: ". */
export const lessonLabel = (title: string, position?: number) =>
  /^bài\s*\d+/i.test(title) || !position ? title : `Bài ${position}: ${title}`;

const JP = /([぀-ヿ㐀-鿿～～・ー]+)/;

/** Bọc các đoạn tiếng Nhật trong tiêu đề bằng font-jp. */
export function JpText({ text }: { text: string }) {
  return (
    <>
      {text.split(JP).map((part, i) =>
        JP.test(part) ? (
          <span key={i} className="font-jp">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** "Hôm nay" / "1 ngày trước" … (so với ngày lịch). */
export function relDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.round((b - a) / 86400000);
  if (n <= 0) return "Hôm nay";
  if (n < 30) return `${n} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

/** "Nguyễn Minh Anh" → "Minh Anh" (tên gọi thân mật). */
export const callName = (name: string) => {
  const w = name.trim().split(/\s+/);
  return w.length >= 3 ? w.slice(-2).join(" ") : name;
};
