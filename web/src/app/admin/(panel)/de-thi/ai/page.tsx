import { Suspense } from "react";
import AiGenerator from "@/components/admin/quizzes/AiGenerator";
import { Spinner } from "@/components/admin/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <AiGenerator />
    </Suspense>
  );
}
