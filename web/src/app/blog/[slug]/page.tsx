import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import PostDetail from "@/components/blog/PostDetail";

export const metadata: Metadata = {
  title: "Bài viết | Blog Nihongo+",
  description: "Kiến thức, kinh nghiệm và mẹo học tiếng Nhật từ đội ngũ giáo viên Nihongo+.",
};

async function Inner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PostDetail slug={slug} />;
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[70vh]" />}>
        <Inner params={params} />
      </Suspense>
    </PageShell>
  );
}
