/**
 * Lựa chọn thiết kế bìa vẽ bằng CSS (lưu ở `courses.coverStyle`). Các chuỗi class Tailwind phải nằm
 * trong mã nguồn web để được sinh CSS — vì vậy admin chỉ chọn từ danh sách dưới đây.
 */

export const COVER_DECOS = [
  { value: "torii", label: "Cổng Torii" },
  { value: "pagoda", label: "Chùa" },
  { value: "fuji", label: "Núi Phú Sĩ" },
  { value: "headphones", label: "Tai nghe" },
  { value: "kanji", label: "Chữ Kanji" },
  { value: "jlpt", label: "Đề thi JLPT" },
  { value: "office", label: "Văn phòng" },
  { value: "kana", label: "Bảng chữ cái" },
  { value: "book", label: "Sổ từ vựng" },
];

export const COVER_TONES = [
  { value: "from-[#ffe9ec] via-[#fff5f6] to-[#ffdfe4]", label: "Hồng anh đào" },
  { value: "from-[#fff4f0] via-[#fffaf7] to-[#ffe4e6]", label: "Đào nhạt" },
  { value: "from-[#fdecef] via-[#fff7f8] to-[#fde2e7]", label: "Hồng phấn" },
  { value: "from-[#fbf3ea] via-[#fffaf4] to-[#fde7e9]", label: "Kem" },
  { value: "from-[#eef6ff] via-[#fff8f8] to-[#ffe6ea]", label: "Xanh trời – hồng" },
  { value: "from-[#eef2f7] via-[#f8fafc] to-[#fde8ec]", label: "Xám xanh" },
  { value: "from-[#fff7e6] via-[#fffbf3] to-[#ffe4e6]", label: "Vàng nhạt" },
  { value: "from-[#e8f4ff] via-[#f7fbff] to-[#ffe8ec]", label: "Xanh biển" },
  { value: "from-[#ecfbf3] via-[#f9fffb] to-[#ffe8ec]", label: "Xanh lá" },
  { value: "from-[#eaf3ff] via-[#f8fbff] to-[#ffe8ec]", label: "Xanh dương" },
  { value: "from-[#eef2ff] via-[#f8f9ff] to-[#ffe8ec]", label: "Chàm" },
  { value: "from-[#f3efff] via-[#fbf9ff] to-[#ffe8ec]", label: "Tím" },
  { value: "from-[#f5f0ff] via-[#fcfaff] to-[#fde7e9]", label: "Tím nhạt" },
];

/** Kiểu chữ cho từng dòng trên bìa. */
export const COVER_TEXT = [
  { value: "text-5xl sm:text-6xl font-black text-brand-500", label: "Rất lớn – đỏ" },
  { value: "text-5xl sm:text-6xl font-black text-rose-500", label: "Rất lớn – hồng" },
  { value: "text-5xl sm:text-6xl font-black text-emerald-600", label: "Rất lớn – xanh lá" },
  { value: "text-5xl sm:text-6xl font-black text-sky-600", label: "Rất lớn – xanh dương" },
  { value: "text-6xl font-black text-violet-600", label: "Rất lớn – tím" },
  { value: "text-5xl font-black text-brand-500", label: "Lớn – đỏ" },
  { value: "text-5xl font-black text-sky-600", label: "Lớn – xanh dương" },
  { value: "text-5xl font-black text-emerald-800", label: "Lớn – xanh rêu" },
  { value: "text-5xl font-black text-violet-800", label: "Lớn – tím đậm" },
  { value: "font-jp text-5xl font-bold text-brand-500", label: "Lớn – chữ Nhật" },
  { value: "text-4xl font-black text-brand-500", label: "Vừa lớn – đỏ" },
  { value: "text-3xl font-extrabold text-ink", label: "Vừa – đen" },
  { value: "text-3xl font-extrabold text-sky-700", label: "Vừa – xanh dương" },
  { value: "text-3xl font-extrabold text-brand-500", label: "Vừa – đỏ" },
  { value: "text-3xl font-extrabold text-emerald-700", label: "Vừa – xanh lá" },
  { value: "text-2xl font-extrabold text-ink", label: "Nhỏ vừa – đen" },
  { value: "text-xl font-extrabold text-ink", label: "Nhỏ – đen" },
  { value: "text-xl font-extrabold text-brand-500", label: "Nhỏ – đỏ" },
  { value: "text-xl font-extrabold text-brand-600", label: "Nhỏ – đỏ đậm" },
  { value: "text-xl font-extrabold text-brand-600 -rotate-3", label: "Nhỏ – đỏ nghiêng" },
  { value: "text-lg font-extrabold text-violet-700", label: "Nhỏ – tím" },
  { value: "text-lg font-extrabold text-ink", label: "Nhỏ hơn – đen" },
  { value: "text-sm font-bold text-brand-600", label: "Rất nhỏ – đỏ" },
  { value: "text-[10px] font-bold text-brand-600", label: "Chú thích – đỏ" },
];

/** Màu nền avatar minh họa (DiceBear). */
export const COVER_BGS = ["ffd6dc", "dbeafe", "fbcfe8", "fee2e2", "e0f2fe", "e2e8f0", "fde68a", "bae6fd", "d1fae5", "e0e7ff", "ede9fe"];

export const DEFAULT_COVER = {
  lines: [
    { t: "N5", c: COVER_TEXT[0].value },
    { t: "Tên khóa học", c: COVER_TEXT[16].value },
  ],
  deco: "torii",
  seed: "Yuki",
  bg: "ffd6dc",
  tone: COVER_TONES[0].value,
};
