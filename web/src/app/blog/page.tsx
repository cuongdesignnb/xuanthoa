import type { Metadata } from "next";
import { PageBanner, PageShell } from "@/components/site";
import { BlogHeroAside, BlogHeroContent } from "@/components/blog/BlogHero";
import BlogExplorer from "@/components/blog/BlogExplorer";

export const metadata: Metadata = {
  title: "Blog & Tài nguyên học tiếng Nhật | Nihongo+",
  description:
    "Chia sẻ kiến thức, kinh nghiệm thi JLPT, ngữ pháp, Kanji, văn hóa Nhật Bản và tài liệu miễn phí giúp bạn học tiếng Nhật hiệu quả hơn mỗi ngày.",
};

export default function BlogPage() {
  return (
    <PageShell>
      <PageBanner aside={<BlogHeroAside />}>
        <BlogHeroContent />
      </PageBanner>
      <BlogExplorer />
    </PageShell>
  );
}
