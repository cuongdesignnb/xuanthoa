import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/admin/ui";
import SupportPage from "@/components/admin/ops/SupportPage";

export const metadata: Metadata = { title: "Trung tâm hỗ trợ" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <SupportPage />
    </Suspense>
  );
}
