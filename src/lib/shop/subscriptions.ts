/**
 * Step 33: Subscription state and order-from-invoice (Stripe webhooks).
 * Upsert subscriptions from Stripe subscription events; create orders from invoice.paid (idempotent).
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getContactByExternalId } from "@/lib/supabase/crm";
import { getMemberByContactId } from "@/lib/supabase/members";
import type Stripe from "stripe";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface SubscriptionRow {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  contact_id: string | null;
  user_id: string | null;
  content_id: string | null;
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get product content_id and name by Stripe Price ID (for building order items from invoice lines).
 */
export async function getProductByStripePriceId(
  stripePriceId: string,
  schema?: string
): Promise<{ content_id: string; title: string; shippable: boolean; downloadable: boolean } | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schemaName)
    .from("product")
    .select("content_id")
    .eq("stripe_price_id", stripePriceId)
    .maybeSingle();
  if (!data) return null;
  const contentId = (data as { content_id: string }).content_id;
  const { data: content } = await supabase
    .schema(schemaName)
    .from("content")
    .select("id, title")
    .eq("id", contentId)
    .maybeSingle();
  if (!content) return null;
  const { data: product } = await supabase
    .schema(schemaName)
    .from("product")
    .select("shippable, downloadable")
    .eq("content_id", contentId)
    .maybeSingle();
  const p = product as { shippable: boolean; downloadable?: boolean } | null;
  return {
    content_id: contentId,
    title: (content as { title?: string }).title ?? "Subscription",
    shippable: p?.shippable ?? false,
    downloadable: p?.downloadable ?? false,
  };
}

/**
 * Upsert subscription row from Stripe subscription object (created/updated/deleted events).
 */
export async function upsertSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  contactId: string | null,
  userId: string | null,
  schema?: string
): Promise<void> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const subId = stripeSubscription.id;
  const customerId = typeof stripeSubscription.customer === "string"
    ? stripeSubscription.customer
    : stripeSubscription.customer?.id ?? "";
  const status = stripeSubscription.status ?? "active";
  const periodEnd = (stripeSubscription as { current_period_end?: number }).current_period_end;
  const currentPeriodEnd = periodEnd
    ? new Date(periodEnd * 1000).toISOString()
    : null;
  const firstItem = stripeSubscription.items?.data?.[0];
  let contentId: string | null = null;
  if (firstItem?.price?.id) {
    const product = await getProductByStripePriceId(
      typeof firstItem.price === "string" ? firstItem.price : firstItem.price.id,
      schemaName
    );
    contentId = product?.content_id ?? null;
  }

  const { error } = await supabase
    .schema(schemaName)
    .from("subscriptions")
    .upsert(
      {
        stripe_subscription_id: subId,
        stripe_customer_id: customerId,
        contact_id: contactId,
        user_id: userId,
        content_id: contentId,
        status,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );
  if (error) {
    console.error("upsertSubscriptionFromStripe:", error);
  }
}

/**
 * Find contact and user from Stripe customer id (for linking subscription and invoice orders).
 */
export async function resolveContactAndUserFromStripeCustomer(
  stripeCustomerId: string
): Promise<{ contact_id: string | null; user_id: string | null; email: string }> {
  const contact = await getContactByExternalId("stripe", stripeCustomerId);
  if (contact) {
    const email = contact.email?.trim() ?? "";
    const member = await getMemberByContactId(contact.id);
    const userId = member?.user_id ?? null;
    return { contact_id: contact.id, user_id: userId, email };
  }
  return { contact_id: null, user_id: null, email: "" };
}

/**
 * Create order + order_items from Stripe Invoice (subscription first payment or renewal).
 * Idempotent: if an order with this stripe_invoice_id exists, returns that order id without creating.
 * Returns order id or null on failure.
 */
