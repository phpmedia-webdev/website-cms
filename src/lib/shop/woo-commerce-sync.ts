/**
 * Step 47: WooCommerce → CRM customers and order history.
 * Import via WooCommerce REST API (site URL + consumer key/secret).
 * Map customers to CRM contacts (external_ecommerce_id); orders to orders + order_items (simplified line items).
 * Idempotent by WooCommerce customer ID and order ID.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import {
  getContactByExternalId,
  getContactByEmail,
  createContact,
  updateContact,
} from "@/lib/supabase/crm";
import { CRM_STATUS_SLUG_NEW } from "@/lib/supabase/settings";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** WooCommerce REST API config (wc/v3). */
export interface WooCommerceConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

function normalizeBaseUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  if (/\/wp-json\/wc\/v3\/?$/i.test(base)) return base.replace(/\/?$/, "");
  return `${base}/wp-json/wc/v3`;
}

async function wooFetch<T>(
  config: WooCommerceConfig,
  path: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const base = normalizeBaseUrl(config.siteUrl);
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => search.set(k, String(v)));
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}?${search.toString()}`;
  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WooCommerce API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** WC Customer (minimal fields we use). */
interface WCCustomer {
  id: number;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  billing?: {
    address_1?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  };
}

/** WC Order (minimal fields we use). */
interface WCOrder {
  id: number;
  status?: string | null;
  total?: string | null;
  currency?: string | null;
  date_created?: string | null;
  customer_id?: number | null;
  billing?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    address_1?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  };
  line_items?: Array<{
    name?: string | null;
    product_id?: number | null;
    quantity?: number | null;
    subtotal?: string | null;
    total?: string | null;
  }>;
}

function parseDecimal(s: string | null | undefined): number {
  if (s == null || s === "") return 0;
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Get or create a placeholder content + product row for imported WooCommerce line items.
 * Returns content_id to use as order_items.content_id.
 */
async function getOrCreateImportedWooProductContentId(schema: string): Promise<string> {
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
    .eq("slug", "imported-woocommerce")
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: contentRow, error: contentError } = await supabase
    .schema(schemaName)
    .from("content")
    .insert({
      content_type_id: typeRow.id,
      title: "Imported (WooCommerce)",
      slug: "imported-woocommerce",
      body: null,
      excerpt: null,
      featured_image_id: null,
      status: "draft",
      published_at: null,
    })
    .select("id")
    .single();
  if (contentError || !contentRow) {
    console.error("getOrCreateImportedWooProductContentId content:", contentError);
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
    console.error("getOrCreateImportedWooProductContentId product:", productError);
    await supabase.schema(schemaName).from("content").delete().eq("id", contentId);
    throw new Error("Failed to create placeholder product");
  }
  return contentId;
}

export interface WooSyncCustomersResult {
  created: number;
  updated: number;
  errors: Array<{ wc_customer_id: string; error: string }>;
}

/**
 * Fetch all WooCommerce customers and sync to CRM (find or create contact, set external_ecommerce_id).
 */
export async function syncWooCommerceCustomersToCrm(
  config: WooCommerceConfig,
  schema?: string
): Promise<WooSyncCustomersResult> {
  const result: WooSyncCustomersResult = { created: 0, updated: 0, errors: [] };
  let page = 1;
  const perPage = 100;

  while (true) {
    const list = (await wooFetch<WCCustomer[]>(config, "/customers", {
      per_page: perPage,
      page,
    })) as WCCustomer[];
    if (!Array.isArray(list) || list.length === 0) break;

    for (const wc of list) {
      const wcId = String(wc.id);
      const email = wc.email?.trim() || null;
      if (!email) {
        result.errors.push({ wc_customer_id: wcId, error: "No email" });
        continue;
      }
      try {
        const existingByEcom = await getContactByExternalId("ecommerce", wcId);
        if (existingByEcom) {
          const billing = wc.billing;
          await updateContact(existingByEcom.id, {
            first_name: wc.first_name?.trim() || null,
            last_name: wc.last_name?.trim() || null,
            address: billing?.address_1?.trim() || null,
            city: billing?.city?.trim() || null,
            state: billing?.state?.trim() || null,
            postal_code: billing?.postcode?.trim() || null,
            country: billing?.country?.trim() || null,
          });
          result.updated += 1;
          continue;
        }
        const existingByEmail = await getContactByEmail(email);
        if (existingByEmail) {
          await updateContact(existingByEmail.id, {
            external_ecommerce_id: wcId,
            first_name: wc.first_name?.trim() || null,
            last_name: wc.last_name?.trim() || null,
            address: wc.billing?.address_1?.trim() || null,
            city: wc.billing?.city?.trim() || null,
            state: wc.billing?.state?.trim() || null,
            postal_code: wc.billing?.postcode?.trim() || null,
            country: wc.billing?.country?.trim() || null,
          });
          result.updated += 1;
          continue;
        }
        const { error } = await createContact({
          email,
          first_name: wc.first_name?.trim() || null,
          last_name: wc.last_name?.trim() || null,
          address: wc.billing?.address_1?.trim() || null,
          city: wc.billing?.city?.trim() || null,
          state: wc.billing?.state?.trim() || null,
          postal_code: wc.billing?.postcode?.trim() || null,
          country: wc.billing?.country?.trim() || null,
          external_ecommerce_id: wcId,
          status: CRM_STATUS_SLUG_NEW,
          source: "woocommerce_import",
        });
        if (error) result.errors.push({ wc_customer_id: wcId, error: error.message });
        else result.created += 1;
      } catch (e) {
        result.errors.push({
          wc_customer_id: wcId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    if (list.length < perPage) break;
    page += 1;
  }
  return result;
}

/** Map WC order status to our status. */
function mapOrderStatus(wcStatus: string | null | undefined): string {
  const s = (wcStatus || "").toLowerCase();
  if (s === "completed") return "completed";
  if (s === "processing") return "processing";
  if (s === "on-hold" || s === "pending" || s === "cancelled" || s === "refunded" || s === "failed")
    return "pending";
  return "paid";
}

export interface WooSyncOrdersResult {
  created: number;
  skipped: number;
  errors: Array<{ woocommerce_order_id: string; error: string }>;
}

/**
 * Fetch WooCommerce orders and create app orders + order_items. Idempotent by woocommerce_order_id.
 */
export async function syncWooCommerceOrdersToApp(
  config: WooCommerceConfig,
  schema?: string
): Promise<WooSyncOrdersResult> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const result: WooSyncOrdersResult = { created: 0, skipped: 0, errors: [] };
  const placeholderContentId = await getOrCreateImportedWooProductContentId(schemaName);
  let page = 1;
  const perPage = 100;

  while (true) {
    const list = (await wooFetch<WCOrder[]>(config, "/orders", {
      per_page: perPage,
      page,
      status: "any",
    })) as WCOrder[];
    if (!Array.isArray(list) || list.length === 0) break;

    for (const wo of list) {
      const wcOrderId = String(wo.id);
      const { data: existing } = await supabase
        .schema(schemaName)
        .from("orders")
        .select("id")
        .eq("woocommerce_order_id", wcOrderId)
        .maybeSingle();
      if (existing) {
        result.skipped += 1;
        continue;
      }

      const email = wo.billing?.email?.trim() || null;
      if (!email) {
        result.errors.push({ woocommerce_order_id: wcOrderId, error: "No billing email" });
        continue;
      }

      let contactId: string | null = null;
      if (wo.customer_id) {
        const contact = await getContactByExternalId("ecommerce", String(wo.customer_id));
        if (contact) contactId = contact.id;
      }
      if (!contactId) {
        const contact = await getContactByEmail(email);
        if (contact) contactId = contact.id;
      }

      const total = parseDecimal(wo.total);
      const currency = (wo.currency || "USD").toUpperCase();
      const status = mapOrderStatus(wo.status);

      const { data: orderRow, error: orderError } = await supabase
        .schema(schemaName)
        .from("orders")
        .insert({
          customer_email: email,
          contact_id: contactId,
          user_id: null,
          status,
          total,
          currency,
          stripe_checkout_session_id: null,
          stripe_invoice_id: null,
          woocommerce_order_id: wcOrderId,
          billing_snapshot: wo.billing
            ? {
                name: [wo.billing.first_name, wo.billing.last_name].filter(Boolean).join(" ") || null,
                address: wo.billing.address_1 ?? null,
                city: wo.billing.city ?? null,
                state: wo.billing.state ?? null,
                postal_code: wo.billing.postcode ?? null,
                country: wo.billing.country ?? null,
              }
            : null,
          shipping_snapshot: null,
          coupon_code: null,
          coupon_batch_id: null,
          discount_amount: 0,
        })
        .select("id")
        .single();

      if (orderError || !orderRow) {
        result.errors.push({
          woocommerce_order_id: wcOrderId,
          error: orderError?.message ?? "Failed to create order",
        });
        continue;
      }
      const orderId = (orderRow as { id: string }).id;

      const lines = wo.line_items ?? [];
      if (lines.length === 0) {
        const { error: itemError } = await supabase
          .schema(schemaName)
          .from("order_items")
          .insert({
            order_id: orderId,
            content_id: placeholderContentId,
            name_snapshot: "Order total",
            quantity: 1,
            unit_price: total,
            line_total: total,
            shippable: false,
            downloadable: false,
          });
        if (itemError) {
          result.errors.push({
            woocommerce_order_id: wcOrderId,
            error: "Order created but failed to create line item",
          });
          await supabase.schema(schemaName).from("orders").delete().eq("id", orderId);
          continue;
        }
      } else {
        const rows = lines.map((line) => {
          const qty = Math.max(1, Number(line.quantity) || 1);
          const lineTotal = parseDecimal(line.total) || parseDecimal(line.subtotal);
          const unitPrice = qty > 0 ? lineTotal / qty : 0;
          return {
            order_id: orderId,
            content_id: placeholderContentId,
            name_snapshot: (line.name || "Item").slice(0, 500),
            quantity: qty,
            unit_price: unitPrice,
            line_total: lineTotal,
            shippable: false,
            downloadable: false,
          };
        });
        const { error: itemsError } = await supabase
          .schema(schemaName)
          .from("order_items")
          .insert(rows);
        if (itemsError) {
          result.errors.push({
            woocommerce_order_id: wcOrderId,
            error: "Order created but failed to create order items",
          });
          await supabase.schema(schemaName).from("orders").delete().eq("id", orderId);
          continue;
        }
      }
      result.created += 1;
    }
    if (list.length < perPage) break;
    page += 1;
  }
  return result;
}

export interface WooSyncAllResult {
  customers: WooSyncCustomersResult;
  orders: WooSyncOrdersResult;
}

/**
 * Sync WooCommerce customers then orders. Run customers first so orders can link contact_id.
 */
export async function syncWooCommerceToApp(
  config: WooCommerceConfig,
  schema?: string
): Promise<WooSyncAllResult> {
  const customers = await syncWooCommerceCustomersToCrm(config, schema);
  const orders = await syncWooCommerceOrdersToApp(config, schema);
  return { customers, orders };
}

// ==================== CSV import (preferred for Step 47) ====================

/** Parse CSV text into rows with header keys. Handles quoted fields. */
function parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let end = i + 1;
      let s = "";
      while (end < line.length) {
        if (line[end] === '"') {
          end++;
          if (line[end] === '"') {
            s += '"';
            end++;
          } else break;
        } else {
          s += line[end++];
        }
      }
      out.push(s);
      i = end;
      if (line[i] === ",") i++;
    } else {
      const comma = line.indexOf(",", i);
      const value = comma === -1 ? line.slice(i) : line.slice(i, comma);
      out.push(value.trim());
      i = comma === -1 ? line.length : comma + 1;
    }
  }
  return out;
}

/** Get value from row by trying possible column names (case-insensitive, trim). */
function getCol(row: Record<string, string>, ...possibleNames: string[]): string {
  const keys = Object.keys(row);
  const lower = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  for (const name of possibleNames) {
    const n = lower(name);
    const k = keys.find((key) => lower(key) === n || lower(key).replace(/\s/g, "_") === n.replace(/\s/g, "_"));
    if (k && row[k] != null) return String(row[k]).trim();
  }
  return "";
}

/**
 * Import WooCommerce customers from CSV. Map common export columns to contacts.
 * Idempotent by external_ecommerce_id (Customer ID column) or email.
 */
export async function syncWooCommerceCustomersFromCsv(
  csvText: string,
  schema?: string
): Promise<WooSyncCustomersResult> {
  const result: WooSyncCustomersResult = { created: 0, updated: 0, errors: [] };
  const { rows } = parseCsv(csvText);
  if (rows.length === 0) return result;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const wcId = getCol(
      row,
      "Customer ID",
      "Customer Id",
      "customer_id",
      "Id",
      "ID"
    );
    const email = getCol(
      row,
      "Email",
      "Customer Email",
      "billing_email",
      "Billing Email"
    );
    if (!email) {
      result.errors.push({ wc_customer_id: wcId || `row ${i + 2}`, error: "No email" });
      continue;
    }
    try {
      const existingByEcom = wcId ? await getContactByExternalId("ecommerce", wcId) : null;
      if (existingByEcom) {
        await updateContact(existingByEcom.id, {
          first_name: getCol(row, "First Name", "first_name", "Billing First Name") || null,
          last_name: getCol(row, "Last Name", "last_name", "Billing Last Name") || null,
          address: getCol(row, "Billing Address 1", "Billing Address", "address_1", "Address 1") || null,
          city: getCol(row, "Billing City", "City", "city") || null,
          state: getCol(row, "Billing State", "State", "state") || null,
          postal_code: getCol(row, "Billing Postcode", "Billing Zip", "Postcode", "postal_code") || null,
          country: getCol(row, "Billing Country", "Country", "country") || null,
        });
        result.updated += 1;
        continue;
      }
      const existingByEmail = await getContactByEmail(email);
      if (existingByEmail) {
        await updateContact(existingByEmail.id, {
          external_ecommerce_id: wcId || null,
          first_name: getCol(row, "First Name", "first_name", "Billing First Name") || null,
          last_name: getCol(row, "Last Name", "last_name", "Billing Last Name") || null,
          address: getCol(row, "Billing Address 1", "Billing Address", "address_1") || null,
          city: getCol(row, "Billing City", "City", "city") || null,
          state: getCol(row, "Billing State", "State", "state") || null,
          postal_code: getCol(row, "Billing Postcode", "Billing Zip", "Postcode") || null,
          country: getCol(row, "Billing Country", "Country", "country") || null,
        });
        result.updated += 1;
        continue;
      }
      const { error } = await createContact({
        email,
        first_name: getCol(row, "First Name", "first_name", "Billing First Name") || null,
        last_name: getCol(row, "Last Name", "last_name", "Billing Last Name") || null,
        address: getCol(row, "Billing Address 1", "Billing Address", "address_1") || null,
        city: getCol(row, "Billing City", "City", "city") || null,
        state: getCol(row, "Billing State", "State", "state") || null,
        postal_code: getCol(row, "Billing Postcode", "Billing Zip", "Postcode") || null,
        country: getCol(row, "Billing Country", "Country", "country") || null,
        external_ecommerce_id: wcId || null,
        status: CRM_STATUS_SLUG_NEW,
        source: "woocommerce_import",
      });
      if (error) result.errors.push({ wc_customer_id: wcId || email, error: error.message });
      else result.created += 1;
    } catch (e) {
      result.errors.push({
        wc_customer_id: wcId || `row ${i + 2}`,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return result;
}

/**
 * Import WooCommerce orders from CSV. Map common export columns to orders + order_items.
 * Idempotent by woocommerce_order_id (Order Number / Order ID column).
 */
export async function syncWooCommerceOrdersFromCsv(
  csvText: string,
  schema?: string
): Promise<WooSyncOrdersResult> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const result: WooSyncOrdersResult = { created: 0, skipped: 0, errors: [] };
  const { rows } = parseCsv(csvText);
  if (rows.length === 0) return result;

  const placeholderContentId = await getOrCreateImportedWooProductContentId(schemaName);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const wcOrderId = getCol(
      row,
      "Order Number",
      "Order Id",
      "Order ID",
      "order_id",
      "Id",
      "ID"
    );
    if (!wcOrderId) {
      result.errors.push({ woocommerce_order_id: `row ${i + 2}`, error: "No order ID" });
      continue;
    }

    const { data: existing } = await supabase
      .schema(schemaName)
      .from("orders")
      .select("id")
      .eq("woocommerce_order_id", wcOrderId)
      .maybeSingle();
    if (existing) {
      result.skipped += 1;
      continue;
    }

    const email = getCol(
      row,
      "Billing Email",
      "Email",
      "Customer Email",
      "billing_email"
    );
    if (!email) {
      result.errors.push({ woocommerce_order_id: wcOrderId, error: "No billing email" });
      continue;
    }

    let contactId: string | null = null;
    const customerId = getCol(row, "Customer ID", "Customer Id", "customer_id");
    if (customerId) {
      const contact = await getContactByExternalId("ecommerce", customerId);
      if (contact) contactId = contact.id;
    }
    if (!contactId) {
      const contact = await getContactByEmail(email);
      if (contact) contactId = contact.id;
    }

    const total = parseDecimal(
      getCol(row, "Order Total", "Total", "order_total", "Total (inc. tax)")
    );
    const currency = (getCol(row, "Currency", "currency") || "USD").toUpperCase();
    const status = mapOrderStatus(
      getCol(row, "Status", "Order Status", "status")
    );

    const billingSnapshot = {
      name: [
        getCol(row, "Billing First Name", "First Name"),
        getCol(row, "Billing Last Name", "Last Name"),
      ]
        .filter(Boolean)
        .join(" ") || null,
      address: getCol(row, "Billing Address 1", "Billing Address", "Address 1") || null,
      city: getCol(row, "Billing City", "City") || null,
      state: getCol(row, "Billing State", "State") || null,
      postal_code: getCol(row, "Billing Postcode", "Billing Zip", "Postcode") || null,
      country: getCol(row, "Billing Country", "Country") || null,
    };

    const { data: orderRow, error: orderError } = await supabase
      .schema(schemaName)
      .from("orders")
      .insert({
        customer_email: email,
        contact_id: contactId,
        user_id: null,
        status,
        total,
        currency,
        stripe_checkout_session_id: null,
        stripe_invoice_id: null,
        woocommerce_order_id: wcOrderId,
        billing_snapshot: Object.keys(billingSnapshot).length ? billingSnapshot : null,
        shipping_snapshot: null,
        coupon_code: null,
        coupon_batch_id: null,
        discount_amount: 0,
      })
      .select("id")
      .single();

    if (orderError || !orderRow) {
      result.errors.push({
        woocommerce_order_id: wcOrderId,
        error: orderError?.message ?? "Failed to create order",
      });
      continue;
    }
    const orderId = (orderRow as { id: string }).id;

    const lineItems: { name: string; quantity: number; total: number }[] = [];
    let itemIndex = 1;
    while (true) {
      const name = getCol(
        row,
        `Line Item ${itemIndex} Name`,
        `Item ${itemIndex} Name`,
        `Product ${itemIndex}`,
        `Item ${itemIndex}`
      );
      if (!name) break;
      const qty = Math.max(1, parseInt(getCol(row, `Line Item ${itemIndex} Qty`, `Item ${itemIndex} Qty`, `Qty ${itemIndex}`), 10) || 1);
      const itemTotal = parseDecimal(
        getCol(row, `Line Item ${itemIndex} Total`, `Item ${itemIndex} Total`, `Total ${itemIndex}`)
      );
      lineItems.push({ name, quantity: qty, total: itemTotal });
      itemIndex++;
    }

    if (lineItems.length === 0) {
      const { error: itemError } = await supabase
        .schema(schemaName)
        .from("order_items")
        .insert({
          order_id: orderId,
          content_id: placeholderContentId,
          name_snapshot: "Order total",
          quantity: 1,
          unit_price: total,
          line_total: total,
          shippable: false,
          downloadable: false,
        });
      if (itemError) {
        result.errors.push({
          woocommerce_order_id: wcOrderId,
          error: "Order created but failed to create line item",
        });
        await supabase.schema(schemaName).from("orders").delete().eq("id", orderId);
        continue;
      }
    } else {
      const rowsToInsert = lineItems.map((item) => ({
        order_id: orderId,
        content_id: placeholderContentId,
        name_snapshot: item.name.slice(0, 500),
        quantity: item.quantity,
        unit_price: item.quantity > 0 ? item.total / item.quantity : 0,
        line_total: item.total,
        shippable: false,
        downloadable: false,
      }));
      const { error: itemsError } = await supabase
        .schema(schemaName)
        .from("order_items")
        .insert(rowsToInsert);
      if (itemsError) {
        result.errors.push({
          woocommerce_order_id: wcOrderId,
          error: "Order created but failed to create order items",
        });
        await supabase.schema(schemaName).from("orders").delete().eq("id", orderId);
        continue;
      }
    }
    result.created += 1;
  }
  return result;
}
