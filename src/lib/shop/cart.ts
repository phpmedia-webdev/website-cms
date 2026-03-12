/**
 * Cart helpers (Phase 09 Ecommerce Step 13a).
 * Cart identified by session_id (cookie). Optional user_id on session when logged in.
 * Uses service-role client; session_id is validated in API layer.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface CartItemRow {
  id: string;
  cart_session_id: string;
  content_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface CartSessionRow {
  id: string;
  user_id: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CartItemDisplay {
  content_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  title?: string;
  slug?: string;
}

export interface CartDisplay {
  session_id: string;
  currency: string;
  items: CartItemDisplay[];
  item_count: number;
  subtotal: number;
  /** True if any item is a shippable product (for checkout: collect shipping address). */
  has_shippable?: boolean;
  /** True if any item is a downloadable product (order detail shows download links). */
  has_downloadable?: boolean;
}

/**
 * Get or create a cart session. If sessionId is provided and exists, return it; else create new.
 */
export async function getOrCreateCartSession(
  sessionId: string | null,
  userId?: string | null,
  schema?: string
): Promise<{ id: string; created: boolean }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? CONTENT_SCHEMA;

  if (sessionId) {
    const { data } = await supabase
      .schema(schemaName)
      .from("cart_sessions")
      .select("id")
      .eq("id", sessionId)
      .maybeSingle();
    if (data) return { id: (data as { id: string }).id, created: false };
  }

  const { data: inserted, error } = await supabase
    .schema(schemaName)
    .from("cart_sessions")
    .insert({
      user_id: userId ?? null,
      currency: "USD",
    })
    .select("id")
    .single();

  if (error) {
    console.error("getOrCreateCartSession:", error);
    throw new Error("Failed to create cart session");
  }
  return { id: (inserted as { id: string }).id, created: true };
}

/**
 * Optionally link session to user (e.g. on login). Idempotent.
 */
export async function linkCartSessionToUser(
  sessionId: string,
  userId: string,
  schema?: string
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? CONTENT_SCHEMA;
  await supabase
    .schema(schemaName)
    .from("cart_sessions")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * Get cart with items. Returns empty cart if session not found.
 */
export async function getCart(
  sessionId: string,
  schema?: string
): Promise<CartDisplay | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? CONTENT_SCHEMA;

  const { data: session, error: sessionError } = await supabase
    .schema(schemaName)
    .from("cart_sessions")
    .select("id, currency")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !session) return null;

  const sid = (session as { id: string; currency: string }).id;
  const currency = (session as { id: string; currency: string }).currency;

  const { data: rows } = await supabase
    .schema(schemaName)
    .from("cart_items")
    .select("content_id, quantity, unit_price")
    .eq("cart_session_id", sid);

  const items = (rows ?? []) as { content_id: string; quantity: number; unit_price: number }[];
  const item_count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);

  return {
    session_id: sid,
    currency,
    items: items.map((i) => ({
      content_id: i.content_id,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      line_total: Number(i.unit_price) * i.quantity,
    })),
    item_count,
    subtotal,
  };
}

/**
 * Get cart with product title/slug for each item (for cart page display).
 * Sets has_shippable if any item is a shippable product (for checkout).
 */
export async function getCartWithDetails(
  sessionId: string,
  schema?: string
): Promise<CartDisplay | null> {
  const cart = await getCart(sessionId, schema);
  if (!cart || cart.items.length === 0) return cart;

  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? CONTENT_SCHEMA;
  const contentIds = [...new Set(cart.items.map((i) => i.content_id))];

  const [contentResult, productResult] = await Promise.all([
    supabase.schema(schemaName).from("content").select("id, title, slug").in("id", contentIds),
    supabase.schema(schemaName).from("product").select("content_id, shippable, downloadable").in("content_id", contentIds),
  ]);

  const byId = new Map<string, { title: string; slug: string }>();
  for (const r of contentResult.data ?? []) {
    const row = r as { id: string; title: string; slug: string };
    byId.set(row.id, { title: row.title ?? "", slug: row.slug ?? "" });
  }

  const shippableByContentId = new Map<string, boolean>();
  const downloadableByContentId = new Map<string, boolean>();
  for (const p of productResult.data ?? []) {
    const row = p as { content_id: string; shippable: boolean; downloadable?: boolean };
    shippableByContentId.set(row.content_id, Boolean(row.shippable));
    downloadableByContentId.set(row.content_id, Boolean(row.downloadable));
  }
  const has_shippable = cart.items.some((i) => shippableByContentId.get(i.content_id));
  const has_downloadable = cart.items.some((i) => downloadableByContentId.get(i.content_id));

  return {
    ...cart,
    has_shippable,
    has_downloadable,
    items: cart.items.map((i) => ({
      ...i,
      title: byId.get(i.content_id)?.title,
      slug: byId.get(i.content_id)?.slug,
    })),
  };
}

/**
 * Get total item count for badge. Returns 0 if session not found.
 */
