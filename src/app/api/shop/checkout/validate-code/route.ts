/**
 * POST /api/shop/checkout/validate-code
 * Step 19: Validate a discount code against current cart subtotal.
 * Body: { code: string }. Cookie: cart_session_id.
 * Returns { valid, discount_amount?, coupon_code?, coupon_batch_id?, error? }.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCartWithDetails } from "@/lib/shop/cart";
import { CART_SESSION_COOKIE } from "@/lib/shop/cart-cookie";
import { validateDiscountCode } from "@/lib/shop/coupon";
import { getClientSchema } from "@/lib/supabase/schema";

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(CART_SESSION_COOKIE)?.value ?? null;
    if (!sessionId) {
      return NextResponse.json({ valid: false, error: "No cart session" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code : "";
    if (!code.trim()) {
      return NextResponse.json({ valid: false, error: "Code is required" }, { status: 400 });
    }

    const schema = getClientSchema();
    const cart = await getCartWithDetails(sessionId, schema);
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ valid: false, error: "Cart is empty" }, { status: 400 });
    }

    const result = await validateDiscountCode(code, cart.subtotal, schema);
    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error ?? "Invalid code",
      });
    }

    return NextResponse.json({
      valid: true,
      discount_amount: result.discount_amount,
      coupon_code: result.coupon_code,
      coupon_batch_id: result.coupon_batch_id,
    });
  } catch (e) {
    console.error("POST /api/shop/checkout/validate-code:", e);
    return NextResponse.json(
      { valid: false, error: e instanceof Error ? e.message : "Validation failed" },
      { status: 500 }
    );
  }
}
