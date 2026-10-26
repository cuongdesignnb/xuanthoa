import { Suspense } from "react";
import TeachersAdmin from "@/components/admin/teachers/TeachersAdmin";
import { Spinner } from "@/components/admin/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <TeachersAdmin />
    </Suspense>
  );
}
