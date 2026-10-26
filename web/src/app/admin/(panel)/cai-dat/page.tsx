import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/admin/ui";
import SettingsPage from "@/components/admin/ops/SettingsPage";

export const metadata: Metadata = { title: "Cài đặt hệ thống" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <SettingsPage />
    </Suspense>
  );
}
