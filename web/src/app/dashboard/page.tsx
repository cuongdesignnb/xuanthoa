import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import Dashboard from "@/components/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "Tổng quan học tập | Nihongo+",
  description:
    "Bảng điều khiển học viên Nihongo+: tiến độ tổng thể, chuỗi ngày học, kế hoạch tuần, thống kê thời gian học và thành tích của bạn.",
};

export default function DashboardPage() {
  return (
    <PageShell user>
      <Dashboard />
    </PageShell>
  );
}
