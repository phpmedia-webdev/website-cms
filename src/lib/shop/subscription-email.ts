/**
 * Step 35: Subscription lifecycle emails (started, renewal, canceled/payment failed).
 * Plain text fallback; templates can be added later by slug.
 */

import { sendEmail } from "@/lib/email/send";
import { getSiteMetadata } from "@/lib/supabase/settings";

export type SubscriptionEmailKind = "started" | "renewal" | "canceled" | "payment_failed";

async function getBusinessName(): Promise<string> {
  const meta = await getSiteMetadata();
  return meta.name ?? "Us";
}

/**
 * Send subscription started email (after customer.subscription.created).
 */
export async function sendSubscriptionStartedEmail(
  to: string,
  options: { customerName?: string; productTitle?: string }
): Promise<void> {
  const business = await getBusinessName();
  const name = options.customerName?.trim() || "there";
  const product = options.productTitle?.trim() || "your subscription";
  const subject = `Your subscription to ${product} has started`;
  const text = `Hi ${name},\n\nYour subscription to ${product} has started. You can view and manage it from your account.\n\n— ${business}`;
  await sendEmail({ to, subject, text }).catch((e) =>
    console.warn("Subscription started email failed:", e)
  );
}

/**
 * Send subscription renewal email (after invoice.paid with billing_reason subscription_cycle).
 */
export async function sendSubscriptionRenewalEmail(
  to: string,
  options: { customerName?: string; productTitle?: string; amount?: string }
): Promise<void> {
  const business = await getBusinessName();
  const name = options.customerName?.trim() || "there";
  const product = options.productTitle?.trim() || "your subscription";
  const amount = options.amount ? ` (${options.amount})` : "";
  const subject = `Your subscription has renewed`;
  const text = `Hi ${name},\n\nYour subscription to ${product} has renewed${amount}. Thank you for your continued support.\n\n— ${business}`;
  await sendEmail({ to, subject, text }).catch((e) =>
    console.warn("Subscription renewal email failed:", e)
  );
}

/**
 * Send subscription canceled or payment failed email.
 */
export async function sendSubscriptionCanceledOrFailedEmail(
  to: string,
  kind: "canceled" | "payment_failed",
  options: { customerName?: string; productTitle?: string }
): Promise<void> {
  const business = await getBusinessName();
  const name = options.customerName?.trim() || "there";
  const product = options.productTitle?.trim() || "your subscription";
  const subject =
    kind === "canceled"
      ? `Your subscription to ${product} has been canceled`
      : `There was a problem with your subscription payment`;
  const text =
    kind === "canceled"
      ? `Hi ${name},\n\nYour subscription to ${product} has been canceled. You will not be charged again.\n\n— ${business}`
      : `Hi ${name},\n\nWe couldn't process the payment for your subscription to ${product}. Please update your payment method in your account to avoid interruption.\n\n— ${business}`;
  await sendEmail({ to, subject, text }).catch((e) =>
    console.warn("Subscription canceled/failed email failed:", e)
  );
}
