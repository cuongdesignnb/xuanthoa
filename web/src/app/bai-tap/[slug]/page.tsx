import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site";
import QuizPlayer from "@/components/exercises/QuizPlayer";

export const metadata: Metadata = {
  title: "Làm bài tập | Nihongo+",
  description: "Làm bài trắc nghiệm và tự luận tiếng Nhật có furigana, gợi ý ngữ pháp, giải thích chi tiết và chấm điểm ngay lập tức.",
};

async function Inner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QuizPlayer slug={slug} />;
}

export default function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Inner params={params} />
      </Suspense>
    </PageShell>
  );
}
