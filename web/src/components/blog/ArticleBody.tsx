import { RichTextView } from "@/components/RichText";

/**
 * Nội dung bài viết: dùng RichTextView (đã lọc HTML theo allowlist, typography chung với admin)
 * + vài tinh chỉnh riêng cho blog (cỡ chữ đọc dài, trích dẫn ví dụ tiếng Nhật, furigana).
 */
export default function ArticleBody({ html, className = "" }: { html: string; className?: string }) {
  return (
    <RichTextView
      html={html}
      className={[
        "text-[15.5px] leading-[1.85] text-ink/85",
        "[&_h2]:mt-9 [&_h2]:text-ink [&_strong]:text-ink",
        "[&_blockquote]:my-5 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-brand-400 [&_blockquote]:bg-brand-50/70 [&_blockquote]:px-5 [&_blockquote]:py-3",
        "[&_blockquote_p]:my-1 [&_blockquote_p:first-child]:font-jp [&_blockquote_p:first-child]:text-[17px] [&_blockquote_p:first-child]:not-italic [&_blockquote_p:first-child]:text-ink [&_blockquote_em]:text-[13.5px] [&_blockquote_em]:text-muted",
        "[&_[lang=ja]]:font-jp [&_ruby]:font-jp [&_rt]:text-[0.6em] [&_rt]:text-brand-500/80 [&_li::marker]:text-brand-400",
        className,
      ].join(" ")}
    />
  );
}
