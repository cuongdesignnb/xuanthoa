/** Kiểu dữ liệu & hằng số giao diện của blog (dữ liệu lấy từ API /public/posts…). */

export type CategoryId = "all" | "ngu-phap" | "kanji" | "jlpt" | "van-hoa" | "meo" | "du-hoc";
export type PostCategory = Exclude<CategoryId, "all">;

export type CoverKind = "grammar" | "kanji" | "jlpt" | "culture" | "tips" | "study" | "fuji" | "kana";
export const COVER_KINDS: CoverKind[] = ["grammar", "kanji", "jlpt", "culture", "tips", "study", "fuji", "kana"];

export type PostAuthor = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  avatarSeed: string | null;
  avatarBg: string | null;
};

export type PostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  coverUrl: string | null;
  coverStyle: { kind?: CoverKind } | null;
  readMin: number;
  views: number;
  featured: boolean;
  guide: boolean;
  publishedAt: string | null;
  author: PostAuthor | null;
};

export type PostDetail = PostCard & {
  content: string | null;
  author: (PostAuthor & { title: string | null; bio: string | null; levelRange: string | null; yearsExp: number; badge: string | null; native: boolean }) | null;
  related: PostCard[];
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

export type FreeResource = { id: string; title: string; fileType: string; sizeBytes: number; downloads: number };

export const CATEGORY_LABEL: Record<PostCategory, string> = {
  "ngu-phap": "Ngữ pháp",
  kanji: "Kanji",
  jlpt: "Kinh nghiệm JLPT",
  "van-hoa": "Văn hóa Nhật Bản",
  meo: "Mẹo học tập",
  "du-hoc": "Du học",
};

/** Màu nhãn trên ảnh bìa bài viết. */
export const CATEGORY_TAG: Record<PostCategory, string> = {
  "ngu-phap": "bg-brand-500",
  kanji: "bg-emerald-500",
  jlpt: "bg-brand-500",
  "van-hoa": "bg-amber-500",
  meo: "bg-violet-500",
  "du-hoc": "bg-sky-500",
};

export const catLabel = (c: string) => CATEGORY_LABEL[c as PostCategory] ?? c;
export const catTag = (c: string) => CATEGORY_TAG[c as PostCategory] ?? "bg-brand-500";
export const coverKind = (p: Pick<PostCard, "coverStyle">): CoverKind => p.coverStyle?.kind ?? "fuji";

/** 2516582 → "2.4 MB". */
export const fileSize = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
