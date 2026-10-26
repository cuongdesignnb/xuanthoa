import type { Metadata } from "next";
import { CtaStrip, PageBanner, PageShell } from "@/components/site";
import { TeachersHeroAside, TeachersHeroContent } from "@/components/teachers/TeachersHero";
import TeacherFinder from "@/components/teachers/TeacherFinder";
import { FeaturedTeacher, TestimonialsAndAdvice } from "@/components/teachers/Highlights";

export const metadata: Metadata = {
  title: "Đội ngũ giáo viên Nihongo+ | Tận tâm, giàu kinh nghiệm",
  description:
    "Gặp gỡ đội ngũ giáo viên bản ngữ và giáo viên Việt Nam trình độ N1 – N2 của Nihongo+. Lọc theo chuyên môn, trình độ và đặt lịch học thử miễn phí.",
};

export default function TeachersPage() {
  return (
    <PageShell cta={false}>
      <PageBanner
        aside={<TeachersHeroAside />}
        script={
          <>
            Cùng những người
            <br />
            tâm huyết, đưa bạn
            <br />
            đến gần hơn
            <br />
            với Nhật Bản
          </>
        }
      >
        <TeachersHeroContent />
      </PageBanner>
      <TeacherFinder />
      <FeaturedTeacher />
      <TestimonialsAndAdvice />
      <CtaStrip
        title="Cùng đội ngũ giáo viên tâm huyết, chinh phục tiếng Nhật với Nihongo+"
        text="Đội ngũ giáo viên giàu kinh nghiệm đang chờ đồng hành cùng bạn!"
      />
    </PageShell>
  );
}
