import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Đăng nhập | Nihongo+",
  description: "Đăng nhập Nihongo+ để tiếp tục học tiếng Nhật và lưu tiến độ của bạn.",
};

export default function Page() {
  return (
    <PageShell cta={false}>
      <Suspense fallback={<div className="min-h-[70vh]" />}>
        <AuthForm mode="login" />
      </Suspense>
    </PageShell>
  );
}
