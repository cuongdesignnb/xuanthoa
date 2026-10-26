import { Suspense } from "react";
import CouponsAdmin from "@/components/admin/commerce/CouponsAdmin";
import { Spinner } from "@/components/admin/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <CouponsAdmin />
    </Suspense>
  );
}
