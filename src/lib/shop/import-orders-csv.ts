/**
 * Step 48: Generic CSV order import with column mapping.
 * Map CSV columns to order fields; create orders + order_items (placeholder product for line).
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getContactByEmail } from "@/lib/supabase/crm";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Mapping keys: column index in each row. */
export const ORDER_IMPORT_FIELDS = [
  "customer_email",
  "total",
  "currency",
  "order_date",
  "status",
  "order_number",
  "line_description",
  "line_amount",
] as const;

export type OrderImportField = (typeof ORDER_IMPORT_FIELDS)[number];

function trim(s: string): string {
  return s?.trim() ?? "";
}

function parseDecimal(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function getOrCreateImportedCsvProductContentId(schema: string): Promise<string> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema || CONTENT_SCHEMA;

  const { data: typeRow } = await supabase
    .schema(schemaName)
    .from("content_types")
    .select("id")
    .eq("slug", "product")
    .maybeSingle();
  if (!typeRow) throw new Error("Content type product not found");

  const { data: existing } = await supabase
    .schema(schemaName)
    .from("content")
    .select("id")
    .eq("content_type_id", typeRow.id)
    .eq("slug", "imported-csv")
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: contentRow, error: contentError } = await supabase
    .schema(schemaName)
    .from("content")
    .insert({
      content_type_id: typeRow.id,
      title: "Imported (CSV)",
      slug: "imported-csv",
      body: null,
      excerpt: null,
      featured_image_id: null,
      status: "draft",
      published_at: null,
    })
    .select("id")
    .single();
  if (contentError || !contentRow) {
    console.error("getOrCreateImportedCsvProductContentId content:", contentError);
    throw new Error("Failed to create placeholder content");
  }
  const contentId = (contentRow as { id: string }).id;

  const { error: productError } = await supabase
    .schema(schemaName)
    .from("product")
    .insert({
      content_id: contentId,
      price: 0,
      currency: "USD",
      stripe_product_id: null,
      stripe_price_id: null,
      taxable: false,
      shippable: false,
      available_for_purchase: false,
      is_recurring: false,
      billing_interval: null,
    });
  if (productError) {
    console.error("getOrCreateImportedCsvProductContentId product:", productError);
    await supabase.schema(schemaName).from("content").delete().eq("id", contentId);
    throw new Error("Failed to create placeholder product");
  }
  return contentId;
}

export interface ImportOrdersFromCsvResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

/**
 * Create orders from CSV rows using column index mapping.
 * Required mapping: customer_email, total.
 * Optional: currency, order_date, status, order_number (idempotency), line_description, line_amount.
 */
export async function importOrdersFromCsvRows(
  rows: string[][],
  mapping: Record<string, number>,
  schema?: string
): Promise<ImportOrdersFromCsvResult> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const result: ImportOrdersFromCsvResult = { created: 0, skipped: 0, errors: [] };
  const placeholderContentId = await getOrCreateImportedCsvProductContentId(schemaName);

  const emailCol = mapping.customer_email;
  const totalCol = mapping.total;
  if (emailCol == null || totalCol == null) {
    result.errors.push({ row: 0, message: "Mapping must include customer_email and total" });
    return result;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const email = trim(String(row[emailCol] ?? ""));
    if (!email) {
      result.errors.push({ row: i + 2, message: "Missing customer email" });
      continue;
    }

    const orderNumber = mapping.order_number != null ? trim(String(row[mapping.order_number] ?? "")) : "";
    if (orderNumber) {
      const { data: existing } = await supabase
        .schema(schemaName)
        .from("orders")
        .select("id")
        .eq("woocommerce_order_id", orderNumber)
        .maybeSingle();
      if (existing) {
        result.skipped += 1;
        continue;
      }
    }

    const total = parseDecimal(String(row[totalCol] ?? "0"));
    const currency = mapping.currency != null
      ? (trim(String(row[mapping.currency] ?? "USD")) || "USD").toUpperCase()
      : "USD";
    const status = mapping.status != null
      ? (trim(String(row[mapping.status] ?? "paid")) || "paid")
      : "paid";

    let contactId: string | null = null;
    const contact = await getContactByEmail(email);
    if (contact) contactId = contact.id;

    const orderInsert: Record<string, unknown> = {
      customer_email: email,
      contact_id: contactId,
      user_id: null,
      status,
      total,
      currency,
      stripe_checkout_session_id: null,
      stripe_invoice_id: null,
      woocommerce_order_id: orderNumber || null,
      billing_snapshot: null,
      shipping_snapshot: null,
      coupon_code: null,
      coupon_batch_id: null,
      discount_amount: 0,
    };

    const { data: orderRow, error: orderError } = await supabase
      .schema(schemaName)
      .from("orders")
      .insert(orderInsert)
      .select("id")
      .single();

    if (orderError || !orderRow) {
      result.errors.push({
        row: i + 2,
        message: orderError?.message ?? "Failed to create order",
      });
      continue;
    }
    const orderId = (orderRow as { id: string }).id;

    const lineDesc = mapping.line_description != null ? trim(String(row[mapping.line_description] ?? "")) : "";
    const lineAmt = mapping.line_amount != null ? parseDecimal(String(row[mapping.line_amount] ?? "")) : total;
    const nameSnapshot = lineDesc || "Order total";
    const lineTotal = mapping.line_amount != null ? lineAmt : total;
    const quantity = 1;
    const unitPrice = lineTotal;

    const { error: itemError } = await supabase
      .schema(schemaName)
      .from("order_items")
      .insert({
        order_id: orderId,
        content_id: placeholderContentId,
        name_snapshot: nameSnapshot.slice(0, 500),
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        shippable: false,
        downloadable: false,
      });

    if (itemError) {
      result.errors.push({
        row: i + 2,
        message: "Order created but failed to create order item",
      });
      await supabase.schema(schemaName).from("orders").delete().eq("id", orderId);
      continue;
    }
    result.created += 1;
  }
  return result;
}
