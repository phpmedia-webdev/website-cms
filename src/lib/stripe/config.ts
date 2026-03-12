/**
 * Stripe config (Step 9). Server-only for secret keys.
 * Read from env: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET.
 * Used by Create Stripe Product (Step 11), Checkout Session (Step 18), and webhook handler (Step 20).
 */

import Stripe from "stripe";

/** Server-only: Stripe secret key (sk_test_... or sk_live_...). Null if not set. */
export function getStripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || null;
}

/** Publishable key (pk_test_... or pk_live_...). Safe for client; null if not set. */
export function getStripePublishableKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ??
    process.env.STRIPE_PUBLISHABLE_KEY?.trim();
  return key || null;
}

/** Server-only: Webhook signing secret (whsec_...). Used to verify checkout.session.completed etc. */
export function getStripeWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret || null;
}

/** Server-only: Stripe SDK instance. Null if STRIPE_SECRET_KEY not set. Use for Products.create, checkout.sessions.create, etc. */
export function getStripeClient(): Stripe | null {
  const key = getStripeSecretKey();
  if (!key) return null;
  return new Stripe(key);
}
