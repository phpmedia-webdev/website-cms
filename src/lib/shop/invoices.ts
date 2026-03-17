/**
 * Invoicing: CRUD for invoices and invoice_lines, push to Stripe.
 * Line items reference products from library; line_description is editable per line.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getStripeClient } from "@/lib/stripe/config";
import { getContactByExternalId, getContactById } from "@/lib/supabase/crm";
import { getNextInvoiceOrderNumber } from "./invoice-number";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export type InvoiceStatus = "draft" | "sent" | "open" | "paid";

export interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  customer_email: string;
  contact_id: string | null;
  stripe_customer_id: string | null;
  stripe_invoice_id: string | null;
  status: InvoiceStatus;
  total: number;
  currency: string;
  due_date: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  content_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  line_description: string | null;
  created_at: string;
}

export interface InvoiceWithLines extends InvoiceRow {
  lines: InvoiceLineRow[];
}

export interface CreateInvoiceParams {
  customer_email: string;
  contact_id?: string | null;
  due_date?: string | null;
  currency?: string;
  project_id?: string | null;
}

export interface UpdateInvoiceParams {
  customer_email?: string;
  contact_id?: string | null;
  due_date?: string | null;
  currency?: string;
  project_id?: string | null;
}

export interface AddInvoiceLineParams {
  invoice_id: string;
  content_id: string;
  quantity: number;
  unit_price: number;
  line_description?: string | null;
}

export interface UpdateInvoiceLineParams {
  quantity?: number;
  unit_price?: number;
  line_description?: string | null;
}

function recalcLineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * List invoices (newest first).
 */
export async function listInvoices(
  params?: {
    status?: InvoiceStatus;
    limit?: number;
    contact_id?: string | null;
    project_id?: string | null;
    from?: string | null;
    to?: string | null;
  },
  schema?: string
): Promise<InvoiceRow[]> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  let q = supabase
    .schema(schemaName)
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.contact_id) {
    q = q.eq("contact_id", params.contact_id);
  }
  if (params?.project_id) {
    q = q.eq("project_id", params.project_id);
  }
  if (params?.from) {
    q = q.gte("created_at", params.from);
  }
  if (params?.to) {
    q = q.lte("created_at", params.to);
  }
  if (params?.status) {
    q = q.eq("status", params.status);
  }
  if (params?.limit) {
    q = q.limit(params.limit);
  }

  const { data, error } = await q;
  if (error) {
    console.error("listInvoices:", error);
    return [];
  }
  return (data ?? []) as InvoiceRow[];
}

/**
 * Get invoice by id.
 */
export async function getInvoiceById(
  invoiceId: string,
  schema?: string
): Promise<InvoiceRow | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error || !data) return null;
  return data as InvoiceRow;
}

/**
 * Get invoice lines for an invoice.
 */
export async function getInvoiceLines(
  invoiceId: string,
  schema?: string
): Promise<InvoiceLineRow[]> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schemaName)
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  return (data ?? []) as InvoiceLineRow[];
}

/**
 * Get invoice with lines.
 */
export async function getInvoiceWithLines(
  invoiceId: string,
  schema?: string
): Promise<InvoiceWithLines | null> {
  const [inv, lines] = await Promise.all([
    getInvoiceById(invoiceId, schema),
    getInvoiceLines(invoiceId, schema),
  ]);
  if (!inv) return null;
  return { ...inv, lines };
}

/**
 * Create a draft invoice (no lines yet). invoice_number is set when pushing to Stripe or can be pre-assigned.
 */
export async function createInvoice(
  params: CreateInvoiceParams,
  schema?: string
): Promise<InvoiceRow | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("invoices")
    .insert({
      customer_email: params.customer_email.trim(),
      contact_id: params.contact_id ?? null,
      stripe_customer_id: null,
      stripe_invoice_id: null,
      status: "draft",
      total: 0,
      currency: params.currency ?? "USD",
      due_date: params.due_date ?? null,
      project_id: params.project_id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createInvoice:", error);
    return null;
  }
  return data as InvoiceRow;
}

/**
 * Update draft invoice fields.
 */
export async function updateInvoice(
  invoiceId: string,
  params: UpdateInvoiceParams,
  schema?: string
): Promise<boolean> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const inv = await getInvoiceById(invoiceId, schemaName);
  if (!inv || inv.status !== "draft") return false;

  const supabase = createServerSupabaseClient();
  const update: Record<string, unknown> = {};
  if (params.customer_email !== undefined) update.customer_email = params.customer_email.trim();
  if (params.contact_id !== undefined) update.contact_id = params.contact_id;
  if (params.due_date !== undefined) update.due_date = params.due_date;
  if (params.currency !== undefined) update.currency = params.currency;
  if (params.project_id !== undefined) update.project_id = params.project_id;
  if (Object.keys(update).length === 0) return true;

  const { error } = await supabase
    .schema(schemaName)
    .from("invoices")
    .update(update)
    .eq("id", invoiceId);

  return !error;
}

/**
 * Add a line to an invoice (draft only). Line total computed from quantity * unit_price.
 */
