import { OrdersListClient } from "./OrdersListClient";

/**
 * Orders list: orders table only. Detail at /admin/ecommerce/orders/[id]; Import at /admin/ecommerce/orders/import.
 */
export default function EcommerceOrdersPage() {
  return <OrdersListClient />;
}
