import type { Metadata } from "next";
import { AdminProviders } from "@/components/admin/Providers";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Quản trị | Nihongo+", template: "%s | Quản trị Nihongo+" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
