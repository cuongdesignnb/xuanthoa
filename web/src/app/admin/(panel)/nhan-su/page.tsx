import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/admin/ui";
import StaffPage from "@/components/admin/ops/StaffPage";

export const metadata: Metadata = { title: "Phân quyền nhân sự" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <StaffPage />
    </Suspense>
  );
}
