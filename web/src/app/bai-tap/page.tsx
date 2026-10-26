import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site";
import ExerciseHub from "@/components/exercises/ExerciseHub";

export const metadata: Metadata = {
  title: "Bài tập theo chủ đề | Nihongo+",
  description:
    "Luyện tập tiếng Nhật đa dạng chủ đề từ N5 đến N1: từ vựng, ngữ pháp, Kanji, luyện nghe và bộ đề JLPT bám sát kỳ thi thật.",
};

export default function BaiTapPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-screen" />}>
        <ExerciseHub />
      </Suspense>
    </PageShell>
  );
}
