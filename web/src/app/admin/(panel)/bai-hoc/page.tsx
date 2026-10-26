import { Suspense } from "react";
import LessonList from "@/components/admin/courses/LessonList";
import { Spinner } from "@/components/admin/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <LessonList />
    </Suspense>
  );
}
