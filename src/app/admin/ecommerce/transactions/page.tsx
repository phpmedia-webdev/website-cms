import { TransactionsPageClient } from "./TransactionsPageClient";

/**
 * Global Transactions view: single filterable list of orders + invoices.
 * Export, Import, Stripe sync, WooCommerce import live under the Actions dropdown.
 */
export default function EcommerceTransactionsPage() {
  return <TransactionsPageClient />;
}
