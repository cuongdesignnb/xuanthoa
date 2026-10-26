import { Suspense } from "react";
import OrdersAdmin from "@/components/admin/commerce/OrdersAdmin";
import { Spinner } from "@/components/admin/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <OrdersAdmin />
    </Suspense>
  );
}
