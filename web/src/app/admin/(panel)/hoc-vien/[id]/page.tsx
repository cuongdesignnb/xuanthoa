import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/admin/ui";
import StudentDetail from "@/components/admin/ops/StudentDetail";

export const metadata: Metadata = { title: "Chi tiết học viên" };

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetail id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Inner params={params} />
    </Suspense>
  );
}
