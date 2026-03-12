/**
 * POST /api/webhooks/stripe
 * Step 20: Handle Stripe webhook events. Verifies signature with STRIPE_WEBHOOK_SECRET.
 * On checkout.session.completed: mark order paid, process membership products, sync CRM addresses,
 * set status to completed (no shippable) or processing (has shippable).
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeWebhookSecret, getStripeClient } from "@/lib/stripe/config";
import { getOrderByStripeSessionId, updateOrderStatus, getOrderItems, decrementStockForOrder } from "@/lib/shop/orders";
import { processMembershipProductsForOrder } from "@/lib/shop/payment-to-mag";
import { updateContactFromOrderAddresses } from "@/lib/shop/order-address";
import { sendOrderConfirmationEmail, sendDigitalDeliveryEmail } from "@/lib/shop/order-email";
import { getClientSchema } from "@/lib/supabase/schema";

export const dynamic = "force-dynamic";

/** Avoid body parsing so we can verify signature with raw body. */
export async function POST(request: NextRequest) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch (e) {
    console.error("Stripe webhook: failed to read body", e);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.warn("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    const schema = getClientSchema();

    const order = await getOrderByStripeSessionId(sessionId, schema);
    if (!order) {
      console.warn("Stripe webhook: no order found for session", sessionId);
      return NextResponse.json({ received: true });
    }

    if (order.status !== "pending") {
      return NextResponse.json({ received: true });
    }

    await updateOrderStatus(order.id, "paid", schema);

    await decrementStockForOrder(order.id, schema);

    const { processed, errors } = await processMembershipProductsForOrder(order.id, schema);
    if (errors.length > 0) {
      console.warn("Stripe webhook: membership processing errors:", errors);
    }

    await updateContactFromOrderAddresses(order);

    const items = await getOrderItems(order.id, schema);
    const hasShippable = items.some((i) => i.shippable);
    const nextStatus = hasShippable ? "processing" : "completed";
    await updateOrderStatus(order.id, nextStatus, schema);

    // Order confirmation email (Step 21f: template or fallback)
    sendOrderConfirmationEmail(order, items).catch((e) =>
      console.warn("Stripe webhook: order confirmation email failed", e)
    );
    if (nextStatus === "completed") {
      sendDigitalDeliveryEmail(order, items).catch((e) =>
        console.warn("Stripe webhook: digital delivery email failed", e)
      );
    }

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
