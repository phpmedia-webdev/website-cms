/**
 * Order-related transactional email (Steps 21f, 21g).
 * Order confirmation on paid; digital delivery when order completed (no shippable).
 * Uses template by slug or fallback minimal email.
 */

import { getSiteMetadata } from "@/lib/supabase/settings";
import { getSetting } from "@/lib/supabase/settings";
import { SMTP_CONFIG_KEY, type SmtpConfigStored } from "@/lib/email/smtp-config";
import { sendEmail } from "@/lib/email/send";
import {
  sendTemplateEmail,
  type TemplateContext,
} from "@/lib/email/templates";
import { getOrderDownloadLinks } from "./order-download-links";
import type { OrderRow, OrderItemRow } from "./orders";
import type { AddressSnapshot } from "./orders";

/** Order total and line totals are stored in main currency units (e.g. dollars). */
function formatCurrency(amount: number, currency: string = "USD"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase() || "USD",
  });
  return formatter.format(amount);
}

function getNameFromSnapshot(snapshot: AddressSnapshot | Record<string, unknown> | null): string {
  if (!snapshot || typeof snapshot !== "object") return "";
  const name = (snapshot as AddressSnapshot).name ?? (snapshot as Record<string, unknown>).name;
  return name != null ? String(name).trim() : "";
}

/**
 * Build template context for order emails from order, items, and site/SMTP settings.
 */
export async function buildOrderTemplateContext(
  order: OrderRow,
  items: OrderItemRow[]
): Promise<TemplateContext> {
  const meta = await getSiteMetadata();
  const smtp = await getSetting<SmtpConfigStored>(SMTP_CONFIG_KEY);
  const siteUrl = meta.url?.replace(/\/$/, "") || "";
  const orderDetailPath = `/members/orders/${order.id}`;
  const accessLink = siteUrl ? `${siteUrl}${orderDetailPath}` : orderDetailPath;

  const customerName =
    getNameFromSnapshot(order.billing_snapshot as AddressSnapshot | null) ||
    order.customer_email;

  const itemsSummary = items.length
    ? items
        .map(
          (i) =>
            `${i.name_snapshot} × ${i.quantity} — ${formatCurrency(i.line_total, order.currency)}`
        )
        .join("\n")
    : "";

  return {
    customer_name: customerName,
    customer_email: order.customer_email,
    order_id: order.id,
    order_total: formatCurrency(order.total, order.currency),
    items_summary: itemsSummary,
    access_link: accessLink,
    site_name: meta.name ?? "",
    business_name: smtp?.from_name?.trim() ?? meta.name ?? "",
    business_email: smtp?.from_email?.trim() ?? "",
    download_links,
  };
}

const ORDER_CONFIRMATION_SLUG = "order-confirmation";
const DIGITAL_DELIVERY_SLUG = "digital-delivery";

/**
 * Send order confirmation email when order is marked paid.
 * Uses template slug "order-confirmation" if published; otherwise sends minimal fallback.
 */
export async function sendOrderConfirmationEmail(
  order: OrderRow,
  items: OrderItemRow[]
): Promise<void> {
  const context = await buildOrderTemplateContext(order, items);
  const result = await sendTemplateEmail(ORDER_CONFIRMATION_SLUG, order.customer_email, context);

  if (result === "no_template") {
    const fallbackSubject = "Order confirmed";
    const fallbackBody = `Thank you for your order.\n\nOrder #${order.id}\nTotal: ${formatCurrency(order.total, order.currency)}\n\nView your order: ${context.access_link || "(members area)"}`;
    await sendEmail({
      to: order.customer_email,
      subject: fallbackSubject,
      text: fallbackBody,
    });
    // Optional: log that custom template was not used
    return;
  }

  if (!result) {
    console.warn("Order confirmation email send failed for order", order.id);
  }
}

/**
 * Send digital delivery / access instructions when order is completed (no shippable items).
 * Uses template slug "digital-delivery" if published; otherwise minimal fallback.
 */
export async function sendDigitalDeliveryEmail(
  order: OrderRow,
  items: OrderItemRow[]
): Promise<void> {
  const context = await buildOrderTemplateContext(order, items);
  const result = await sendTemplateEmail(DIGITAL_DELIVERY_SLUG, order.customer_email, context);

  if (result === "no_template") {
    const fallbackSubject = "Your purchase is complete";
    const fallbackBody = `Hi ${context.customer_name || "there"},\n\nYour purchase is complete. Access your order and any digital items here: ${context.access_link || "(members area)"}\n\n${context.business_name ? `— ${context.business_name}` : ""}`;
    await sendEmail({
      to: order.customer_email,
      subject: fallbackSubject,
      text: fallbackBody,
    });
    return;
  }

  if (!result) {
    console.warn("Digital delivery email send failed for order", order.id);
  }
}
