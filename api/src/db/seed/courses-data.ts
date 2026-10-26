/**
 * Dữ liệu khóa học / chương trình học cho seed 10-courses (chuyển từ dữ liệu tạm ở client).
 */

export type Lvl = "N5" | "N4" | "N3" | "N2" | "N1";
export type Kind = "Video" | "Tài liệu" | "Bài tập" | "Mini test";
export type LessonSpec = { t: string; dur: number; kinds?: Kind[]; free?: boolean };
export type ModuleSpec = { title: string; desc?: string; lessons: LessonSpec[] };
export type CoverStyle = {
  lines: { t: string; c: string; a?: string }[];
  sub?: string;
  deco: string;
  seed: string;
  bg: string;
  tone: string;
  live?: boolean;
};
export type CourseSpec = {
  slug: string;
  /** tiền tố slug bài học */
  key: string;
  title: string;
  subtitle: string;
  description: string;
  level: Lvl;
  category: string;
  tags: string[];
  goals: string[];
  outcomes: string[];
  formats: string[];
  teacher: string;
  durationHours: number;
  weeks: number;
  rating: number;
  ratingCount: number;
  studentCount: number;
  badge?: string;
  price: number;
  salePrice?: number;
  /** số giờ kể từ lúc seed tới khi hết khuyến mãi */
  saleHours?: number;
  featured?: boolean;
  /** độ "mới" (lớn = mới hơn) → createdAt */
  added: number;
  cover: CoverStyle;
  /** chủ đề video YouTube */
  videoTheme: keyof typeof YT;
  modules: ModuleSpec[];
};

/** Video YouTube bài giảng tiếng Nhật đã kiểm tra (oEmbed 200) + thời lượng thật (giây). */
export const YT = {
  teForm: [["HAdmKhVjVs8", 687, "The ULTIMATE Japanese Te-Form CHEAT SHEET"], ["WKVNwxcGw_0", 944, "How to make the te-form | Japanese verb conjugation"]],
  kana: [["6p9Il_j0zjc", 3871, "Learn ALL Hiragana in 1 Hour"], ["s6DKRgtVLGA", 3693, "Learn ALL Katakana in 1 Hour"], ["4IzFp5-wCzg", 1462, "Katakana: Learn with Mnemonics"]],
  n5: [["wDpsF90DoeI", 913, "Minna No Nihongo Lesson 1 Vocabulary"], ["gi2AeYO-g8E", 1218, "Minna No Nihongo Lesson 1 Grammar"], ["TIOQWToGxz4", 562, "JLPT N5 Grammar #1 – X is Y"], ["lrzt2DpkkdY", 728, "JLPT N5 Grammar #2 – X is Y (Advanced)"]],
  n4: [["5Yt6Eo40GQ4", 4502, "JLPT N4 Grammar Explained in 1 Hour"], ["1hTBL59rack", 934, "Minna No Nihongo Lesson 26 Vocabulary"], ["Ly3Tn2MkHIQ", 1056, "Minna No Nihongo Lesson 26 Grammar"]],
  listening: [["-M5HGD6fhy4", 300, "A Casual Phone Call with a Friend | Japanese Conversation"], ["BgKkcC-0_3o", 208, "Ordering Fast Food in Japanese"], ["hPvXSjQwIho", 1384, "A Day in Ginza in Kimono | Japanese Listening Practice"]],
  kanji: [["mPppVDX_GiY", 2618, "Learn Kanji in 45 minutes"], ["j8YwW-tj1WQ", 1640, "Kanji practice for N5 (JLPT)"], ["UCbKbglhLC4", 1130, "Kanji N5 | Lesson 1 Numbers"], ["RKWrWRFyfYo", 1114, "Japanese Kanji 101"]],
  keigo: [["SnmEXprKUqs", 655, "Keigo Explained: Formal/Business Japanese"], ["753jLcYwjhc", 581, "Formal vs Informal Japanese: Keigo"], ["ukPCxbxpBVc", 1336, "Introduction to Japanese Keigo"], ["naC7TNnB9iA", 830, "Introduction to Japanese Keigo Part 2"]],
  n3: [["c6igB53eBjE", 467, "JLPT Level N3 - 20 Must-Know Grammar Points"], ["wSZD7H_5eLQ", 155, "JLPT Level N3 Grammar Point - というより"], ["MIbLOWOe7yY", 1262, "JLPT N3 Grammar Test #01"], ["WHDsFC_5kCM", 1194, "JLPT N3 Grammar Test #02"]],
  n2: [["dUk38cYzGYo", 4090, "1時間でJLPT N2文法"], ["c6igB53eBjE", 467, "JLPT Level N3 - 20 Must-Know Grammar Points"]],
  n1: [["JIZ49pjJmR8", 4396, "1時間でJLPT N1文法"], ["716-X7hVyZs", 488, "N1文法 #18〜であれ〜であれ"], ["AbWp8G4qpV0", 584, "N1文法 #17〜なり〜なり"]],
  travel: [["_f-ICIgfJ0c", 1078, "25 MUST-KNOW Phrases when Traveling to Japan"], ["BgKkcC-0_3o", 208, "Ordering Fast Food in Japanese"]],
} satisfies Record<string, [string, number, string][]>;

const VTB: Kind[] = ["Video", "Tài liệu", "Bài tập"];
const VB: Kind[] = ["Video", "Bài tập"];
const TEST: Kind[] = ["Bài tập", "Mini test"];
const MT: Kind[] = ["Mini test"];

/** "12:45" → giây */
const mmss = (s: string) => {
  const [m, ss] = s.split(":").map(Number);
  return m * 60 + (ss || 0);
};

