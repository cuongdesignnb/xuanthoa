import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site";
import CourseDetail from "@/components/courses/CourseDetail";

export const metadata: Metadata = {
  title: "Chi tiết khóa học | Nihongo+",
  description: "Lộ trình học chi tiết, giáo viên, tài liệu và đánh giá khóa học tiếng Nhật tại Nihongo+. Học thử miễn phí bài đầu tiên.",
};

async function Inner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CourseDetail slug={slug} />;
}

export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Inner params={params} />
      </Suspense>
    </PageShell>
  );
}
