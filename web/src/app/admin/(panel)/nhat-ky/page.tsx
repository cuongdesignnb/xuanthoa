import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/admin/ui";
import LogsPage from "@/components/admin/ops/LogsPage";

export const metadata: Metadata = { title: "Log hoạt động" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <LogsPage />
    </Suspense>
  );
}
