import { redirect } from "next/navigation";

/**
 * Orders list URL redirects to Transactions (merged orders + invoices view).
 * Order detail stays at /admin/ecommerce/orders/[id]; Import at /admin/ecommerce/orders/import.
 */
export default function EcommerceOrdersPage() {
  redirect("/admin/ecommerce/transactions");
}
