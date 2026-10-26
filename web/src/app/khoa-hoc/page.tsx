import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site";
import Catalog from "@/components/courses/Catalog";

export const metadata: Metadata = {
  title: "Khóa học tiếng Nhật N5 – N1, JLPT, giao tiếp | Nihongo+",
  description:
    "Khám phá các khóa học tiếng Nhật phù hợp với bạn: lộ trình N5 đến N1, luyện thi JLPT, giao tiếp và Kanji, giảng dạy bởi giáo viên giàu kinh nghiệm.",
};

export default function KhoaHocPage() {
  return (
    <PageShell cta={false}>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Catalog />
      </Suspense>
    </PageShell>
  );
}