/** Tạo chương nhanh: tiêu đề bài, thời lượng phút xoay vòng, bài cuối là bài kiểm tra. */
function mod(title: string, desc: string, titles: string[], base = 16): ModuleSpec {
  return {
    title,
    desc,
    lessons: titles.map((t, i) => {
      const isTest = /^(Kiểm tra|Đề |Mini test|Thi thử)/.test(t);
      const isPractice = /^(Luyện tập|Bài tập|Ôn tập)/.test(t);
      return {
        t,
        dur: (isTest ? 30 : base + ((i * 7) % 11)) * 60 + (i % 2 ? 30 : 0),
        kinds: isTest ? MT : isPractice ? TEST : i % 3 === 2 ? VB : VTB,
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Ngữ pháp N4 – chương trình từ trang chi tiết khóa học               */
/* ------------------------------------------------------------------ */

const N4_MODULES: ModuleSpec[] = [
  {
    title: "Làm quen với ngữ pháp N4",
    desc: "Nắm vững nền tảng và cách sử dụng cơ bản",
    lessons: [
      { t: "Giới thiệu về ngữ pháp N4", dur: mmss("12:45"), kinds: VTB, free: true },
      { t: "Cách chia thể trong tiếng Nhật", dur: mmss("18:20"), kinds: VTB },
      { t: "Trợ từ cơ bản (は・が・を)", dur: mmss("15:10"), kinds: VTB },
      { t: "Cấu trúc câu cơ bản", dur: mmss("20:15"), kinds: VTB },
      { t: "Luyện tập tổng hợp", dur: mmss("18:30"), kinds: TEST },
      { t: "Kiểm tra chương 1", dur: mmss("10:00"), kinds: MT },
    ],
  },
  {
    title: "Các mẫu ngữ pháp trọng tâm",
    desc: "Các mẫu ngữ pháp thường gặp trong JLPT N4",
    lessons: [
      "Thể て và cách dùng",
      "Mẫu ～てもいいです / ～てはいけません",
      "Thể ない và ～なければなりません",
      "Thể từ điển và ～ことができます",
      "Thể た và ～たことがあります",
      "Mẫu ～たり～たりします",
      "Thể ý chí ～よう",
      "Câu điều kiện ～たら / ～ば",
      "Luyện tập tổng hợp",
      "Kiểm tra chương 2",
    ].map((t, i) => ({ t, dur: mmss(`${14 + ((i * 3) % 9)}:${i % 2 ? "40" : "05"}`), kinds: i >= 8 ? TEST : VTB })),
  },
  {
    title: "Ngữ pháp theo chủ đề giao tiếp",
    desc: "Ứng dụng trong tình huống thực tế",
    lessons: [
      "Nhờ vả lịch sự ～てください",
      "Cho và nhận ～あげる・くれる・もらう",
      "Kính ngữ cơ bản",
      "Khiêm nhường ngữ cơ bản",
      "Diễn tả dự định ～つもり",
      "Phỏng đoán ～でしょう・かもしれない",
      "Truyền đạt lại ～そうです",
      "So sánh ～より・～ほど",
      "Hội thoại tại cửa hàng",
      "Hội thoại tại công ty",
      "Luyện tập tổng hợp",
      "Kiểm tra chương 3",
    ].map((t, i) => ({ t, dur: mmss(`${12 + ((i * 5) % 10)}:${i % 2 ? "15" : "50"}`), kinds: i >= 10 ? TEST : VTB })),
  },
  {
    title: "Luyện tập và củng cố",
    desc: "Bài tập tổng hợp và đề minh họa",
    lessons: Array.from({ length: 10 }, (_, i) => ({
      t: i < 8 ? `Bài tập tổng hợp ${i + 1}` : `Đề minh họa ${i - 7}`,
      dur: (20 + i) * 60,
      kinds: i < 8 ? (["Bài tập"] as Kind[]) : MT,
    })),
  },
  {
    title: "Tổng ôn và kiểm tra cuối khóa",
    desc: "Hệ thống lại kiến thức và làm đề JLPT N4",
    lessons: Array.from({ length: 10 }, (_, i) => ({
      t: i < 6 ? `Tổng ôn chủ điểm ${i + 1}` : i < 9 ? `Đề thi thử JLPT N4 số ${i - 5}` : "Kiểm tra cuối khóa",
      dur: i < 6 ? (18 + i) * 60 + 30 : 45 * 60,
      kinds: i < 6 ? VTB : MT,
    })),
  },
];

/* ------------------------------------------------------------------ */
/* N5 – Tiếng Nhật cơ bản (trang học bài 12)                           */
/* ------------------------------------------------------------------ */

const N5_MODULES: ModuleSpec[] = [
  {
    title: "Chương 1: Bảng chữ cái",
    desc: "Hiragana, Katakana và cách phát âm chuẩn",
    lessons: [
      { t: "Hiragana hàng あ – な", dur: 18 * 60, kinds: VTB, free: true },
      { t: "Hiragana hàng は – ん", dur: 20 * 60, kinds: VTB, free: true },
      { t: "Katakana và từ mượn", dur: 22 * 60, kinds: VTB },
      { t: "Âm đục, âm ghép, trường âm", dur: 19 * 60, kinds: VTB },
      { t: "Bài tập tổng hợp chương 1", dur: 25 * 60, kinds: TEST },
    ],
  },
  {
    title: "Chương 2: Chào hỏi & số đếm",
    desc: "Mẫu câu giao tiếp đầu tiên",
    lessons: [
      { t: "Chào hỏi hằng ngày", dur: 16 * 60, kinds: VTB },
      { t: "Giới thiệu bản thân với です", dur: 20 * 60, kinds: VTB },
      { t: "Số đếm, tuổi và số điện thoại", dur: 21 * 60, kinds: VTB },
      { t: "Giờ giấc, ngày tháng", dur: 23 * 60, kinds: VTB },
    ],
  },
  {
    title: "Chương 3: Động từ và thể",
    desc: "Các nhóm động từ và cách chia",
    lessons: [
      { t: "Động từ nhóm 1, 2, 3", dur: 18 * 60, kinds: VTB },
      { t: "Thể ます (Masu-form)", dur: 22 * 60, kinds: VTB },
      { t: "Thể て (Te-form)", dur: 24 * 60, kinds: VTB },
      { t: "Thể た (Ta-form)", dur: 20 * 60, kinds: VTB },
      { t: "Thể ない (Nai-form)", dur: 26 * 60, kinds: VTB },
      { t: "Bài tập tổng hợp chương 3", dur: 30 * 60, kinds: TEST },
    ],
  },
  {
    title: "Chương 4: Tính từ",
    desc: "Tính từ đuôi い, đuôi な và so sánh",
    lessons: [
      { t: "Tính từ đuôi い", dur: 20 * 60, kinds: VTB },
      { t: "Tính từ đuôi な", dur: 20 * 60, kinds: VTB },
      { t: "Thể phủ định của tính từ", dur: 18 * 60, kinds: VTB },
      { t: "Thể quá khứ của tính từ", dur: 22 * 60, kinds: VTB },
      { t: "So sánh hơn, so sánh nhất", dur: 24 * 60, kinds: VTB },
      { t: "Bài tập tổng hợp chương 4", dur: 30 * 60, kinds: TEST },
    ],
  },
  {
    title: "Chương 5: Trợ từ",
    desc: "Các trợ từ cơ bản trong câu",
    lessons: [
      { t: "Trợ từ は và が", dur: 22 * 60, kinds: VTB },
      { t: "Trợ từ を", dur: 16 * 60, kinds: VTB },
      { t: "Trợ từ に", dur: 20 * 60, kinds: VTB },
      { t: "Trợ từ で", dur: 20 * 60, kinds: VTB },
      { t: "Trợ từ へ", dur: 14 * 60, kinds: VTB },
      { t: "Trợ từ と・や", dur: 18 * 60, kinds: VTB },
      { t: "Bài tập tổng hợp chương 5", dur: 30 * 60, kinds: TEST },
    ],
  },
  {
    title: "Chương 6: Hội thoại giao tiếp",
    desc: "Tình huống thực tế hằng ngày",
    lessons: [
      { t: "Chào hỏi & giới thiệu", dur: 20 * 60, kinds: VTB },
      { t: "Mua sắm", dur: 22 * 60, kinds: VTB },
      { t: "Hỏi đường", dur: 20 * 60, kinds: VTB },
      { t: "Tại nhà hàng", dur: 24 * 60, kinds: VTB },
      { t: "Bài tập tổng hợp chương 6", dur: 30 * 60, kinds: TEST },
    ],
  },
];

/* ------------------------------------------------------------------ */

const P = (s: string) => s; // giữ chuỗi class nguyên văn

export const COURSES: CourseSpec[] = [
  /* ---------------------- Khóa theo cấp độ (trang chủ) ---------------------- */
  {
    slug: "n5-tieng-nhat-co-ban",
    key: "n5",
    title: "N5 - Tiếng Nhật cơ bản",
    subtitle: "Dành cho người mới bắt đầu",
    description:
      "<p>Khóa học nền tảng cho người mới bắt đầu: làm quen bảng chữ cái <span lang=\"ja\">ひらがな・カタカナ</span>, phát âm chuẩn, từ vựng và ngữ pháp N5 qua video bài giảng sinh động.</p><p>Mỗi bài học đều có từ vựng, ngữ pháp, bài tập và khu vực thảo luận cùng giáo viên.</p>",
    level: "N5",
    category: "level",
    tags: [],
    goals: ["Học từ đầu", "Giao tiếp hằng ngày"],
    outcomes: ["Hiragana, Katakana", "Từ vựng cơ bản", "Giao tiếp hằng ngày", "Chia động từ thể ます, て, た, ない", "Tự tin làm đề JLPT N5"],
    formats: ["Video bài giảng", "Lộ trình tự học"],
    teacher: "mai",
    durationHours: 28,
    weeks: 10,
    rating: 4.9,
    ratingCount: 1024,
    studentCount: 15800,
    badge: "Phổ biến",
    price: 459000,
    salePrice: 299000,
    saleHours: 24 * 5 + 6,
    featured: true,
    added: 13,
    videoTheme: "n5",
    cover: {
      lines: [
        { t: "N5", c: P("text-5xl sm:text-6xl font-black text-rose-500") },
        { t: "Tiếng Nhật", c: P("text-xl font-extrabold text-brand-600") },
        { t: "cơ bản", c: P("text-xl font-extrabold text-brand-600") },
      ],
      deco: "torii",
      seed: "Yuki",
      bg: "ffd6dc",
      tone: "from-[#ffe9ec] via-[#fff5f6] to-[#ffdfe4]",
    },
    modules: N5_MODULES,
  },
  {
    slug: "ngu-phap-n4",
    key: "n4",
    title: "Ngữ pháp N4 - Xây nền tảng vững chắc",
    subtitle: "Xây nền tảng vững chắc",
    description:
      "<p>Nắm vững toàn bộ ngữ pháp N4 một cách hệ thống, dễ hiểu, có ví dụ thực tế và bài tập phong phú. Khóa học giúp bạn xây nền tảng vững chắc để tự tin giao tiếp và kỳ thi JLPT N4.</p>",
    level: "N4",
    category: "level",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT", "Đọc hiểu - Viết"],
    outcomes: [
      "Nắm vững 100+ mẫu ngữ pháp N4 quan trọng",
      "Hiểu rõ cách sử dụng và ngữ cảnh thực tế",
      "Luyện tập với nhiều ví dụ và tình huống giao tiếp",
      "Làm chủ bài tập và đề thi JLPT N4",
      "Áp dụng ngữ pháp vào hội thoại và viết đoạn văn ngắn",
    ],
    formats: ["Video bài giảng", "Kết hợp (Blended)"],
    teacher: "mai",
    durationHours: 24,
    weeks: 12,
    rating: 4.9,
    ratingCount: 1200,
    studentCount: 8200,
    badge: "Mới",
    price: 349000,
    salePrice: 199000,
    saleHours: 2 * 24 + 15.5,
    featured: true,
    added: 11,
    videoTheme: "n4",
    cover: {
      lines: [
        { t: "N4", c: P("text-5xl sm:text-6xl font-black text-emerald-600") },
        { t: "Ngữ pháp", c: P("text-xl font-extrabold text-brand-500") },
        { t: "xây nền tảng vững chắc", c: P("text-[10px] font-bold text-brand-600") },
      ],
      deco: "pagoda",
      seed: "Minh",
      bg: "dbeafe",
      tone: "from-[#fff4f0] via-[#fffaf7] to-[#ffe4e6]",
    },
    modules: N4_MODULES,
  },
  {
    slug: "n3-trung-cap",
    key: "n3",
    title: "N3 - Tự tin giao tiếp, làm việc",
    subtitle: "Tự tin giao tiếp, làm việc",
    description: "<p>Ngữ pháp trung cấp, kỹ năng nghe – đọc và giao tiếp trong tình huống thực tế để tự tin học tập, làm việc cùng người Nhật.</p>",
    level: "N3",
    category: "level",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT", "Giao tiếp hằng ngày"],
    outcomes: ["Ngữ pháp trung cấp", "Kỹ năng nghe đọc", "Giao tiếp tình huống thực tế", "Sẵn sàng thi JLPT N3"],
    formats: ["Video bài giảng", "Kết hợp (Blended)"],
    teacher: "thao",
    durationHours: 40,
    weeks: 16,
    rating: 4.8,
    ratingCount: 512,
    studentCount: 6100,
    price: 599000,
    salePrice: 459000,
    added: 9,
    videoTheme: "n3",
    cover: {
      lines: [
        { t: "N3", c: P("text-5xl sm:text-6xl font-black text-emerald-600") },
        { t: "Trung cấp", c: P("text-xl font-extrabold text-ink") },
      ],
      sub: "Giao tiếp - Làm việc",
      deco: "office",
      seed: "Thao-Bui",
      bg: "d1fae5",
      tone: "from-[#ecfbf3] via-[#f9fffb] to-[#ffe8ec]",
    },
    modules: [
      mod("Ngữ pháp trung cấp I", "Mẫu câu điều kiện, giả định", ["Mẫu ～ように", "Mẫu ～ために", "Mẫu ～ばかり", "Mẫu ～ところ", "Mẫu ～はずだ", "Luyện tập tổng hợp", "Kiểm tra chương 1"]),
      mod("Ngữ pháp trung cấp II", "Bị động, sai khiến, kính ngữ", ["Thể bị động", "Thể sai khiến", "Thể sai khiến bị động", "Kính ngữ trong công việc", "Luyện tập tổng hợp", "Kiểm tra chương 2"]),
      mod("Kỹ năng nghe – đọc", "Chiến lược làm bài đọc hiểu, nghe hiểu", ["Đọc hiểu đoạn văn ngắn", "Đọc hiểu thông báo, email", "Nghe hiểu điểm chính", "Nghe hiểu ứng đáp nhanh", "Luyện tập tổng hợp"]),
      mod("Giao tiếp tình huống", "Ứng dụng tại nơi làm việc", ["Báo cáo – liên lạc – thảo luận", "Gọi điện thoại công việc", "Phỏng vấn xin việc", "Đề thi thử JLPT N3", "Kiểm tra cuối khóa"]),
    ],
  },
  {
    slug: "n2-nang-cao",
    key: "n2",
    title: "N2 - Hướng tới môi trường chuyên nghiệp",
    subtitle: "Hướng tới môi trường chuyên nghiệp",
    description: "<p>Ngữ pháp nâng cao, đọc hiểu tài liệu dài và nghe hiểu nội dung thực tế — hành trang cho môi trường làm việc chuyên nghiệp.</p>",
    level: "N2",
    category: "level",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT", "Tiếng Nhật cho công việc"],
    outcomes: ["Ngữ pháp nâng cao", "Đọc hiểu tài liệu dài", "Nghe hiểu nội dung thực tế", "Chiến lược đạt N2"],
    formats: ["Video bài giảng", "Lớp học trực tuyến"],
    teacher: "ha",
    durationHours: 56,
    weeks: 20,
    rating: 4.8,
    ratingCount: 302,
    studentCount: 3400,
    price: 799000,
    added: 7,
    videoTheme: "n2",
    cover: {
      lines: [
        { t: "N2", c: P("text-5xl sm:text-6xl font-black text-sky-600") },
        { t: "Nâng cao", c: P("text-xl font-extrabold text-ink") },
      ],
      sub: "Chuyên nghiệp - Hiệu quả",
      deco: "book",
      seed: "Ha-Le-sensei",
      bg: "dbeafe",
      tone: "from-[#eaf3ff] via-[#f8fbff] to-[#ffe8ec]",
    },
    modules: [
      mod("Ngữ pháp N2 trọng tâm", "Các mẫu câu hay ra đề", ["Mẫu ～にかかわらず", "Mẫu ～に限って", "Mẫu ～ものの", "Mẫu ～わけにはいかない", "Mẫu ～かねない", "Luyện tập tổng hợp", "Kiểm tra chương 1"], 20),
      mod("Đọc hiểu tài liệu dài", "Báo chí, bài luận, văn bản hành chính", ["Kỹ thuật đọc lướt", "Phân tích bài luận", "Đọc hiểu báo chí", "Đọc so sánh hai văn bản", "Luyện tập tổng hợp"], 22),
      mod("Nghe hiểu thực tế", "Tin tức, hội thoại công sở", ["Nghe tin tức", "Nghe hội thoại công sở", "Nghe hiểu tổng hợp", "Đề thi thử JLPT N2", "Kiểm tra cuối khóa"], 22),
    ],
  },
  {
    slug: "n1-chuyen-sau",
    key: "n1",
    title: "N1 - Chinh phục trình độ cao nhất",
    subtitle: "Chinh phục trình độ cao nhất",
    description: "<p>Hiểu tài liệu học thuật, từ vựng chuyên sâu và sẵn sàng cho công việc, du học tại Nhật Bản.</p>",
    level: "N1",
    category: "level",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT", "Tiếng Nhật cho công việc"],
    outcomes: ["Hiểu tài liệu học thuật", "Từ vựng chuyên sâu", "Sẵn sàng cho công việc & du học", "Chiến lược đạt điểm cao N1"],
    formats: ["Kết hợp (Blended)", "Lớp học trực tuyến"],
    teacher: "minh",
    durationHours: 72,
    weeks: 24,
    rating: 4.9,
    ratingCount: 205,
    studentCount: 2100,
    price: 999000,
    salePrice: 849000,
    saleHours: 24 * 9,
    added: 5,
    videoTheme: "n1",
    cover: {
      lines: [
        { t: "N1", c: P("text-6xl font-black text-violet-600") },
        { t: "Chuyên sâu", c: P("text-lg font-extrabold text-violet-700") },
      ],
      deco: "pagoda",
      seed: "Minh",
      bg: "ede9fe",
      tone: "from-[#f3efff] via-[#fbf9ff] to-[#ffe8ec]",
    },
    modules: [
      mod("Ngữ pháp N1 học thuật", "Mẫu câu văn viết, trang trọng", ["Mẫu ～であれ～であれ", "Mẫu ～なり～なり", "Mẫu ～をもって", "Mẫu ～ならでは", "Mẫu ～に即して", "Luyện tập tổng hợp", "Kiểm tra chương 1"], 22),
      mod("Từ vựng chuyên sâu", "Từ Hán – Nhật, thành ngữ", ["Từ Hán – Nhật trong văn bản", "Thành ngữ 四字熟語", "Từ đồng nghĩa dễ nhầm", "Luyện tập tổng hợp"], 20),
      mod("Đọc – nghe nâng cao", "Bài giảng, tranh luận, tài liệu học thuật", ["Đọc tài liệu học thuật", "Nghe bài giảng đại học", "Nghe tranh luận", "Đề thi thử JLPT N1", "Kiểm tra cuối khóa"], 24),
    ],
  },

  /* ---------------------- Danh mục khóa học ---------------------- */
  {
    slug: "n5-nguoi-moi",
    key: "n5nm",
    title: "N5 cho người mới bắt đầu",
    subtitle: "Làm quen với bảng chữ cái, phát âm, từ vựng và ngữ pháp cơ bản.",
    description: "<p>Làm quen với bảng chữ cái, phát âm, từ vựng và ngữ pháp cơ bản qua bài giảng ngắn gọn, dễ nhớ.</p>",
    level: "N5",
    category: "basic",
    tags: [],
    goals: ["Học từ đầu"],
    outcomes: ["Đọc viết thành thạo Hiragana, Katakana", "800 từ vựng N5", "Ngữ pháp N5 cốt lõi"],
    formats: ["Video bài giảng", "Lộ trình tự học"],
    teacher: "mai",
    durationHours: 40,
    weeks: 12,
    rating: 4.9,
    ratingCount: 892,
    studentCount: 12500,
    badge: "Phổ biến",
    price: 399000,
    salePrice: 299000,
    added: 3,
    videoTheme: "n5",
    cover: {
      lines: [
        { t: "N5", c: P("text-5xl sm:text-6xl font-black text-brand-500") },
        { t: "cho người", c: P("text-xl font-extrabold text-brand-600 -rotate-3") },
        { t: "mới bắt đầu", c: P("text-xl font-extrabold text-brand-600 -rotate-3") },
      ],
      deco: "torii",
      seed: "Yuki",
      bg: "ffd6dc",
      tone: "from-[#ffe9ec] via-[#fff5f6] to-[#ffdfe4]",
    },
    modules: [
      mod("Bảng chữ cái", "Hiragana & Katakana", ["Hiragana cơ bản", "Katakana cơ bản", "Âm đục và âm ghép", "Luyện tập tổng hợp"]),
      mod("Từ vựng N5", "Theo chủ đề quen thuộc", ["Gia đình", "Trường học", "Đồ ăn thức uống", "Thời gian", "Luyện tập tổng hợp"]),
      mod("Ngữ pháp N5", "Mẫu câu nền tảng", ["Câu khẳng định ～です", "Câu hỏi ～ですか", "Động từ ～ます", "Tính từ cơ bản", "Kiểm tra cuối khóa"]),
    ],
  },
  {
    slug: "luyen-nghe-giao-tiep",
    key: "nghe",
    title: "Luyện nghe giao tiếp hằng ngày",
    subtitle: "Rèn luyện kỹ năng nghe với hội thoại thực tế, phát âm tự nhiên, phản xạ nhanh.",
    description: "<p>Rèn luyện kỹ năng nghe với hội thoại thực tế, phát âm tự nhiên, phản xạ nhanh cùng giáo viên bản ngữ.</p>",
    level: "N4",
    category: "communication",
    tags: ["Giao tiếp"],
    goals: ["Giao tiếp hằng ngày"],
    outcomes: ["Nghe hiểu hội thoại tốc độ tự nhiên", "Phản xạ nhanh trong giao tiếp", "Phát âm chuẩn ngữ điệu"],
    formats: ["Video bài giảng", "Lớp học trực tuyến"],
    teacher: "sato",
    durationHours: 24,
    weeks: 8,
    rating: 4.9,
    ratingCount: 721,
    studentCount: 10100,
    badge: "Phổ biến",
    price: 449000,
    salePrice: 349000,
    added: 6,
    videoTheme: "listening",
    cover: {
      lines: [
        { t: "Luyện nghe", c: P("text-2xl font-extrabold text-ink") },
        { t: "giao tiếp", c: P("text-2xl font-extrabold text-ink") },
        { t: "hằng ngày", c: P("text-2xl font-extrabold text-ink") },
      ],
      deco: "headphones",
      seed: "Ayaka",
      bg: "fbcfe8",
      tone: "from-[#fdecef] via-[#fff7f8] to-[#fde2e7]",
      live: true,
    },
    modules: [
      mod("Hội thoại đời sống", "Nghe – nhắc lại theo tình huống", ["Gọi điện cho bạn bè", "Đặt món ăn nhanh", "Đi mua sắm", "Hỏi đường", "Luyện tập tổng hợp"], 12),
      mod("Ngữ điệu & phản xạ", "Shadowing và phản xạ nhanh", ["Kỹ thuật shadowing", "Ngữ điệu câu hỏi", "Rút gọn âm trong văn nói", "Luyện tập tổng hợp"], 12),
      mod("Nghe hiểu tốc độ thật", "Video, vlog, phỏng vấn", ["Vlog một ngày ở Ginza", "Phỏng vấn đường phố", "Tin tức dễ hiểu", "Kiểm tra cuối khóa"], 14),
    ],
  },
  {
    slug: "kanji-chu-de",
    key: "kanji",
    title: "Kanji theo chủ đề",
    subtitle: "Học Kanji theo chủ đề, phương pháp ghi nhớ hiệu quả và dễ áp dụng.",
    description: "<p>Học Kanji theo chủ đề với câu chuyện, bộ thủ và mẹo ghi nhớ — áp dụng ngay vào đọc hiểu.</p>",
    level: "N4",
    category: "kanji",
    tags: ["Kanji"],
    goals: ["Kanji - Hán tự"],
    outcomes: ["300 Kanji N5 – N4", "Ghi nhớ bằng bộ thủ", "Đọc âm On/Kun"],
    formats: ["Video bài giảng", "Lộ trình tự học"],
    teacher: "minh",
    durationHours: 20,
    weeks: 8,
    rating: 4.8,
    ratingCount: 430,
    studentCount: 7500,
    price: 299000,
    added: 5,
    videoTheme: "kanji",
    cover: {
      lines: [
        { t: "Kanji", c: P("text-5xl font-black text-emerald-800") },
        { t: "theo chủ đề", c: P("text-xl font-extrabold text-ink") },
      ],
      deco: "kanji",
      seed: "Daruma",
      bg: "fee2e2",
      tone: "from-[#fbf3ea] via-[#fffaf4] to-[#fde7e9]",
    },
    modules: [
      mod("Kanji nhập môn", "Bộ thủ và nét viết", ["Kanji là gì?", "Bộ thủ thường gặp", "Thứ tự nét viết", "Luyện tập tổng hợp"]),
      mod("Kanji theo chủ đề", "Số, thời gian, con người", ["Số đếm 一二三", "Thời gian 日月年", "Con người 人口目", "Thiên nhiên 山川木", "Luyện tập tổng hợp"]),
      mod("Kanji trong đời sống", "Biển báo, thực đơn", ["Biển báo nơi công cộng", "Thực đơn nhà hàng", "Kiểm tra cuối khóa"]),
    ],
  },
  {
    slug: "jlpt-n3",
    key: "jn3",
    title: "Luyện thi JLPT N3",
    subtitle: "Tổng hợp kiến thức trọng tâm, đề thi thử và chiến lược làm bài hiệu quả.",
    description: "<p>Tổng hợp kiến thức trọng tâm, đề thi thử và chiến lược làm bài hiệu quả cho kỳ thi JLPT N3.</p>",
    level: "N3",
    category: "jlpt",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT"],
    outcomes: ["Nắm chắc cấu trúc đề N3", "Chiến lược phân bổ thời gian", "5 đề thi thử có giải thích"],
    formats: ["Video bài giảng", "Kết hợp (Blended)"],
    teacher: "mai",
    durationHours: 45,
    weeks: 14,
    rating: 4.9,
    ratingCount: 678,
    studentCount: 9800,
    badge: "Phổ biến",
    price: 699000,
    salePrice: 499000,
    saleHours: 24 * 3,
    added: 8,
    videoTheme: "n3",
    cover: {
      lines: [
        { t: "Luyện thi", c: P("text-xl font-extrabold text-ink") },
        { t: "JLPT", a: "N3", c: P("text-4xl font-black text-brand-500") },
      ],
      sub: "Chiến lược - Bài tập - Đề thi thử",
      deco: "jlpt",
      seed: "Exam",
      bg: "e0f2fe",
      tone: "from-[#eef6ff] via-[#fff8f8] to-[#ffe6ea]",
    },
    modules: [
      mod("Từ vựng & Kanji N3", "Từ vựng trọng tâm theo đề", ["Kanji N3 hay ra đề", "Từ vựng theo chủ đề", "Từ láy, từ tượng thanh", "Luyện tập tổng hợp"]),
      mod("Ngữ pháp N3", "20 mẫu ngữ pháp phải biết", ["20 mẫu ngữ pháp phải biết", "Mẫu というより", "Phân biệt mẫu câu dễ nhầm", "Luyện tập tổng hợp"]),
      mod("Đọc – nghe hiểu", "Chiến lược làm bài", ["Chiến lược đọc hiểu", "Chiến lược nghe hiểu", "Đề thi thử số 1", "Đề thi thử số 2", "Kiểm tra cuối khóa"]),
    ],
  },
  {
    slug: "nguoi-di-lam",
    key: "work",
    title: "Tiếng Nhật cho người đi làm",
    subtitle: "Từ vựng, mẫu câu và tình huống giao tiếp trong môi trường công sở Nhật Bản.",
    description: "<p>Từ vựng, mẫu câu và tình huống giao tiếp trong môi trường công sở Nhật Bản: email, họp, báo cáo, kính ngữ.</p>",
    level: "N3",
    category: "business",
    tags: ["Giao tiếp"],
    goals: ["Tiếng Nhật cho công việc", "Giao tiếp hằng ngày"],
    outcomes: ["Kính ngữ trong công việc", "Viết email công việc", "Tự tin họp và báo cáo"],
    formats: ["Lớp học trực tuyến", "Kết hợp (Blended)"],
    teacher: "minh",
    durationHours: 22,
    weeks: 8,
    rating: 4.7,
    ratingCount: 389,
    studentCount: 6900,
    badge: "Mới",
    price: 599000,
    added: 12,
    videoTheme: "keigo",
    cover: {
      lines: [
        { t: "Tiếng Nhật", c: P("text-3xl font-extrabold text-ink") },
        { t: "cho người đi làm", c: P("text-xl font-extrabold text-ink") },
      ],
      deco: "office",
      seed: "Kenji",
      bg: "e2e8f0",
      tone: "from-[#eef2f7] via-[#f8fafc] to-[#fde8ec]",
    },
    modules: [
      mod("Kính ngữ công sở", "Sonkeigo, Kenjougo, Teineigo", ["Tổng quan về kính ngữ", "Tôn kính ngữ", "Khiêm nhường ngữ", "Luyện tập tổng hợp"]),
      mod("Giao tiếp văn phòng", "Họp, báo cáo, điện thoại", ["Chào hỏi đồng nghiệp", "Báo cáo với cấp trên", "Gọi điện thoại công việc", "Viết email công việc", "Luyện tập tổng hợp"]),
      mod("Tình huống nâng cao", "Đàm phán, xin lỗi, từ chối", ["Từ chối khéo léo", "Xin lỗi khách hàng", "Kiểm tra cuối khóa"]),
    ],
  },
  {
    slug: "hiragana-katakana",
    key: "kana",
    title: "Hiragana & Katakana trong 7 ngày",
    subtitle: "Thuộc lòng hai bảng chữ cái qua hình ảnh, âm thanh và trò chơi ghi nhớ.",
    description: "<p>Thuộc lòng hai bảng chữ cái qua hình ảnh, âm thanh và trò chơi ghi nhớ. Khóa học <strong>miễn phí</strong> cho mọi người.</p>",
    level: "N5",
    category: "basic",
    tags: [],
    goals: ["Học từ đầu"],
    outcomes: ["Đọc viết 46 chữ Hiragana", "Đọc viết 46 chữ Katakana", "Phát âm chuẩn"],
    formats: ["Video bài giảng", "Lộ trình tự học"],
    teacher: "sato",
    durationHours: 6,
    weeks: 1,
    rating: 4.9,
    ratingCount: 1034,
    studentCount: 15200,
    badge: "Phổ biến",
    price: 0,
    added: 2,
    videoTheme: "kana",
    cover: {
      lines: [
        { t: "あ ア", c: P("font-jp text-5xl font-bold text-brand-500") },
        { t: "Bảng chữ cái", c: P("text-xl font-extrabold text-ink") },
        { t: "trong 7 ngày", c: P("text-sm font-bold text-brand-600") },
      ],
      deco: "kana",
      seed: "Hana",
      bg: "fde68a",
      tone: "from-[#fff7e6] via-[#fffbf3] to-[#ffe4e6]",
    },
    modules: [
      mod("Hiragana", "Ngày 1 – 3", ["Ngày 1: あ い う え お", "Ngày 2: か → の", "Ngày 3: は → ん", "Luyện tập tổng hợp"], 14),
      mod("Katakana", "Ngày 4 – 6", ["Ngày 4: ア → ソ", "Ngày 5: タ → ン", "Ngày 6: Từ mượn tiếng Anh", "Luyện tập tổng hợp"], 14),
      mod("Tổng ôn", "Ngày 7", ["Ngày 7: Đọc câu hoàn chỉnh", "Kiểm tra cuối khóa"], 14),
    ],
  },
  {
    slug: "giao-tiep-du-lich",
    key: "travel",
    title: "Giao tiếp du lịch Nhật Bản",
    subtitle: "Mẫu câu cần thiết khi đi tàu, mua sắm, gọi món và hỏi đường tại Nhật.",
    description: "<p>Mẫu câu cần thiết khi đi tàu, mua sắm, gọi món và hỏi đường tại Nhật.</p>",
    level: "N5",
    category: "communication",
    tags: ["Giao tiếp"],
    goals: ["Giao tiếp hằng ngày", "Học từ đầu"],
    outcomes: ["25 mẫu câu du lịch thiết yếu", "Tự tin đi tàu, mua sắm", "Gọi món tại nhà hàng"],
    formats: ["Video bài giảng"],
    teacher: "sato",
    durationHours: 7,
    weeks: 2,
    rating: 4.8,
    ratingCount: 312,
    studentCount: 5400,
    badge: "Mới",
    price: 199000,
    added: 10,
    videoTheme: "travel",
    cover: {
      lines: [
        { t: "Du lịch", c: P("text-3xl font-extrabold text-sky-700") },
        { t: "Nhật Bản", c: P("text-3xl font-extrabold text-brand-500") },
      ],
      deco: "fuji",
      seed: "Travel",
      bg: "bae6fd",
      tone: "from-[#e8f4ff] via-[#f7fbff] to-[#ffe8ec]",
    },
    modules: [
      mod("Trước chuyến đi", "Mẫu câu thiết yếu", ["25 mẫu câu phải biết", "Tại sân bay", "Luyện tập tổng hợp"], 12),
      mod("Tại Nhật", "Đi lại, ăn uống, mua sắm", ["Đi tàu điện", "Gọi món ăn", "Mua sắm & mặc cả", "Hỏi đường", "Kiểm tra cuối khóa"], 12),
    ],
  },
  {
    slug: "tu-vung-n3",
    key: "tvn3",
    title: "Từ vựng N3 theo chủ đề",
    subtitle: "1.800 từ vựng N3 sắp xếp theo chủ đề, kèm flashcard và bài kiểm tra nhanh.",
    description: "<p>1.800 từ vựng N3 sắp xếp theo chủ đề, kèm flashcard và bài kiểm tra nhanh.</p>",
    level: "N3",
    category: "jlpt",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT", "Đọc hiểu - Viết"],
    outcomes: ["1.800 từ vựng N3", "Học qua flashcard", "Kiểm tra nhanh sau mỗi chủ đề"],
    formats: ["Lộ trình tự học"],
    teacher: "mai",
    durationHours: 36,
    weeks: 12,
    rating: 4.7,
    ratingCount: 298,
    studentCount: 6100,
    price: 399000,
    added: 7,
    videoTheme: "n3",
    cover: {
      lines: [
        { t: "Từ vựng", c: P("text-3xl font-extrabold text-emerald-700") },
        { t: "N3", c: P("text-5xl font-black text-brand-500") },
      ],
      deco: "book",
      seed: "Sakura",
      bg: "d1fae5",
      tone: "from-[#ecfbf3] via-[#f9fffb] to-[#ffe8ec]",
    },
    modules: [
      mod("Cuộc sống", "Nhà ở, mua sắm, sức khỏe", ["Nhà ở", "Mua sắm", "Sức khỏe", "Luyện tập tổng hợp"]),
      mod("Xã hội", "Công việc, giáo dục, tin tức", ["Công việc", "Giáo dục", "Tin tức thời sự", "Luyện tập tổng hợp"]),
      mod("Cảm xúc & tính cách", "Tính từ, trạng từ", ["Tính từ cảm xúc", "Trạng từ thường gặp", "Kiểm tra cuối khóa"]),
    ],
  },
  {
    slug: "doc-hieu-n2",
    key: "dhn2",
    title: "Đọc hiểu N2 chuyên sâu",
    subtitle: "Kỹ thuật đọc nhanh, phân tích đoạn văn dài và bài báo tiếng Nhật thực tế.",
    description: "<p>Kỹ thuật đọc nhanh, phân tích đoạn văn dài và bài báo tiếng Nhật thực tế.</p>",
    level: "N2",
    category: "jlpt",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT", "Đọc hiểu - Viết"],
    outcomes: ["Đọc nhanh văn bản dài", "Phân tích bài luận", "Hiểu bài báo thực tế"],
    formats: ["Video bài giảng", "Kết hợp (Blended)"],
    teacher: "mai",
    durationHours: 40,
    weeks: 12,
    rating: 4.8,
    ratingCount: 246,
    studentCount: 4300,
    price: 599000,
    added: 4,
    videoTheme: "n2",
    cover: {
      lines: [
        { t: "Đọc hiểu", c: P("text-3xl font-extrabold text-sky-700") },
        { t: "N2", c: P("text-5xl font-black text-sky-600") },
      ],
      deco: "book",
      seed: "Haruto",
      bg: "dbeafe",
      tone: "from-[#eaf3ff] via-[#f8fbff] to-[#ffe8ec]",
    },
    modules: [
      mod("Kỹ thuật đọc", "Đọc lướt, đọc tìm ý", ["Đọc lướt tìm ý chính", "Đọc tìm thông tin", "Từ nối và cấu trúc đoạn", "Luyện tập tổng hợp"], 20),
      mod("Văn bản thực tế", "Báo chí, bài luận", ["Bài báo xã hội", "Bài luận quan điểm", "Văn bản hành chính", "Kiểm tra cuối khóa"], 22),
    ],
  },
  {
    slug: "jlpt-n2-cap-toc",
    key: "jn2",
    title: "Luyện thi JLPT N2 cấp tốc",
    subtitle: "Ôn tập trọng tâm trong 8 tuần với 10 đề thi thử sát đề thật.",
    description: "<p>Ôn tập trọng tâm trong 8 tuần với 10 đề thi thử sát đề thật.</p>",
    level: "N2",
    category: "jlpt",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT", "Tiếng Nhật cho công việc"],
    outcomes: ["Ôn trọng tâm 8 tuần", "10 đề thi thử", "Chiến lược làm bài"],
    formats: ["Lớp học trực tuyến"],
    teacher: "minh",
    durationHours: 64,
    weeks: 8,
    rating: 4.8,
    ratingCount: 221,
    studentCount: 3900,
    price: 899000,
    salePrice: 749000,
    added: 9,
    videoTheme: "n2",
    cover: {
      lines: [
        { t: "Cấp tốc", c: P("text-xl font-extrabold text-ink") },
        { t: "JLPT", a: "N2", c: P("text-4xl font-black text-brand-500") },
      ],
      sub: "8 tuần - 10 đề thi thử",
      deco: "jlpt",
      seed: "Ren",
      bg: "e0e7ff",
      tone: "from-[#eef2ff] via-[#f8f9ff] to-[#ffe8ec]",
    },
    modules: [
      mod("Tuần 1 – 4: Kiến thức", "Từ vựng, ngữ pháp trọng tâm", ["Ngữ pháp N2 trong 1 giờ", "Từ vựng trọng tâm", "Kanji hay ra đề", "Luyện tập tổng hợp"], 24),
      mod("Tuần 5 – 8: Luyện đề", "Đề thi thử có giải thích", ["Đề thi thử số 1", "Đề thi thử số 2", "Đề thi thử số 3", "Kiểm tra cuối khóa"], 24),
    ],
  },
  {
    slug: "chinh-phuc-n1",
    key: "cpn1",
    title: "Chinh phục JLPT N1",
    subtitle: "Ngữ pháp, từ vựng học thuật và chiến lược đạt điểm cao kỳ thi N1.",
    description: "<p>Ngữ pháp, từ vựng học thuật và chiến lược đạt điểm cao kỳ thi N1.</p>",
    level: "N1",
    category: "jlpt",
    tags: ["JLPT"],
    goals: ["Luyện thi JLPT", "Tiếng Nhật cho công việc"],
    outcomes: ["Ngữ pháp N1 đầy đủ", "Từ vựng học thuật", "Chiến lược đạt 150+"],
    formats: ["Kết hợp (Blended)", "Lớp học trực tuyến"],
    teacher: "sato",
    durationHours: 72,
    weeks: 20,
    rating: 4.9,
    ratingCount: 187,
    studentCount: 2600,
    price: 999000,
    added: 1,
    videoTheme: "n1",
    cover: {
      lines: [
        { t: "Chinh phục", c: P("text-lg font-extrabold text-violet-700") },
        { t: "N1", c: P("text-6xl font-black text-violet-600") },
      ],
      deco: "pagoda",
      seed: "Akira",
      bg: "ede9fe",
      tone: "from-[#f3efff] via-[#fbf9ff] to-[#ffe8ec]",
    },
    modules: [
      mod("Ngữ pháp N1", "Ôn trọng tâm trong 1 giờ", ["Ngữ pháp N1 trong 1 giờ", "Mẫu 〜であれ〜であれ", "Mẫu 〜なり〜なり", "Luyện tập tổng hợp"], 24),
      mod("Luyện đề N1", "Đề thi thử và chiến lược", ["Chiến lược phân bổ thời gian", "Đề thi thử số 1", "Đề thi thử số 2", "Kiểm tra cuối khóa"], 24),
    ],
  },
  {
    slug: "kanji-n1",
    key: "kjn1",
    title: "Kanji N1 nâng cao",
    subtitle: "Hơn 2.000 Hán tự N1 với bộ thủ, âm On/Kun và mẹo phân biệt chữ dễ nhầm.",
    description: "<p>Hơn 2.000 Hán tự N1 với bộ thủ, âm On/Kun và mẹo phân biệt chữ dễ nhầm.</p>",
    level: "N1",
    category: "kanji",
    tags: ["Kanji", "JLPT"],
    goals: ["Kanji - Hán tự", "Luyện thi JLPT"],
    outcomes: ["2.000+ Hán tự", "Phân biệt chữ dễ nhầm", "Đọc âm On/Kun chuẩn"],
    formats: ["Lộ trình tự học"],
    teacher: "minh",
    durationHours: 66,
    weeks: 20,
    rating: 4.7,
    ratingCount: 143,
    studentCount: 1900,
    price: 699000,
    added: 0,
    videoTheme: "kanji",
    cover: {
      lines: [
        { t: "Kanji", c: P("text-5xl font-black text-violet-800") },
        { t: "N1 nâng cao", c: P("text-xl font-extrabold text-ink") },
      ],
      deco: "kanji",
      seed: "Sensei",
      bg: "ede9fe",
      tone: "from-[#f5f0ff] via-[#fcfaff] to-[#fde7e9]",
    },
    modules: [
      mod("Bộ thủ nâng cao", "Hệ thống 214 bộ thủ", ["214 bộ thủ Khang Hy", "Bộ thủ biến thể", "Luyện tập tổng hợp"], 20),
      mod("Kanji N1 theo chủ đề", "Kinh tế, xã hội, khoa học", ["Kinh tế – tài chính", "Chính trị – xã hội", "Khoa học – công nghệ", "Chữ dễ nhầm lẫn", "Kiểm tra cuối khóa"], 20),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Bài 12: Thể て                                                       */
/* ------------------------------------------------------------------ */

export const TE_VOCAB = [
  { word: "食べる", reading: "たべる", romaji: "taberu", pos: "động từ (V2)", meaning: "ăn", ex: ["ご飯を", "食べて", "から、行きます。"], exRo: "Gohan o tabete kara, ikimasu.", exVi: "(Tôi sẽ đi sau khi ăn cơm.)" },
  { word: "行く", reading: "いく", romaji: "iku", pos: "động từ (V1)", meaning: "đi, đến", ex: ["", "歩いて", "学校へ行きます。"], exRo: "Aruite gakkou e ikimasu.", exVi: "(Tôi đi bộ đến trường.)" },
  { word: "見る", reading: "みる", romaji: "miru", pos: "động từ (V2)", meaning: "xem, nhìn", ex: ["テレビを", "見て", "、寝ます。"], exRo: "Terebi o mite, nemasu.", exVi: "(Xem TV rồi đi ngủ.)" },
  { word: "聞く", reading: "きく", romaji: "kiku", pos: "động từ (V1)", meaning: "nghe, hỏi", ex: ["音楽を", "聞いて", "、勉強します。"], exRo: "Ongaku o kiite, benkyou shimasu.", exVi: "(Nghe nhạc và học bài.)" },
  { word: "話す", reading: "はなす", romaji: "hanasu", pos: "động từ (V1)", meaning: "nói, trò chuyện", ex: ["日本語で", "話して", "みましょう。"], exRo: "Nihongo de hanashite mimashou.", exVi: "(Hãy thử nói bằng tiếng Nhật nhé.)" },
  { word: "飲む", reading: "のむ", romaji: "nomu", pos: "động từ (V1)", meaning: "uống", ex: ["薬を", "飲んで", "、休みます。"], exRo: "Kusuri o nonde, yasumimasu.", exVi: "(Uống thuốc rồi nghỉ ngơi.)" },
  { word: "書く", reading: "かく", romaji: "kaku", pos: "động từ (V1)", meaning: "viết", ex: ["名前を", "書いて", "ください。"], exRo: "Namae o kaite kudasai.", exVi: "(Hãy viết tên của bạn.)" },
  { word: "読む", reading: "よむ", romaji: "yomu", pos: "động từ (V1)", meaning: "đọc", ex: ["本を", "読んで", "、レポートを書きます。"], exRo: "Hon o yonde, repooto o kakimasu.", exVi: "(Đọc sách rồi viết báo cáo.)" },
  { word: "買う", reading: "かう", romaji: "kau", pos: "động từ (V1)", meaning: "mua", ex: ["パンを", "買って", "、家に帰ります。"], exRo: "Pan o katte, ie ni kaerimasu.", exVi: "(Mua bánh mì rồi về nhà.)" },
  { word: "待つ", reading: "まつ", romaji: "matsu", pos: "động từ (V1)", meaning: "đợi, chờ", ex: ["ちょっと", "待って", "ください。"], exRo: "Chotto matte kudasai.", exVi: "(Xin hãy đợi một chút.)" },
  { word: "起きる", reading: "おきる", romaji: "okiru", pos: "động từ (V2)", meaning: "thức dậy", ex: ["朝6時に", "起きて", "、走ります。"], exRo: "Asa rokuji ni okite, hashirimasu.", exVi: "(Dậy lúc 6 giờ sáng rồi chạy bộ.)" },
  { word: "来る", reading: "くる", romaji: "kuru", pos: "động từ (V3)", meaning: "đến, tới", ex: ["友達が", "来て", "、一緒に遊びました。"], exRo: "Tomodachi ga kite, issho ni asobimashita.", exVi: "(Bạn đến và chúng tôi cùng chơi.)" },
];

/** Ví dụ trong từ vựng: phần cần nhấn mạnh được bọc bằng dấu *…* (client tô màu). */
export const exampleMarked = (ex: string[]) => `${ex[0]}*${ex[1]}*${ex[2]}`;

export const TE_SUMMARY = "Học cách chia động từ sang thể て, cách dùng và những mẫu câu thông dụng trong giao tiếp.";

export const TE_CONTENT = `<h2>Thể <span lang="ja">て</span> (Te-form) là gì?</h2>
<p>Thể <span lang="ja">て</span> dùng để <strong>nối các hành động</strong>, diễn tả cách thức, phương tiện và là nền tảng của rất nhiều mẫu câu quan trọng trong giao tiếp như <span lang="ja">～てください</span>, <span lang="ja">～ています</span>, <span lang="ja">～てもいいです</span>.</p>
<h3>Ví dụ minh họa</h3>
<ul>
<li><span lang="ja">朝ごはんを食べ<mark>て</mark>、学校に行きます。</span><br><em>Asa gohan o tabete, gakkou ni ikimasu.</em> — (Ăn sáng rồi đi học.)</li>
<li><span lang="ja">音楽を聞い<mark>て</mark>、勉強します。</span><br><em>Ongaku o kiite, benkyou shimasu.</em> — (Nghe nhạc và học bài.)</li>
</ul>
<h3>Mục tiêu bài học</h3>
<ol>
<li>Chia được động từ ba nhóm sang thể <span lang="ja">て</span>.</li>
<li>Dùng thể <span lang="ja">て</span> để nối các hành động theo thứ tự thời gian.</li>
<li>Nắm 4 mẫu câu thông dụng với thể <span lang="ja">て</span>.</li>
</ol>
<blockquote>Mẹo nhớ: <span lang="ja">う・つ・る → って</span>, <span lang="ja">む・ぶ・ぬ → んで</span>, <span lang="ja">く → いて</span>, <span lang="ja">ぐ → いで</span>, <span lang="ja">す → して</span>.</blockquote>`;

export const TE_GRAMMAR = `<h3>Cách chia thể <span lang="ja">て</span></h3>
<p>Quy tắc chia theo từng nhóm động từ.</p>
<table>
<thead><tr><th>Nhóm</th><th>Đuôi</th><th>Thể て</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td>Nhóm 1</td><td lang="ja">う・つ・る</td><td lang="ja"><strong>って</strong></td><td lang="ja">買う → 買って, 待つ → 待って, 帰る → 帰って</td></tr>
<tr><td>Nhóm 1</td><td lang="ja">む・ぶ・ぬ</td><td lang="ja"><strong>んで</strong></td><td lang="ja">飲む → 飲んで, 遊ぶ → 遊んで, 死ぬ → 死んで</td></tr>
<tr><td>Nhóm 1</td><td lang="ja">く</td><td lang="ja"><strong>いて</strong></td><td lang="ja">書く → 書いて, 聞く → 聞いて</td></tr>
<tr><td>Nhóm 1</td><td lang="ja">ぐ</td><td lang="ja"><strong>いで</strong></td><td lang="ja">泳ぐ → 泳いで, 急ぐ → 急いで</td></tr>
<tr><td>Nhóm 1</td><td lang="ja">す</td><td lang="ja"><strong>して</strong></td><td lang="ja">話す → 話して, 貸す → 貸して</td></tr>
<tr><td>Nhóm 2</td><td lang="ja">～る</td><td><strong>bỏ る + て</strong></td><td lang="ja">食べる → 食べて, 見る → 見て</td></tr>
<tr><td>Nhóm 3</td><td lang="ja">する・来る</td><td lang="ja"><strong>して・来て</strong></td><td lang="ja">勉強する → 勉強して, 来る → 来て</td></tr>
</tbody>
</table>
<blockquote><strong>Ngoại lệ:</strong> <span lang="ja">行く → 行って</span> (không phải 行いて).</blockquote>
<h3>Mẫu câu thông dụng</h3>
<ul>
<li><strong lang="ja">V1て、V2</strong> — Nối các hành động theo thứ tự.<br><span lang="ja">朝起きて、顔を洗います。</span></li>
<li><strong lang="ja">Vてください</strong> — Nhờ vả, yêu cầu lịch sự.<br><span lang="ja">ここに名前を書いてください。</span></li>
<li><strong lang="ja">Vています</strong> — Hành động đang diễn ra.<br><span lang="ja">今、雨が降っています。</span></li>
<li><strong lang="ja">Vてもいいです</strong> — Xin phép / cho phép.<br><span lang="ja">写真を撮ってもいいですか。</span></li>
</ul>`;

/** Từ vựng ngắn cho vài bài khác. */
export const EXTRA_VOCAB: Record<string, { word: string; reading: string; romaji: string; pos: string; meaning: string }[]> = {
  "Động từ nhóm 1, 2, 3": [
    { word: "帰る", reading: "かえる", romaji: "kaeru", pos: "động từ (V1)", meaning: "trở về" },
    { word: "入る", reading: "はいる", romaji: "hairu", pos: "động từ (V1)", meaning: "vào" },
    { word: "寝る", reading: "ねる", romaji: "neru", pos: "động từ (V2)", meaning: "ngủ" },
    { word: "勉強する", reading: "べんきょうする", romaji: "benkyou suru", pos: "động từ (V3)", meaning: "học" },
  ],
  "Thể ます (Masu-form)": [
    { word: "頑張る", reading: "がんばる", romaji: "ganbaru", pos: "động từ (V1)", meaning: "cố gắng" },
    { word: "働く", reading: "はたらく", romaji: "hataraku", pos: "động từ (V1)", meaning: "làm việc" },
    { word: "休む", reading: "やすむ", romaji: "yasumu", pos: "động từ (V1)", meaning: "nghỉ ngơi" },
  ],
  "Thể た (Ta-form)": [
    { word: "旅行", reading: "りょこう", romaji: "ryokou", pos: "danh từ", meaning: "du lịch" },
    { word: "撮る", reading: "とる", romaji: "toru", pos: "động từ (V1)", meaning: "chụp (ảnh)" },
    { word: "泳ぐ", reading: "およぐ", romaji: "oyogu", pos: "động từ (V1)", meaning: "bơi" },
  ],
  "Tính từ đuôi い": [
    { word: "美しい", reading: "うつくしい", romaji: "utsukushii", pos: "tính từ い", meaning: "đẹp" },
    { word: "新しい", reading: "あたらしい", romaji: "atarashii", pos: "tính từ い", meaning: "mới" },
    { word: "高い", reading: "たかい", romaji: "takai", pos: "tính từ い", meaning: "cao, đắt" },
  ],
  "Thể て và cách dùng": [
    { word: "急ぐ", reading: "いそぐ", romaji: "isogu", pos: "động từ (V1)", meaning: "vội vàng" },
    { word: "貸す", reading: "かす", romaji: "kasu", pos: "động từ (V1)", meaning: "cho mượn" },
    { word: "遊ぶ", reading: "あそぶ", romaji: "asobu", pos: "động từ (V1)", meaning: "chơi" },
  ],
};

export const TE_COMMENTS = [
  { text: "Em thắc mắc là động từ する khi chuyển sang thể て có phải là して không ạ?", likes: 12, hoursAgo: 2, reply: { text: "Đúng rồi bạn nhé! する → して. Đây là động từ ngoại lệ thuộc nhóm 3.", likes: 24, hoursAgo: 1 } },
  { text: "Cô ơi, khi nối nhiều hành động thì có giới hạn số lượng động từ ở thể て không ạ?", likes: 8, hoursAgo: 26, reply: { text: "Không giới hạn em nhé, nhưng trong văn nói thường chỉ nối 2–3 hành động cho tự nhiên. Thì của cả câu do động từ cuối quyết định.", likes: 15, hoursAgo: 24 } },
  { text: "Mẹo nhớ của mình: う・つ・る → って, む・ぶ・ぬ → んで, く → いて, ぐ → いで, す → して. Hát theo giai điệu là nhớ liền!", likes: 31, hoursAgo: 28 },
  { text: "行く là ngoại lệ: 行いて ❌ → 行って ✅. Mình hay sai chỗ này quá 😅", likes: 17, hoursAgo: 50 },
  { text: "Bài giảng dễ hiểu quá, phần bảng tổng hợp rất hữu ích. Cảm ơn cô!", likes: 9, hoursAgo: 72 },
  { text: "Cho mình hỏi 来る chia thể て là きて đúng không mọi người?", likes: 4, hoursAgo: 96, reply: { text: "Đúng rồi, 来る → 来て (きて).", likes: 6, hoursAgo: 95 } },
  { text: "Phân biệt ～てから và ～て thế nào ạ? Em thấy nghĩa khá giống nhau.", likes: 11, hoursAgo: 120, reply: { text: "～てから nhấn mạnh hành động sau chỉ xảy ra SAU KHI hành động trước kết thúc, còn ～て chỉ đơn thuần liệt kê theo thứ tự.", likes: 19, hoursAgo: 118 } },
  { text: "Mình làm bài tập luyện tập được 9/10, sai mỗi câu 泳ぐ 😂", likes: 5, hoursAgo: 150 },
];

export const REVIEWS_N4 = [
  { name: "Phạm Thu Trang", role: "Học viên N4", days: 14, content: "Cô Mai giảng rất dễ hiểu, mỗi mẫu ngữ pháp đều có ví dụ sát thực tế. Mình đã đỗ N4 với 142/180 điểm sau 3 tháng học." },
  { name: "Lê Quang Huy", role: "Học viên N4", days: 30, content: "Lộ trình rõ ràng, bài tập sau mỗi bài giúp mình nhớ lâu. Phần mini test cuối chương rất giống đề thi thật." },
  { name: "Nguyễn Minh Anh", role: "Học viên N4", days: 33, content: "Học trên điện thoại rất tiện, mình tranh thủ học lúc đi xe buýt. Được giải đáp thắc mắc nhanh trong cộng đồng." },
];

export const ROADMAP = [
  { level: "N5", title: "Nền tảng vững chắc", duration: "2-3 tháng" },
  { level: "N4", title: "Củng cố kiến thức", duration: "2-3 tháng" },
  { level: "N3", title: "Tự tin giao tiếp", duration: "3-4 tháng" },
  { level: "N2", title: "Nâng cao năng lực", duration: "4-6 tháng" },
  { level: "N1", title: "Chinh phục mục tiêu", duration: "6-12 tháng" },
];