export async function getCartItemCount(
  sessionId: string | null,
  schema?: string
): Promise<number> {
  if (!sessionId) return 0;
  const cart = await getCart(sessionId, schema);
  return cart?.item_count ?? 0;
}

/**
 * Get product price for content_id (for add to cart). Returns null if not eligible.
 */
async function getProductPriceForCart(
  contentId: string,
  schema: string
): Promise<{ unit_price: number; currency: string; stock_quantity: number | null } | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .schema(schema)
    .from("product")
    .select("price, currency, stock_quantity")
    .eq("content_id", contentId)
    .not("stripe_product_id", "is", null)
    .eq("available_for_purchase", true)
    .maybeSingle();

  if (!data) return null;
  const row = data as { price: number; currency: string; stock_quantity: number | null };
  return {
    unit_price: Number(row.price),
    currency: row.currency ?? "USD",
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
  };
}

/**
 * Add or update item in cart. Merges quantity if item exists.
 * Step 28: When product has stock_quantity set, validates (cart qty + requested) <= stock.
 */
export async function addCartItem(
  sessionId: string,
  contentId: string,
  quantity: number,
  schema?: string
): Promise<{ ok: boolean; error?: string }> {
  if (quantity < 1) return { ok: false, error: "Quantity must be at least 1" };

  const schemaName = schema ?? CONTENT_SCHEMA;
  const priceInfo = await getProductPriceForCart(contentId, schemaName);
  if (!priceInfo) return { ok: false, error: "Product not available for purchase" };

  const supabase = createServerSupabaseClient();

  const { data: existing } = await supabase
    .schema(schemaName)
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_session_id", sessionId)
    .eq("content_id", contentId)
    .maybeSingle();

  const currentQty = existing ? (existing as { quantity: number }).quantity : 0;
  const newTotalQty = currentQty + quantity;
  if (priceInfo.stock_quantity != null && newTotalQty > priceInfo.stock_quantity) {
    return {
      ok: false,
      error: `Insufficient stock. Only ${priceInfo.stock_quantity} available.`,
    };
  }

  if (existing) {
    const { error } = await supabase
      .schema(schemaName)
      .from("cart_items")
      .update({
        quantity: newTotalQty,
        unit_price: priceInfo.unit_price,
      })
      .eq("cart_session_id", sessionId)
      .eq("content_id", contentId);
    if (error) {
      console.error("addCartItem update:", error);
      return { ok: false, error: "Failed to update cart" };
    }
  } else {
    const { error } = await supabase
      .schema(schemaName)
      .from("cart_items")
      .insert({
        cart_session_id: sessionId,
        content_id: contentId,
        quantity,
        unit_price: priceInfo.unit_price,
      });
    if (error) {
      console.error("addCartItem insert:", error);
      return { ok: false, error: "Failed to add to cart" };
    }
  }

  return { ok: true };
}

/**
 * Update item quantity. Remove item if quantity <= 0.
 * Step 28: When product has stock_quantity set, validates quantity <= stock.
 */
export async function updateCartItemQuantity(
  sessionId: string,
  contentId: string,
  quantity: number,
  schema?: string
): Promise<{ ok: boolean; error?: string }> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();

  if (quantity > 0) {
    const priceInfo = await getProductPriceForCart(contentId, schemaName);
    if (priceInfo?.stock_quantity != null && quantity > priceInfo.stock_quantity) {
      return {
        ok: false,
        error: `Insufficient stock. Only ${priceInfo.stock_quantity} available.`,
      };
    }
  }

  if (quantity <= 0) {
    const { error } = await supabase
      .schema(schemaName)
      .from("cart_items")
      .delete()
      .eq("cart_session_id", sessionId)
      .eq("content_id", contentId);
    if (error) {
      console.error("updateCartItemQuantity delete:", error);
      return { ok: false, error: "Failed to remove item" };
    }
    return { ok: true };
  }

  const { error } = await supabase
    .schema(schemaName)
    .from("cart_items")
    .update({ quantity })
    .eq("cart_session_id", sessionId)
    .eq("content_id", contentId);

  if (error) {
    console.error("updateCartItemQuantity:", error);
    return { ok: false, error: "Failed to update quantity" };
  }
  return { ok: true };
}

/**
 * Remove one line from cart.
 */
export async function removeCartItem(
  sessionId: string,
  contentId: string,
  schema?: string
): Promise<{ ok: boolean; error?: string }> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(schemaName)
    .from("cart_items")
    .delete()
    .eq("cart_session_id", sessionId)
    .eq("content_id", contentId);

  if (error) {
    console.error("removeCartItem:", error);
    return { ok: false, error: "Failed to remove item" };
  }
  return { ok: true };
}

/**
 * Clear all items from a cart session (e.g. after successful checkout).
 */
export async function clearCart(
  sessionId: string,
  schema?: string
): Promise<{ ok: boolean; error?: string }> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(schemaName)
    .from("cart_items")
    .delete()
    .eq("cart_session_id", sessionId);

  if (error) {
    console.error("clearCart:", error);
    return { ok: false, error: "Failed to clear cart" };
  }
  return { ok: true };
}
