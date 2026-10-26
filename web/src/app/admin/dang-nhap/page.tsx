import { Suspense } from "react";
import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default function Page() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