export async function addInvoiceLine(
  params: AddInvoiceLineParams,
  schema?: string
): Promise<InvoiceLineRow | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const inv = await getInvoiceById(params.invoice_id, schemaName);
  if (!inv || inv.status !== "draft") return null;

  const line_total = recalcLineTotal(params.quantity, params.unit_price);
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("invoice_lines")
    .insert({
      invoice_id: params.invoice_id,
      content_id: params.content_id,
      quantity: params.quantity,
      unit_price: params.unit_price,
      line_total,
      line_description: params.line_description ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("addInvoiceLine:", error);
    return null;
  }

  await recalcInvoiceTotal(params.invoice_id, schemaName);
  return data as InvoiceLineRow;
}

/**
 * Update an invoice line (draft only). Recomputes line_total and invoice total.
 */
export async function updateInvoiceLine(
  lineId: string,
  params: UpdateInvoiceLineParams,
  schema?: string
): Promise<boolean> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data: line } = await supabase
    .schema(schemaName)
    .from("invoice_lines")
    .select("invoice_id")
    .eq("id", lineId)
    .maybeSingle();

  if (!line) return false;
  const inv = await getInvoiceById((line as { invoice_id: string }).invoice_id, schemaName);
  if (!inv || inv.status !== "draft") return false;

  const current = await getLineById(lineId, schemaName);
  if (!current) return false;

  const update: Record<string, unknown> = {};
  if (params.quantity !== undefined) update.quantity = params.quantity;
  if (params.unit_price !== undefined) update.unit_price = params.unit_price;
  if (params.line_description !== undefined) update.line_description = params.line_description;

  if ("quantity" in update || "unit_price" in update) {
    const quantity = (params.quantity ?? current.quantity) ?? 1;
    const unit_price = (params.unit_price ?? current.unit_price) ?? 0;
    update.line_total = recalcLineTotal(quantity, unit_price);
  }

  if (Object.keys(update).length === 0) return true;

  const { error } = await supabase
    .schema(schemaName)
    .from("invoice_lines")
    .update(update)
    .eq("id", lineId);

  if (error) return false;
  await recalcInvoiceTotal((line as { invoice_id: string }).invoice_id, schemaName);
  return true;
}

async function getLineById(
  lineId: string,
  schema: string
): Promise<InvoiceLineRow | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schema)
    .from("invoice_lines")
    .select("*")
    .eq("id", lineId)
    .maybeSingle();
  return data as InvoiceLineRow | null;
}

/**
 * Remove a line from an invoice (draft only).
 */
export async function removeInvoiceLine(
  lineId: string,
  schema?: string
): Promise<boolean> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const line = await getLineById(lineId, schemaName);
  if (!line) return false;
  const inv = await getInvoiceById(line.invoice_id, schemaName);
  if (!inv || inv.status !== "draft") return false;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(schemaName)
    .from("invoice_lines")
    .delete()
    .eq("id", lineId);

  if (error) return false;
  await recalcInvoiceTotal(line.invoice_id, schemaName);
  return true;
}

async function recalcInvoiceTotal(invoiceId: string, schema: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { data: lines } = await supabase
    .schema(schema)
    .from("invoice_lines")
    .select("line_total")
    .eq("invoice_id", invoiceId);

  const total = (lines ?? []).reduce(
    (sum: number, r: { line_total?: number }) => sum + Number(r.line_total ?? 0),
    0
  );
  await supabase
    .schema(schema)
    .from("invoices")
    .update({ total: Math.round(total * 100) / 100 })
    .eq("id", invoiceId);
}

/**
 * Push draft invoice to Stripe: create/find customer, create invoice, add line items, finalize, send.
 * Assigns invoice_number from shared sequence and sets stripe_invoice_id, stripe_customer_id, status.
 */
