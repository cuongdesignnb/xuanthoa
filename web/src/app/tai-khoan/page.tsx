import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import AccountPage from "@/components/account/AccountPage";

export const metadata: Metadata = {
  title: "Tài khoản của tôi | Nihongo+",
  description: "Quản lý hồ sơ, mật khẩu, yêu cầu hỗ trợ và thông báo của bạn trên Nihongo+.",
};

export default function Page() {
  return (
    <PageShell user cta={false}>
      <Suspense fallback={<div className="min-h-[70vh]" />}>
        <AccountPage />
      </Suspense>
    </PageShell>
  );
}
