/**
 * POST /api/webhooks/stripe
 * Step 20: Handle Stripe webhook events. Verifies signature with STRIPE_WEBHOOK_SECRET.
 * On checkout.session.completed: mark order paid, process membership products, sync CRM addresses,
 * set status to completed (no shippable) or processing (has shippable).
 * Step 33: subscription.created/updated/deleted → upsert subscriptions table;
 * invoice.paid → create order from invoice (idempotent); invoice.payment_failed → log.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeWebhookSecret, getStripeClient } from "@/lib/stripe/config";
import { getOrderByStripeSessionId, getOrderById, updateOrderStatus, getOrderItems, decrementStockForOrder } from "@/lib/shop/orders";
import { processMembershipProductsForOrder } from "@/lib/shop/payment-to-mag";
import { updateContactFromOrderAddresses } from "@/lib/shop/order-address";
import { sendOrderConfirmationEmail, sendDigitalDeliveryEmail } from "@/lib/shop/order-email";
import { getClientSchema } from "@/lib/supabase/schema";
import { updateContact } from "@/lib/supabase/crm";
import {
  upsertSubscriptionFromStripe,
  resolveContactAndUserFromStripeCustomer,
  createOrderFromStripeInvoice,
  getProductByStripePriceId,
  getContentTitleById,
  getSubscriptionByStripeId,
} from "@/lib/shop/subscriptions";
import { getContactById } from "@/lib/supabase/crm";
import {
  sendSubscriptionStartedEmail,
  sendSubscriptionRenewalEmail,
  sendSubscriptionCanceledOrFailedEmail,
} from "@/lib/shop/subscription-email";

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

    // Step 33: Link contact to Stripe customer for subscription checkouts so invoice/subscription events can resolve contact
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (order.contact_id && stripeCustomerId) {
      updateContact(order.contact_id, { external_stripe_id: stripeCustomerId }).catch((e) =>
        console.warn("Stripe webhook: set contact external_stripe_id failed", e)
      );
    }

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

  const schema = getClientSchema();

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const orderId = (subscription.metadata as { order_id?: string } | undefined)?.order_id;
    let contactId: string | null = null;
    let userId: string | null = null;
    if (orderId) {
      const order = await getOrderById(orderId, schema);
      if (order) {
        contactId = order.contact_id;
        userId = order.user_id;
      }
    }
    if (!contactId && subscription.customer) {
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const resolved = await resolveContactAndUserFromStripeCustomer(customerId);
      contactId = resolved.contact_id;
      userId = resolved.user_id;
    }
    await upsertSubscriptionFromStripe(subscription, contactId, userId, schema);

    if (event.type === "customer.subscription.created" && contactId) {
      const contact = await getContactById(contactId);
      const email = contact?.email?.trim();
      if (email) {
        const firstItem = (subscription as { items?: { data?: { price?: string | { id?: string } }[] } }).items?.data?.[0];
        const priceId = firstItem?.price ? (typeof firstItem.price === "string" ? firstItem.price : firstItem.price.id) : null;
        const productTitle = priceId ? (await getProductByStripePriceId(priceId, schema))?.title : undefined;
        sendSubscriptionStartedEmail(email, {
          customerName: contact?.full_name ?? undefined,
          productTitle,
        }).catch(() => {});
      }
    }

    if (event.type === "customer.subscription.deleted" && contactId) {
      const contact = await getContactById(contactId);
      const email = contact?.email?.trim();
      if (email) {
        const row = await getSubscriptionByStripeId(subscription.id, schema);
        const productTitle = row?.content_id ? await getContentTitleById(row.content_id, schema) : undefined;
        sendSubscriptionCanceledOrFailedEmail(email, "canceled", {
          customerName: contact?.full_name ?? undefined,
          productTitle,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ received: true });
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = (invoice as { subscription?: string | null }).subscription;
    const billingReason = (invoice as { billing_reason?: string }).billing_reason;
    if (subscriptionId) {
      const result = await createOrderFromStripeInvoice(invoice, schema);
      if (billingReason === "subscription_cycle" && result) {
        const order = await getOrderById(result.orderId, schema);
        if (order?.customer_email) {
          const items = await getOrderItems(result.orderId, schema);
          const firstContentId = items[0]?.content_id;
          const productTitle = firstContentId ? await getContentTitleById(firstContentId, schema) : undefined;
          const amount = order.total != null && order.currency
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency }).format(order.total)
            : undefined;
          sendSubscriptionRenewalEmail(order.customer_email, {
            customerName: (order.billing_snapshot as { name?: string } | null)?.name ?? undefined,
            productTitle,
            amount,
          }).catch(() => {});
        }
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId = (invoice as { subscription?: string | null }).subscription;
    console.warn("Stripe webhook: invoice.payment_failed", invoice.id, subId ?? "no subscription");
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (customerId && subId) {
      const resolved = await resolveContactAndUserFromStripeCustomer(customerId);
      const to = resolved.email?.trim();
      const contact = resolved.contact_id ? await getContactById(resolved.contact_id) : null;
      if (to) {
        const row = await getSubscriptionByStripeId(subId, schema);
        const productTitle = row?.content_id ? await getContentTitleById(row.content_id, schema) : undefined;
        sendSubscriptionCanceledOrFailedEmail(to, "payment_failed", {
          customerName: contact?.full_name ?? undefined,
          productTitle,
        }).catch(() => {});
      }
    }
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
