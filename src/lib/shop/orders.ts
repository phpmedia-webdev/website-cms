/**
 * Orders and order_items (Phase 09 Ecommerce Step 14).
 * Create order (pending) from cart; get order by id or Stripe session id.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getContactIdsByNameSearch } from "@/lib/supabase/crm";
import { getCartWithDetails } from "./cart";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export type OrderStatus = "pending" | "paid" | "processing" | "completed";

export interface OrderRow {
  id: string;
  customer_email: string;
  contact_id: string | null;
  user_id: string | null;
  status: OrderStatus;
  total: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  billing_snapshot: Record<string, unknown> | null;
  shipping_snapshot: Record<string, unknown> | null;
  coupon_code: string | null;
  coupon_batch_id: string | null;
  discount_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ListOrdersParams {
  /** Use "needs_attention" to filter orders with status pending or processing (Step 22). */
  status?: OrderStatus | "" | "needs_attention";
  search?: string;
  limit?: number;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  content_id: string;
  name_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  shippable: boolean;
  downloadable: boolean;
  created_at: string;
}

/** Billing or shipping address snapshot stored on the order (Step 15). Matches CRM contact fields. */
export interface AddressSnapshot {
  name?: string | null;
  address?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface CreateOrderFromCartParams {
  customer_email: string;
  contact_id?: string | null;
  user_id?: string | null;
  billing_snapshot?: AddressSnapshot | Record<string, unknown> | null;
  shipping_snapshot?: AddressSnapshot | Record<string, unknown> | null;
  coupon_code?: string | null;
  coupon_batch_id?: string | null;
  discount_amount?: number;
}

/**
 * Create a pending order and order_items from the given cart session.
 * Returns order id or null if cart is empty. Does not clear the cart (caller does that after payment).
 */
export async function createOrderFromCart(
  cartSessionId: string,
  params: CreateOrderFromCartParams,
  schema?: string
): Promise<{ orderId: string } | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const cart = await getCartWithDetails(cartSessionId, schemaName);
  if (!cart || cart.items.length === 0) return null;

  const supabase = createServerSupabaseClient();
  const contentIds = [...new Set(cart.items.map((i) => i.content_id))];

  const { data: productRows } = await supabase
    .schema(schemaName)
    .from("product")
    .select("content_id, shippable, downloadable")
    .in("content_id", contentIds);

  const shippableByContentId = new Map<string, boolean>();
  const downloadableByContentId = new Map<string, boolean>();
  for (const p of productRows ?? []) {
    const row = p as { content_id: string; shippable: boolean; downloadable?: boolean };
    shippableByContentId.set(row.content_id, Boolean(row.shippable));
    downloadableByContentId.set(row.content_id, Boolean(row.downloadable));
  }

  const discountAmount = Number(params.discount_amount ?? 0);
  const total = Math.max(0, cart.subtotal - discountAmount);

  const { data: orderRow, error: orderError } = await supabase
    .schema(schemaName)
    .from("orders")
    .insert({
      customer_email: params.customer_email.trim(),
      contact_id: params.contact_id ?? null,
      user_id: params.user_id ?? null,
      status: "pending",
      total,
      currency: cart.currency,
      stripe_checkout_session_id: null,
      billing_snapshot: params.billing_snapshot ?? null,
      shipping_snapshot: params.shipping_snapshot ?? null,
      coupon_code: params.coupon_code ?? null,
      coupon_batch_id: params.coupon_batch_id ?? null,
      discount_amount: discountAmount,
    })
    .select("id")
    .single();

  if (orderError || !orderRow) {
    console.error("createOrderFromCart order insert:", orderError);
    throw new Error("Failed to create order");
  }

  const orderId = (orderRow as { id: string }).id;

  const orderItems = cart.items.map((item) => ({
    order_id: orderId,
    content_id: item.content_id,
    name_snapshot: item.title ?? "Product",
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
    shippable: shippableByContentId.get(item.content_id) ?? false,
    downloadable: downloadableByContentId.get(item.content_id) ?? false,
  }));

  const { error: itemsError } = await supabase
    .schema(schemaName)
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("createOrderFromCart order_items insert:", itemsError);
    await supabase.schema(schemaName).from("orders").delete().eq("id", orderId);
    throw new Error("Failed to create order items");
  }

  return { orderId };
}

/**
 * Get order by id. Returns null if not found.
 */
export async function getOrderById(
  orderId: string,
  schema?: string
): Promise<OrderRow | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrderRow;
}

/**
 * Get order by Stripe Checkout Session id. Used by webhook to mark order paid.
 */
export async function getOrderByStripeSessionId(
  stripeCheckoutSessionId: string,
  schema?: string
): Promise<OrderRow | null> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("orders")
    .select("*")
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrderRow;
}

/**
 * Get order items for an order.
 */