export async function createOrderFromStripeInvoice(
  invoice: Stripe.Invoice,
  schema?: string
): Promise<{ orderId: string } | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const invoiceId = invoice.id;
  const existing = await supabase
    .schema(schemaName)
    .from("orders")
    .select("id")
    .eq("stripe_invoice_id", invoiceId)
    .maybeSingle();
  if (existing.data) {
    return { orderId: (existing.data as { id: string }).id };
  }

  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) {
    console.warn("createOrderFromStripeInvoice: invoice has no customer", invoiceId);
    return null;
  }

  const { contact_id, user_id, email: contactEmail } = await resolveContactAndUserFromStripeCustomer(customerId);
  let customer_email = (invoice as { customer_email?: string | null }).customer_email?.trim() ?? contactEmail;
  if (!customer_email && invoice.customer_email) {
    customer_email = String(invoice.customer_email).trim();
  }
  if (!customer_email) {
    console.warn("createOrderFromStripeInvoice: no email for invoice", invoiceId);
    return null;
  }

  const amountPaid = invoice.amount_paid ?? 0;
  const total = amountPaid / 100;
  const currency = (invoice.currency ?? "usd").toUpperCase();
  const lines = invoice.lines?.data ?? [];
  const orderItems: { content_id: string; name_snapshot: string; quantity: number; unit_price: number; line_total: number; shippable: boolean; downloadable: boolean }[] = [];

  for (const line of lines) {
    const lineObj = line as { price?: string | { id?: string }; amount?: number; quantity?: number };
    const priceId = typeof lineObj.price === "string" ? lineObj.price : lineObj.price?.id;
    if (!priceId) continue;
    const product = await getProductByStripePriceId(priceId, schemaName);
    if (!product) continue;
    const quantity = lineObj.quantity ?? 1;
    const amount = (lineObj.amount ?? 0) / 100;
    const unit_price = quantity > 0 ? amount / quantity : 0;
    orderItems.push({
      content_id: product.content_id,
      name_snapshot: product.title,
      quantity,
      unit_price,
      line_total: amount,
      shippable: product.shippable,
      downloadable: product.downloadable,
    });
  }

  if (orderItems.length === 0) {
    console.warn("createOrderFromStripeInvoice: no mapped line items for invoice", invoiceId);
    return null;
  }

  const { data: orderRow, error: orderError } = await supabase
    .schema(schemaName)
    .from("orders")
    .insert({
      customer_email,
      contact_id: contact_id ?? null,
      user_id: user_id ?? null,
      status: "paid",
      total,
      currency,
      stripe_checkout_session_id: null,
      stripe_invoice_id: invoiceId,
      billing_snapshot: null,
      shipping_snapshot: null,
      coupon_code: null,
      coupon_batch_id: null,
      discount_amount: 0,
    })
    .select("id")
    .single();

  if (orderError || !orderRow) {
    console.error("createOrderFromStripeInvoice order insert:", orderError);
    return null;
  }

  const orderId = (orderRow as { id: string }).id;
  const rows = orderItems.map((item) => ({
    order_id: orderId,
    content_id: item.content_id,
    name_snapshot: item.name_snapshot,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
    shippable: item.shippable,
    downloadable: item.downloadable,
  }));

  const { error: itemsError } = await supabase
    .schema(schemaName)
    .from("order_items")
    .insert(rows);

  if (itemsError) {
    console.error("createOrderFromStripeInvoice order_items insert:", itemsError);
    await supabase.schema(schemaName).from("orders").delete().eq("id", orderId);
    return null;
  }

  return { orderId };
}

/**
 * Get order id by Stripe invoice id (for idempotency check).
 */
