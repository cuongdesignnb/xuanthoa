import { Suspense } from "react";
import { AdminShell } from "@/components/admin/Shell";

// Khu quản trị chạy phía client sau khi xác thực → điều hướng được phép chờ dữ liệu.
export const instant = false;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
