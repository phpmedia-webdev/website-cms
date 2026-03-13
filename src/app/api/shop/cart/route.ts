/**
 * GET /api/shop/cart
 * Returns current cart (items, subtotal, item_count). Uses cart_session_id cookie.
 * If no cookie or invalid session, returns empty cart shape.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCartWithDetails, clearCart } from "@/lib/shop/cart";
import { CART_SESSION_COOKIE } from "@/lib/shop/cart-cookie";
import { getClientSchema } from "@/lib/supabase/schema";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(CART_SESSION_COOKIE)?.value ?? null;
    if (!sessionId) {
      return NextResponse.json({
        session_id: null,
        currency: "USD",
        items: [],
        item_count: 0,
        subtotal: 0,
        has_shippable: false,
        has_downloadable: false,
        has_recurring: false,
        has_onetime: false,
      });
    }
    const cart = await getCartWithDetails(sessionId);
    if (!cart) {
      return NextResponse.json({
        session_id: null,
        currency: "USD",
        items: [],
        item_count: 0,
        subtotal: 0,
        has_shippable: false,
        has_downloadable: false,
        has_recurring: false,
        has_onetime: false,
      });
    }
    return NextResponse.json({
      session_id: cart.session_id,
      currency: cart.currency,
      items: cart.items,
      item_count: cart.item_count,
      subtotal: cart.subtotal,
      has_shippable: cart.has_shippable ?? false,
      has_downloadable: cart.has_downloadable ?? false,
      has_recurring: cart.has_recurring ?? false,
      has_onetime: cart.has_onetime ?? false,
    });
  } catch (e) {
    console.warn("GET /api/shop/cart:", e);
    return NextResponse.json(
      { error: "Failed to load cart" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shop/cart
 * Clear all items from the current cart (e.g. after checkout success).
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(CART_SESSION_COOKIE)?.value ?? null;
    if (!sessionId) {
      return NextResponse.json({ ok: true });
    }
    const schema = getClientSchema();
    const result = await clearCart(sessionId, schema);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to clear cart" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.warn("DELETE /api/shop/cart:", e);
    return NextResponse.json({ error: "Failed to clear cart" }, { status: 500 });
  }
}
