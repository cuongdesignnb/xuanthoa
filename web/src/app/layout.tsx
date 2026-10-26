import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Dancing_Script, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const sans = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const script = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700"],
});

const jp = Noto_Serif_JP({
  variable: "--font-jp",
  weight: ["500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Nihongo+ | Học tiếng Nhật online bài bản, có lộ trình rõ ràng",
  description:
    "Chương trình học tiếng Nhật online dành riêng cho người Việt: lộ trình N5 – N1, bài tập theo chủ đề, giáo viên tận tâm.",
};

export const viewport: Viewport = {
  themeColor: "#e5383b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${sans.variable} ${script.variable} ${jp.variable} antialiased scroll-smooth`}
    >
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
