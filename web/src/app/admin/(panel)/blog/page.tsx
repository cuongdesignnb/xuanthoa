import { Suspense } from "react";
import BlogAdmin from "@/components/admin/blog/BlogAdmin";
import { Spinner } from "@/components/admin/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
      <BlogAdmin />
    </Suspense>
  );
}
