import { OrderDetailClient } from "./OrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Step 16: Order detail for admin; view items, addresses, and mark as completed. */
export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetailClient orderId={id} />;
}
