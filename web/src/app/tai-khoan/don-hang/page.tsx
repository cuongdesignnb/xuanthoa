import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import MyOrders from "@/components/account/MyOrders";

export const metadata: Metadata = {
  title: "Đơn hàng của tôi | Nihongo+",
  description: "Lịch sử thanh toán, trạng thái đơn hàng và yêu cầu hoàn tiền.",
};

export default function MyOrdersPage() {
  return (
    <PageShell user cta={false}>
      <MyOrders />
    </PageShell>
  );
}
