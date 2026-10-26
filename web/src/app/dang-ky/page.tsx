import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Đăng ký | Nihongo+",
  description: "Tạo tài khoản Nihongo+ miễn phí: lộ trình cá nhân, bài tập và theo dõi tiến độ.",
};

export default function Page() {
  return (
    <PageShell cta={false}>
      <Suspense fallback={<div className="min-h-[70vh]" />}>
        <AuthForm mode="register" />
      </Suspense>
    </PageShell>
  );
}
