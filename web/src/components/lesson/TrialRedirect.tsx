"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/hooks";

/** "Học thử": chuyển tới bài học miễn phí nổi bật nhất (lấy từ API). */
export default function TrialRedirect() {
  const router = useRouter();
  const { data, error } = useApi<{ items: { slug: string }[] }>("/public/lessons/highlights?limit=1");
  const slug = data?.items[0]?.slug;
  useEffect(() => {
    if (slug) router.replace(`/hoc/${slug}`);
  }, [slug, router]);
  const empty = error || (data && !slug);
  return (
    <div className="grid min-h-[70vh] place-items-center pt-24 text-center">
      {empty ? (
        <div>
          <p className="font-semibold">Hiện chưa có bài học thử.</p>
          <Link href="/khoa-hoc" className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
            Xem các khóa học
          </Link>
        </div>
      ) : (
        <div className="size-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
      )}
    </div>
  );
}
