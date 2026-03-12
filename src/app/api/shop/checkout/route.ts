/**
 * POST /api/shop/checkout
 * Step 18: Create order from cart, create Stripe Checkout Session, return redirect URL.
 * Body: { customer_email, billing_snapshot, shipping_snapshot? (omit if same as billing), coupon_code? }.
 * Cookie: cart_session_id. On success returns { url: string } for redirect to Stripe.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getCartWithDetails } from "@/lib/shop/cart";
import { CART_SESSION_COOKIE } from "@/lib/shop/cart-cookie";
import {
  createOrderFromCart,
  setOrderStripeSessionId,
  type AddressSnapshot,
} from "@/lib/shop/orders";
import { validateDiscountCode, redeemDiscountCode } from "@/lib/shop/coupon";
import { getStripeClient } from "@/lib/stripe/config";
import { getSiteUrl } from "@/lib/supabase/settings";
import { getClientSchema } from "@/lib/supabase/schema";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get(CART_SESSION_COOKIE)?.value ?? null;
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Normalize address from body. */
function parseAddress(obj: unknown): AddressSnapshot | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const get = (k: string): string | null => {
    const v = o[k];
    if (v == null) return null;
    const s = String(v).trim();
    return s === "" ? null : s;
  };
  return {
    name: get("name") ?? undefined,
    address: get("address") ?? undefined,
    address_line2: get("address_line2") ?? undefined,
    city: get("city") ?? undefined,
    state: get("state") ?? undefined,
    postal_code: get("postal_code") ?? undefined,
    country: get("country") ?? undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ error: "No cart session" }, { status: 400 });
    }

    const schema = getClientSchema();
    const cart = await getCartWithDetails(sessionId, schema);
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const customer_email = typeof body.customer_email === "string" ? body.customer_email.trim() : "";
    if (!customer_email) {
      return NextResponse.json({ error: "customer_email is required" }, { status: 400 });
    }

    const billing_snapshot = parseAddress(body.billing_snapshot) ?? undefined;
    const shipping_snapshot = parseAddress(body.shipping_snapshot) ?? undefined;

    let coupon_code: string | null = null;
    let coupon_batch_id: string | null = null;
    let discount_amount = 0;
    const rawCoupon = typeof body.coupon_code === "string" ? body.coupon_code.trim() || null : null;
    if (rawCoupon) {
      const validated = await validateDiscountCode(rawCoupon, cart.subtotal, schema);
      if (!validated.valid) {
        return NextResponse.json(
          { error: validated.error ?? "Invalid or expired coupon code." },
          { status: 400 }
        );
      }
      coupon_code = validated.coupon_code ?? rawCoupon;
      coupon_batch_id = validated.coupon_batch_id ?? null;
      discount_amount = validated.discount_amount ?? 0;
    }

    const supabase = createServerSupabaseClient();
    const contentIds = [...new Set(cart.items.map((i) => i.content_id))];
    const { data: productRows } = await supabase
      .schema(schema)
      .from("product")
      .select("content_id, stripe_product_id, taxable, stock_quantity")
      .in("content_id", contentIds);

    const productByContentId = new Map<string, { stripe_product_id: string; taxable: boolean; stock_quantity: number | null }>();
    for (const p of productRows ?? []) {
      const row = p as { content_id: string; stripe_product_id: string | null; taxable: boolean; stock_quantity: number | null };
      if (row.stripe_product_id) {
        productByContentId.set(row.content_id, {
          stripe_product_id: row.stripe_product_id,
          taxable: Boolean(row.taxable),
          stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
        });
      }
    }

    for (const item of cart.items) {
      const prod = productByContentId.get(item.content_id);
      if (!prod) {
        return NextResponse.json(
          { error: "One or more cart items are not available for checkout (missing Stripe product). Remove them and try again." },
          { status: 400 }
        );
      }
      if (prod.stock_quantity != null && item.quantity > prod.stock_quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for one or more items. Please update your cart.` },
          { status: 400 }
        );
      }
    }

    const userId = await getCurrentUserId();
    let contact_id: string | null = null;
    try {
      const { getContactByEmail } = await import("@/lib/supabase/crm");
      const contact = await getContactByEmail(customer_email);
      contact_id = contact?.id ?? null;
    } catch {
      // ignore
    }

    const orderResult = await createOrderFromCart(sessionId, {
      customer_email,
      contact_id,
      user_id: userId,
      billing_snapshot: billing_snapshot ?? null,
      shipping_snapshot: shipping_snapshot ?? null,
      coupon_code,
      coupon_batch_id,
      discount_amount,
    }, schema);

    if (!orderResult) {
      return NextResponse.json({ error: "Failed to create order (cart may be empty)" }, { status: 400 });
    }

    if (coupon_code) {
      const redeem = await redeemDiscountCode(coupon_code, schema);
      if (!redeem.ok) {
        console.warn("Checkout: coupon redeem failed after order created:", redeem.error);
      }
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Cannot complete checkout." },
        { status: 503 }
      );
    }

    const baseUrl = (await getSiteUrl()).replace(/\/$/, "") || request.nextUrl.origin;
    const successUrl = `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/shop/cart`;

    const subtotal = cart.subtotal;
    const discountedSubtotal = Math.max(0, subtotal - discount_amount);
    const ratio = subtotal > 0 ? discountedSubtotal / subtotal : 1;

    const line_items = cart.items.map((item) => {
      const prod = productByContentId.get(item.content_id)!;
      const lineTotal = Number(item.unit_price) * item.quantity;
      const adjustedLineTotal = lineTotal * ratio;
      const adjustedUnit = adjustedLineTotal / item.quantity;
      const unit_amount = Math.max(1, Math.round(adjustedUnit * 100));
      return {
        price_data: {
          currency: cart.currency.toLowerCase(),
          product: prod.stripe_product_id,
          unit_amount,
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer_email || undefined,
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: orderResult.orderId,
      metadata: { order_id: orderResult.orderId },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
    }

    await setOrderStripeSessionId(orderResult.orderId, session.id, schema);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("POST /api/shop/checkout:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
