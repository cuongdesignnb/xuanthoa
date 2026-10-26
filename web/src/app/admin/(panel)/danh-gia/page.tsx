import { Suspense } from "react";
import ModerationAdmin from "@/components/admin/moderation/ModerationAdmin";
import { Spinner } from "@/components/admin/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <ModerationAdmin />
    </Suspense>
  );
}
