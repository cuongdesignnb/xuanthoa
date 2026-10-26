import { Suspense } from "react";
import CourseEditor from "@/components/admin/courses/CourseEditor";
import { Spinner } from "@/components/admin/ui";

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseEditor id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <Inner params={params} />
    </Suspense>
  );
}
