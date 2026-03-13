/**
 * Step 46: Stripe → order history sync.
 * List Stripe paid Invoices; for each, ensure customer synced (contact with external_stripe_id),
 * then create order + order_items from invoice line items. Idempotent by stripe_invoice_id.
 */

import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/config";
import {
  getContactByExternalId,
  getContactByEmail,
  createContact,
  updateContact,
} from "@/lib/supabase/crm";
import { CRM_STATUS_SLUG_NEW } from "@/lib/supabase/settings";
import {
  getOrderIdByStripeInvoiceId,
  createOrderFromStripeInvoice,
} from "@/lib/shop/subscriptions";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/**
 * Ensure a CRM contact exists for the Stripe customer (by external_stripe_id or email).
 * If contact exists by stripe id, do nothing. Else find by email and set external_stripe_id, or create.
 */
export async function ensureContactForStripeCustomer(
  stripeCustomerId: string,
  email: string | null
): Promise<void> {
  const existingByStripe = await getContactByExternalId("stripe", stripeCustomerId);
  if (existingByStripe) return;

  const trimmedEmail = email?.trim() || null;
  if (trimmedEmail) {
    const existingByEmail = await getContactByEmail(trimmedEmail);
    if (existingByEmail) {
      await updateContact(existingByEmail.id, { external_stripe_id: stripeCustomerId });
      return;
    }
    await createContact({
      email: trimmedEmail,
      external_stripe_id: stripeCustomerId,
      status: CRM_STATUS_SLUG_NEW,
      source: "stripe_sync",
    });
  }
}

export interface SyncStripeOrdersOptions {
  /** Unix timestamp (seconds). Only include invoices created on or after this time. */
  createdGte?: number;
  /** Unix timestamp (seconds). Only include invoices created on or before this time. */
  createdLte?: number;
  /** Stripe customer ID. Only include invoices for this customer. */
  customerId?: string;
}

export interface StripeOrdersSyncResult {
  ok: boolean;
  error?: string;
  created: number;
  skipped: number;
  errors: Array<{ invoice_id: string; error: string }>;
}

/**
 * List paid Stripe invoices (with optional date range and customer filter), ensure customer
 * is synced to CRM, then create order + order_items for each invoice not already in app.
 * Idempotent by stripe_invoice_id.
 */
export async function syncStripeInvoiceOrdersToApp(
  options?: SyncStripeOrdersOptions,
  schema?: string
): Promise<StripeOrdersSyncResult> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured.",
      created: 0,
      skipped: 0,
      errors: [],
    };
  }

  const result: StripeOrdersSyncResult = {
    ok: true,
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const listParams: Stripe.InvoiceListParams = {
        status: "paid",
        limit: 100,
        starting_after: startingAfter,
      };
      if (options?.createdGte != null || options?.createdLte != null) {
        listParams.created = {};
        if (options.createdGte != null) (listParams.created as Record<string, number>).gte = options.createdGte;
        if (options.createdLte != null) (listParams.created as Record<string, number>).lte = options.createdLte;
      }
      if (options?.customerId) listParams.customer = options.customerId;

      const list = await stripe.invoices.list(listParams);
      const invoices = list.data;
      hasMore = list.has_more;
      if (invoices.length) startingAfter = invoices[invoices.length - 1].id;

      for (const inv of invoices) {
        const invoiceId = inv.id;
        const existingOrderId = await getOrderIdByStripeInvoiceId(invoiceId, schemaName);
        if (existingOrderId) {
          result.skipped += 1;
          continue;
        }

        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (!customerId) {
          result.errors.push({ invoice_id: invoiceId, error: "Invoice has no customer" });
          continue;
        }

        const customerEmail = (inv as { customer_email?: string | null }).customer_email?.trim() ?? null;
        await ensureContactForStripeCustomer(customerId, customerEmail);

        const fullInvoice = await stripe.invoices.retrieve(invoiceId, {
          expand: ["lines.data.price"],
        }) as Stripe.Invoice;
        const orderResult = await createOrderFromStripeInvoice(fullInvoice, schemaName);
        if (orderResult) {
          result.created += 1;
        } else {
          result.errors.push({
            invoice_id: invoiceId,
            error: "Failed to create order (no mapped line items or insert failed)",
          });
        }
      }
    }

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("syncStripeInvoiceOrdersToApp:", e);
    return {
      ok: false,
      error: message,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
    };
  }
}
