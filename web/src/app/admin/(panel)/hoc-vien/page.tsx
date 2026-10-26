import type { Metadata } from "next";
import StudentsPage from "@/components/admin/ops/StudentsPage";

export const metadata: Metadata = { title: "Học viên" };

export default function Page() {
  return <StudentsPage />;
}
