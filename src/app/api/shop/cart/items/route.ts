/**
 * POST /api/shop/cart/items — add item (body: content_id, quantity?)
 * PATCH /api/shop/cart/items — update quantity (body: content_id, quantity)
 * DELETE /api/shop/cart/items — remove item (body: content_id)
 * Uses cart_session_id cookie. Creates session and sets cookie on first add if needed.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateCartSession,
  linkCartSessionToUser,
  getCart,
  getCartWithDetails,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
} from "@/lib/shop/cart";
import { CART_SESSION_COOKIE, CART_COOKIE_OPTIONS } from "@/lib/shop/cart-cookie";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get(CART_SESSION_COOKIE)?.value ?? null;
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const contentId = typeof body.content_id === "string" ? body.content_id : null;
    const quantity = typeof body.quantity === "number" ? body.quantity : typeof body.quantity === "string" ? parseInt(body.quantity, 10) : 1;
    if (!contentId) {
      return NextResponse.json({ error: "content_id required" }, { status: 400 });
    }
    if (Number.isNaN(quantity) || quantity < 1) {
      return NextResponse.json({ error: "quantity must be at least 1" }, { status: 400 });
    }

    const existingId = getSessionId(request);
    const userId = await getCurrentUserId();
    const { id: sessionId, created } = await getOrCreateCartSession(existingId, userId);

    const result = await addCartItem(sessionId, contentId, quantity);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to add to cart" }, { status: 400 });
    }

    if (userId) {
      await linkCartSessionToUser(sessionId, userId);
    }

    const cart = await getCartWithDetails(sessionId);
    const res = NextResponse.json({
      session_id: sessionId,
      currency: cart?.currency ?? "USD",
      items: cart?.items ?? [],
      item_count: cart?.item_count ?? 0,
      subtotal: cart?.subtotal ?? 0,
    });
    if (created) {
      res.cookies.set(CART_SESSION_COOKIE, sessionId, CART_COOKIE_OPTIONS);
    }
    return res;
  } catch (e) {
    console.warn("POST /api/shop/cart/items:", e);
    return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ error: "No cart session" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const contentId = typeof body.content_id === "string" ? body.content_id : null;
    const quantity = typeof body.quantity === "number" ? body.quantity : typeof body.quantity === "string" ? parseInt(body.quantity, 10) : null;
    if (!contentId) {
      return NextResponse.json({ error: "content_id required" }, { status: 400 });
    }
    if (quantity === null || quantity === undefined || Number.isNaN(quantity)) {
      return NextResponse.json({ error: "quantity required" }, { status: 400 });
    }

    const result = await updateCartItemQuantity(sessionId, contentId, quantity);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to update" }, { status: 400 });
    }

    const cart = await getCartWithDetails(sessionId);
    return NextResponse.json({
      session_id: sessionId,
      currency: cart?.currency ?? "USD",
      items: cart?.items ?? [],
      item_count: cart?.item_count ?? 0,
      subtotal: cart?.subtotal ?? 0,
    });
  } catch (e) {
    console.warn("PATCH /api/shop/cart/items:", e);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ error: "No cart session" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const contentId = typeof body.content_id === "string" ? body.content_id : null;
    if (!contentId) {
      return NextResponse.json({ error: "content_id required" }, { status: 400 });
    }

    const result = await removeCartItem(sessionId, contentId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to remove" }, { status: 400 });
    }

    const cart = await getCartWithDetails(sessionId);
    return NextResponse.json({
      session_id: sessionId,
      currency: cart?.currency ?? "USD",
      items: cart?.items ?? [],
      item_count: cart?.item_count ?? 0,
      subtotal: cart?.subtotal ?? 0,
    });
  } catch (e) {
    console.warn("DELETE /api/shop/cart/items:", e);
    return NextResponse.json({ error: "Failed to remove from cart" }, { status: 500 });
  }
}
