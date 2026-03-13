/**
 * Step 49: Export orders for accounting (CSV).
 * Date range and status filters; columns suitable for QuickBooks, Xero, etc.
 */

import {
  listOrdersForExport,
  getOrderItems,
  type OrderRow,
  type OrderItemRow,
  type ListOrdersForExportParams,
} from "@/lib/shop/orders";
import { getContactById } from "@/lib/supabase/crm";

function csvEscape(value: string): string {
  const s = String(value ?? "").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatLineItems(items: OrderItemRow[]): string {
  return items
    .map((i) => `${i.name_snapshot},${i.quantity},${Number(i.line_total).toFixed(2)}`)
    .join("; ");
}

/**
 * Build one row of CSV for an order (one row per order; line items summarized in one column).
 */
function orderToCsvRow(
  order: OrderRow,
  items: OrderItemRow[],
  customerName: string
): string[] {
  const date = order.created_at ? new Date(order.created_at).toISOString().slice(0, 10) : "";
  const subtotal = Number(order.total) + Number(order.discount_amount ?? 0);
  const discount = Number(order.discount_amount ?? 0);
  const lineItems = formatLineItems(items);
  return [
    date,
    order.id,
    order.customer_email ?? "",
    customerName,
    lineItems,
    subtotal.toFixed(2),
    discount.toFixed(2),
    Number(order.total).toFixed(2),
    order.currency ?? "USD",
    order.stripe_checkout_session_id ?? "",
    order.stripe_invoice_id ?? "",
  ];
}

const CSV_HEADERS = [
  "date",
  "order_id",
  "customer_email",
  "customer_name",
  "line_items",
  "subtotal",
  "discount",
  "total",
  "currency",
  "stripe_checkout_session_id",
  "stripe_invoice_id",
];

export interface ExportOrdersCsvResult {
  csv: string;
  rowCount: number;
}

/**
 * Step 49: Export orders as CSV for accounting. Fetches orders (with date/status filter),
 * resolves contact name per order, builds one CSV row per order with line items summarized.
 */
export async function exportOrdersAsCsv(
  params: ListOrdersForExportParams,
  schema?: string
): Promise<ExportOrdersCsvResult> {
  const orders = await listOrdersForExport(params, schema);
  const rows: string[][] = [CSV_HEADERS];

  for (const order of orders) {
    const items = await getOrderItems(order.id, schema);
    let customerName = "";
    if (order.contact_id) {
      const contact = await getContactById(order.contact_id);
      if (contact) {
        if (contact.full_name?.trim()) customerName = contact.full_name.trim();
        else if (contact.first_name || contact.last_name) {
          customerName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
        }
        if (!customerName && contact.email) customerName = contact.email;
      }
    }
    if (!customerName) customerName = order.customer_email ?? "";
    rows.push(orderToCsvRow(order, items, customerName));
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  return { csv, rowCount: orders.length };
}