export async function getOrderIdByStripeInvoiceId(
  stripeInvoiceId: string,
  schema?: string
): Promise<string | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schemaName)
    .from("orders")
    .select("id")
    .eq("stripe_invoice_id", stripeInvoiceId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** Display row for admin subscriptions list (subscription + customer + product labels). */
export interface SubscriptionListItem {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  contact_id: string | null;
  user_id: string | null;
  content_id: string | null;
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  /** Resolved for display */
  customer_email: string;
  customer_name: string;
  product_title: string;
}

/**
 * List all subscriptions for admin with customer and product display names.
 */
export async function listSubscriptions(schema?: string): Promise<SubscriptionListItem[]> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .schema(schemaName)
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listSubscriptions:", error);
    return [];
  }

  const list = (rows ?? []) as SubscriptionRow[];
  if (list.length === 0) return [];

  const contactIds = [...new Set(list.map((s) => s.contact_id).filter(Boolean))] as string[];
  const contentIds = [...new Set(list.map((s) => s.content_id).filter(Boolean))] as string[];

  const contactMap = new Map<string, { email: string | null; full_name: string | null }>();
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .schema(schemaName)
      .from("crm_contacts")
      .select("id, email, full_name")
      .in("id", contactIds);
    for (const c of contacts ?? []) {
      const row = c as { id: string; email: string | null; full_name: string | null };
      contactMap.set(row.id, { email: row.email ?? null, full_name: row.full_name ?? null });
    }
  }

  const contentMap = new Map<string, string>();
  if (contentIds.length > 0) {
    const { data: contents } = await supabase
      .schema(schemaName)
      .from("content")
      .select("id, title")
      .in("id", contentIds);
    for (const c of contents ?? []) {
      const row = c as { id: string; title: string | null };
      contentMap.set(row.id, row.title ?? "—");
    }
  }

  return list.map((s) => {
    const contact = s.contact_id ? contactMap.get(s.contact_id) : null;
    const productTitle = s.content_id ? contentMap.get(s.content_id) ?? "—" : "—";
    return {
      ...s,
      customer_email: contact?.email ?? "",
      customer_name: contact?.full_name ?? "",
      product_title: productTitle,
    };
  });
}

/** Member-facing subscription row (product title, status, period end; for /members/subscriptions). */
export interface MemberSubscriptionItem {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  current_period_end: string | null;
  product_title: string;
}

/**
 * Get content title by content_id (for subscription emails).
 */
export async function getContentTitleById(
  contentId: string,
  schema?: string
): Promise<string> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schemaName)
    .from("content")
    .select("title")
    .eq("id", contentId)
    .maybeSingle();
  return (data as { title?: string } | null)?.title?.trim() ?? "your subscription";
}

/**
 * Get subscription row by Stripe subscription id (for webhook email context).
 */
export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string,
  schema?: string
): Promise<{ contact_id: string | null; content_id: string | null } | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schemaName)
    .from("subscriptions")
    .select("contact_id, content_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  return data as { contact_id: string | null; content_id: string | null } | null;
}

/**
 * List subscriptions for the current member (filter by user_id). Used by /members/subscriptions.
 */
export async function listSubscriptionsForMember(
  userId: string,
  schema?: string
): Promise<MemberSubscriptionItem[]> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .schema(schemaName)
    .from("subscriptions")
    .select("id, stripe_subscription_id, stripe_customer_id, status, current_period_end, content_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listSubscriptionsForMember:", error);
    return [];
  }

  const list = (rows ?? []) as { id: string; stripe_subscription_id: string; stripe_customer_id: string; status: string; current_period_end: string | null; content_id: string | null }[];
  if (list.length === 0) return [];

  const contentIds = [...new Set(list.map((s) => s.content_id).filter(Boolean))] as string[];
  const contentMap = new Map<string, string>();
  if (contentIds.length > 0) {
    const { data: contents } = await supabase
      .schema(schemaName)
      .from("content")
      .select("id, title")
      .in("id", contentIds);
    for (const c of contents ?? []) {
      const row = c as { id: string; title: string | null };
      contentMap.set(row.id, row.title ?? "—");
    }
  }

  return list.map((s) => ({
    id: s.id,
    stripe_subscription_id: s.stripe_subscription_id,
    stripe_customer_id: s.stripe_customer_id,
    status: s.status,
    current_period_end: s.current_period_end,
    product_title: s.content_id ? contentMap.get(s.content_id) ?? "—" : "—",
  }));
}
