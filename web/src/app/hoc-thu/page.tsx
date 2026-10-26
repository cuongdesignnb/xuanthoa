import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import TrialRedirect from "@/components/lesson/TrialRedirect";

export const metadata: Metadata = {
  title: "Học thử miễn phí | Nihongo+",
  description: "Học thử miễn phí bài học tiếng Nhật nổi bật tại Nihongo+.",
};

export default function HocThuPage() {
  return (
    <PageShell cta={false}>
      <TrialRedirect />
    </PageShell>
  );
}