export async function pushInvoiceToStripe(
  invoiceId: string,
  schema?: string
): Promise<{ ok: boolean; error?: string; stripe_invoice_id?: string }> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const inv = await getInvoiceWithLines(invoiceId, schemaName);
  if (!inv) return { ok: false, error: "Invoice not found" };
  if (inv.status !== "draft") return { ok: false, error: "Only draft invoices can be pushed" };
  if (inv.lines.length === 0) return { ok: false, error: "Add at least one line item" };

  const stripe = getStripeClient();
  if (!stripe) return { ok: false, error: "Stripe not configured" };

  try {
    let stripeCustomerId = inv.stripe_customer_id ?? null;
    if (!stripeCustomerId && inv.contact_id) {
      const contact = await getContactById(inv.contact_id);
      const ext = contact?.external_stripe_id?.trim();
      if (ext) stripeCustomerId = ext;
    }
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: inv.customer_email,
        metadata: { source: "website_cms_invoice" },
      });
      stripeCustomerId = customer.id;
    }

    const invoiceNumber = await getNextInvoiceOrderNumber(schemaName);

    const dueDate = inv.due_date
      ? Math.ceil(new Date(inv.due_date).getTime() / 1000)
      : Math.ceil(Date.now() / 1000) + 30 * 24 * 3600;
    const stripeInvoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: "send_invoice",
      days_until_due: 30,
      metadata: { invoice_id: invoiceId, invoice_number: invoiceNumber },
      description: `Invoice ${invoiceNumber}`,
    });

    for (const line of inv.lines) {
      const amountCents = Math.round(line.line_total * 100);
      await stripe.invoiceItems.create({
        customer: stripeCustomerId!,
        invoice: stripeInvoice.id,
        amount: amountCents,
        currency: (inv.currency || "usd").toLowerCase(),
        description: line.line_description?.trim() || `Line: ${line.quantity} × ${line.unit_price}`,
      });
    }

    await stripe.invoices.finalizeInvoice(stripeInvoice.id);
    await stripe.invoices.sendInvoice(stripeInvoice.id);

    const supabase = createServerSupabaseClient();
    await supabase
      .schema(schemaName)
      .from("invoices")
      .update({
        invoice_number: invoiceNumber,
        stripe_customer_id: stripeCustomerId,
        stripe_invoice_id: stripeInvoice.id,
        status: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return { ok: true, stripe_invoice_id: stripeInvoice.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("pushInvoiceToStripe:", err);
    return { ok: false, error: message };
  }
}

/**
 * Get our invoice by Stripe invoice id (for webhook: one-off invoice.paid).
 */
export async function getInvoiceByStripeInvoiceId(
  stripeInvoiceId: string,
  schema?: string
): Promise<InvoiceRow | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schemaName)
    .from("invoices")
    .select("*")
    .eq("stripe_invoice_id", stripeInvoiceId)
    .maybeSingle();

  return (data as InvoiceRow) ?? null;
}

/**
 * Create order + order_items from our app invoice (one-off invoice paid in Stripe).
 * Called by webhook on invoice.paid when our invoice exists. Assigns order_number from shared sequence.
 * Idempotent: if order with this stripe_invoice_id exists, returns that order id.
 */
export async function createOrderFromAppInvoice(
  invoiceId: string,
  stripeInvoiceId: string,
  schema?: string
): Promise<{ orderId: string } | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();

  const existing = await supabase
    .schema(schemaName)
    .from("orders")
    .select("id")
    .eq("stripe_invoice_id", stripeInvoiceId)
    .maybeSingle();
  if (existing.data) {
    return { orderId: (existing.data as { id: string }).id };
  }

  const inv = await getInvoiceWithLines(invoiceId, schemaName);
  if (!inv || inv.lines.length === 0) return null;

  const contentIds = [...new Set(inv.lines.map((l) => l.content_id))];
  const { data: productRows } = await supabase
    .schema(schemaName)
    .from("product")
    .select("content_id, shippable, downloadable")
    .in("content_id", contentIds);
  const productMap = new Map<string, { shippable: boolean; downloadable: boolean }>();
  for (const p of productRows ?? []) {
    const row = p as { content_id: string; shippable: boolean; downloadable?: boolean };
    productMap.set(row.content_id, {
      shippable: row.shippable ?? false,
      downloadable: row.downloadable ?? false,
    });
  }

  const { data: contentRows } = await supabase
    .schema(schemaName)
    .from("content")
    .select("id, title")
    .in("id", contentIds);
  const titleByContentId = new Map<string, string>();
  for (const c of contentRows ?? []) {
    const row = c as { id: string; title: string | null };
    titleByContentId.set(row.id, row.title ?? "Product");
  }

  const orderNumber = await getNextInvoiceOrderNumber(schemaName);

  const { data: orderRow, error: orderError } = await supabase
    .schema(schemaName)
    .from("orders")
    .insert({
      customer_email: inv.customer_email,
      contact_id: inv.contact_id,
      user_id: null,
      status: "paid",
      total: inv.total,
      currency: inv.currency,
      order_number: orderNumber,
      stripe_checkout_session_id: null,
      stripe_invoice_id: stripeInvoiceId,
      project_id: inv.project_id ?? null,
      billing_snapshot: null,
      shipping_snapshot: null,
      coupon_code: null,
      coupon_batch_id: null,
      discount_amount: 0,
    })
    .select("id")
    .single();

  if (orderError || !orderRow) {
    console.error("createOrderFromAppInvoice order insert:", orderError);
    return null;
  }

  const orderId = (orderRow as { id: string }).id;
  const orderItems = inv.lines.map((line) => {
    const prod = productMap.get(line.content_id);
    const name = line.line_description?.trim() || titleByContentId.get(line.content_id) || "Product";
    return {
      order_id: orderId,
      content_id: line.content_id,
      name_snapshot: name,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.line_total,
      shippable: prod?.shippable ?? false,
      downloadable: prod?.downloadable ?? false,
    };
  });

  const { error: itemsError } = await supabase
    .schema(schemaName)
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("createOrderFromAppInvoice order_items insert:", itemsError);
    await supabase.schema(schemaName).from("orders").delete().eq("id", orderId);
    return null;
  }

  await supabase
    .schema(schemaName)
    .from("invoices")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", invoiceId);

  return { orderId };
}
