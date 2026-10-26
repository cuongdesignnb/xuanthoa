import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/admin/ui";
import NotificationsPage from "@/components/admin/ops/NotificationsPage";

export const metadata: Metadata = { title: "Thông báo" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <NotificationsPage />
    </Suspense>
  );
}
