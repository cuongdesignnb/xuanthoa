import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Package,
  PieChart,
  Receipt,
  Settings,
  ShieldCheck,
  SquarePlay,
  Tag,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Quyền cần có (module.read). */
  perm: string;
  /** Mục con hiển thị khi mở rộng. */
  children?: { label: string; href: string }[];
};

/** Menu sidebar admin — đúng thứ tự trong ảnh tham chiếu. */
export const ADMIN_NAV: NavItem[] = [
  { label: "Tổng quan", href: "/admin", icon: LayoutDashboard, perm: "dashboard.read" },
  {
    label: "Học viên",
    href: "/admin/hoc-vien",
    icon: Users,
    perm: "students.read",
    children: [
      { label: "Danh sách học viên", href: "/admin/hoc-vien" },
      { label: "Lượt làm bài", href: "/admin/hoc-vien/luot-lam-bai" },
    ],
  },
  { label: "Giáo viên", href: "/admin/giao-vien", icon: UserRound, perm: "teachers.read" },
  {
    label: "Khóa học",
    href: "/admin/khoa-hoc",
    icon: BookOpen,
    perm: "courses.read",
    children: [
      { label: "Tất cả khóa học", href: "/admin/khoa-hoc" },
      { label: "Tạo khóa học", href: "/admin/khoa-hoc/moi" },
    ],
  },
  { label: "Bài học", href: "/admin/bai-hoc", icon: FileText, perm: "courses.read" },
  { label: "Bài tập", href: "/admin/bai-tap", icon: ClipboardList, perm: "quizzes.read" },
  {
    label: "JLPT & Đề thi",
    href: "/admin/de-thi",
    icon: Trophy,
    perm: "quizzes.read",
    children: [
      { label: "Bộ đề JLPT", href: "/admin/de-thi" },
      { label: "Tạo đề bằng AI", href: "/admin/de-thi/ai" },
    ],
  },
  { label: "Blog & Tài nguyên", href: "/admin/blog", icon: GraduationCap, perm: "posts.read" },
  { label: "Đơn hàng", href: "/admin/don-hang", icon: Receipt, perm: "orders.read" },
  { label: "Gói học / Subscription", href: "/admin/goi-hoc", icon: Package, perm: "plans.read" },
  { label: "Doanh thu", href: "/admin/doanh-thu", icon: PieChart, perm: "orders.read" },
  { label: "Mã giảm giá", href: "/admin/ma-giam-gia", icon: Tag, perm: "coupons.read" },
  { label: "Thông báo", href: "/admin/thong-bao", icon: Megaphone, perm: "notifications.read" },
  { label: "Đánh giá & Báo lỗi", href: "/admin/danh-gia", icon: MessageSquareWarning, perm: "moderation.read" },
  { label: "Phân quyền nhân sự", href: "/admin/nhan-su", icon: ShieldCheck, perm: "staff.read" },
  { label: "Báo cáo", href: "/admin/bao-cao", icon: BarChart3, perm: "reports.read" },
  { label: "Cài đặt hệ thống", href: "/admin/cai-dat", icon: Settings, perm: "settings.read" },
];

/** Nhóm "Hỗ trợ & hệ thống" ở cuối sidebar. */
export const ADMIN_NAV_SYSTEM: NavItem[] = [
  { label: "Media Library", href: "/admin/media", icon: ImageIcon, perm: "media.read" },
  { label: "Video bài giảng", href: "/admin/video", icon: SquarePlay, perm: "media.read" },
  { label: "Trung tâm hỗ trợ", href: "/admin/ho-tro", icon: HelpCircle, perm: "support.read" },
  { label: "Log hoạt động", href: "/admin/nhat-ky", icon: History, perm: "logs.read" },
];

export const ALL_ADMIN_NAV = [...ADMIN_NAV, ...ADMIN_NAV_SYSTEM];

/** Tiêu đề topbar theo đường dẫn (mục khớp dài nhất). */
export function navFor(path: string) {
  return [...ALL_ADMIN_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => (n.href === "/admin" ? path === "/admin" : path === n.href || path.startsWith(n.href + "/")));
}
