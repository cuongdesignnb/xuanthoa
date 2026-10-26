import { Suspense } from "react";
import LessonEditor from "@/components/admin/courses/LessonEditor";
import { Spinner } from "@/components/admin/ui";

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LessonEditor id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <Inner params={params} />
    </Suspense>
  );
}
