import { Suspense } from "react";
import QuizList from "@/components/admin/quizzes/QuizList";
import { Spinner } from "@/components/admin/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <QuizList kind="exercise" />
    </Suspense>
  );
}