export async function getOrderItems(
  orderId: string,
  schema?: string
): Promise<OrderItemRow[]> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schemaName)
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return (data ?? []) as OrderItemRow[];
}

/**
 * Step 28: Decrement product stock for each order item when payment succeeds.
 * Only decrements when product.stock_quantity is set; ignores products with no stock tracking.
 */
export async function decrementStockForOrder(
  orderId: string,
  schema?: string
): Promise<void> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const items = await getOrderItems(orderId, schemaName);
  const qtyByContentId = new Map<string, number>();
  for (const item of items) {
    const q = qtyByContentId.get(item.content_id) ?? 0;
    qtyByContentId.set(item.content_id, q + item.quantity);
  }
  if (qtyByContentId.size === 0) return;

  const supabase = createServerSupabaseClient();
  const { data: products } = await supabase
    .schema(schemaName)
    .from("product")
    .select("content_id, stock_quantity")
    .in("content_id", [...qtyByContentId.keys()])
    .not("stock_quantity", "is", null);

  for (const p of products ?? []) {
    const row = p as { content_id: string; stock_quantity: number };
    const deduct = qtyByContentId.get(row.content_id) ?? 0;
    if (deduct <= 0) continue;
    const newStock = Math.max(0, Number(row.stock_quantity) - deduct);
    await supabase
      .schema(schemaName)
      .from("product")
      .update({ stock_quantity: newStock })
      .eq("content_id", row.content_id);
  }
}

/**
 * Update order's stripe_checkout_session_id (call after creating Stripe Checkout Session).
 */
export async function setOrderStripeSessionId(
  orderId: string,
  stripeCheckoutSessionId: string,
  schema?: string
): Promise<boolean> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(schemaName)
    .from("orders")
    .update({
      stripe_checkout_session_id: stripeCheckoutSessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return !error;
}

/**
 * Update order status (e.g. pending -> paid, paid -> processing/completed).
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  schema?: string
): Promise<boolean> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(schemaName)
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  return !error;
}

/**
 * List orders for admin: optional filter by status, search by email or order id.
 */
export async function listOrders(
  params: ListOrdersParams = {},
  schema?: string
): Promise<OrderRow[]> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  let q = supabase
    .schema(schemaName)
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "") {
    if (params.status === "needs_attention") {
      q = q.in("status", ["pending", "processing"]);
    } else {
      q = q.eq("status", params.status);
    }
  }
  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    if (s.length > 0) {
      const uuidLike = /^[0-9a-f-]{36}$/i.test(s);
      if (uuidLike) {
        q = q.or(`customer_email.ilike.%${s}%,id.eq.${s}`);
      } else {
        const contactIds = await getContactIdsByNameSearch(s, schemaName);
        if (contactIds.length > 0) {
          q = q.or(
            `customer_email.ilike.%${s}%,contact_id.in.(${contactIds.join(",")})`
          );
        } else {
          q = q.ilike("customer_email", `%${s}%`);
        }
      }
    }
  }
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
  q = q.limit(limit);

  const { data } = await q;
  return (data ?? []) as OrderRow[];
}

/**
 * List orders for a member (by user_id). For "My orders" in Members Area.
 */
export async function getOrdersByUserId(
  userId: string,
  schema?: string
): Promise<OrderRow[]> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schemaName)
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []) as OrderRow[];
}

/** Step 26: Order metrics for dashboard and PWA. */
export interface OrderMetrics {
  pending: number;
  paid: number;
  processing: number;
  completed: number;
  todayCount: number;
  processingCount: number; // alias for dashboard "needs fulfillment"
  revenueCompleted: number; // sum of total for completed orders (optional, for display)
}

/**
 * Get order counts by status and today's count. For admin dashboard and PWA.
 */
export async function getOrderMetrics(schema?: string): Promise<OrderMetrics> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [pendingRes, paidRes, processingRes, completedRes, todayRes, completedRevenueRes] =
    await Promise.all([
      supabase.schema(schemaName).from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.schema(schemaName).from("orders").select("*", { count: "exact", head: true }).eq("status", "paid"),
      supabase.schema(schemaName).from("orders").select("*", { count: "exact", head: true }).eq("status", "processing"),
      supabase.schema(schemaName).from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabase.schema(schemaName).from("orders").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
      supabase.schema(schemaName).from("orders").select("total").eq("status", "completed"),
    ]);

  const getCount = (r: { count?: number | null } | null) => (r && typeof r.count === "number" ? r.count : 0);
  const completedRows = (completedRevenueRes.data ?? []) as { total: number }[];
  const revenueCompleted = completedRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);

  return {
    pending: getCount(pendingRes),
    paid: getCount(paidRes),
    processing: getCount(processingRes),
    completed: getCount(completedRes),
    todayCount: getCount(todayRes),
    processingCount: getCount(processingRes),
    revenueCompleted,
  };
}
