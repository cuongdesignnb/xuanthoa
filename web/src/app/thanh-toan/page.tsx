import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site";
import Checkout from "@/components/checkout/Checkout";

export const metadata: Metadata = {
  title: "Thanh toán | Nihongo+",
  description: "Thanh toán gói học hoặc khóa học Nihongo+ qua VNPAY, MoMo, chuyển khoản hoặc thẻ.",
};

export default function CheckoutPage() {
  return (
    <PageShell cta={false}>
      <Suspense
        fallback={
          <div className="grid min-h-[70vh] place-items-center pt-24">
            <div className="size-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
          </div>
        }
      >
        <Checkout />
      </Suspense>
    </PageShell>
  );
}
