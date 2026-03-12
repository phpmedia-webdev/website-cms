/**
 * GET /api/shop/cart/count
 * Returns cart item count for header badge. Uses cart_session_id cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCartItemCount } from "@/lib/shop/cart";
import { CART_SESSION_COOKIE } from "@/lib/shop/cart-cookie";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(CART_SESSION_COOKIE)?.value ?? null;
    const count = await getCartItemCount(sessionId);
    return NextResponse.json({ count });
  } catch (e) {
    console.warn("GET /api/shop/cart/count:", e);
    return NextResponse.json({ count: 0 });
  }
}
