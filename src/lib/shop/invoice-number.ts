/**
 * Shared invoice/order number generator (one sequence per tenant).
 * Used for invoices.invoice_number and orders.order_number.
 * DB: INV-YYYY-NNNNN; numeric segment resets to start_number each UTC calendar year (migration 194).
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/**
 * Get the next formatted number from the shared sequence (e.g. INV-2026-00015).
 * Call when creating an invoice (before send) or when creating an order.
 */
export async function getNextInvoiceOrderNumber(
  schema?: string
): Promise<string> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .rpc("get_next_invoice_order_number")
    .single();

  if (error || !data || typeof data !== "string") {
    console.error("getNextInvoiceOrderNumber:", error ?? "no data");
    throw new Error("Failed to generate invoice/order number");
  }
  return data;
}
