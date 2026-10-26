import { Suspense } from "react";
import QuizEditor from "@/components/admin/quizzes/QuizEditor";
import { Spinner } from "@/components/admin/ui";

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizEditor id={id} kind="jlpt" />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <Inner params={params} />
    </Suspense>
  );
}
