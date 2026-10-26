import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site";
import LessonPage from "@/components/lesson/LessonPage";

export const metadata: Metadata = {
  title: "Bài học | Nihongo+",
  description: "Video bài giảng, từ vựng, ngữ pháp, ghi chú và thảo luận cùng giáo viên Nihongo+.",
};

async function Inner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LessonPage slug={slug} />;
}

export default function LessonRoute({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Inner params={params} />
      </Suspense>
    </PageShell>
  );
}
