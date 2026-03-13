/**
 * Step 45: Stripe → CRM customers sync.
 * List Stripe Customers; for each, find or create CRM contact by external_stripe_id or email,
 * set external_stripe_id, and optionally update name/address from Stripe.
 * Idempotent by stripe_customer_id.
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

export interface StripeCustomerSyncResult {
  ok: boolean;
  error?: string;
  created: number;
  updated: number;
  errors: Array<{ stripe_customer_id: string; error: string }>;
}

function mapStripeCustomerToContactFields(customer: Stripe.Customer): Partial<{
  email: string | null;
  full_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}> {
  const address = customer.address;
  return {
    email: customer.email?.trim() || null,
    full_name: customer.name?.trim() || null,
    address: address?.line1?.trim() || null,
    city: address?.city?.trim() || null,
    state: address?.state?.trim() || null,
    postal_code: address?.postal_code?.trim() || null,
    country: address?.country?.trim() || null,
  };
}

/**
 * Sync all Stripe customers to CRM contacts.
 * For each Stripe customer: find contact by external_stripe_id or email; if not found create;
 * set external_stripe_id; optionally update name/address from Stripe.
 */
export async function syncStripeCustomersToCrm(): Promise<StripeCustomerSyncResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured.",
      created: 0,
      updated: 0,
      errors: [],
    };
  }

  const result: StripeCustomerSyncResult = {
    ok: true,
    created: 0,
    updated: 0,
    errors: [],
  };

  try {
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const list = await stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });
      const customers = list.data as Stripe.Customer[];
      hasMore = list.has_more;
      if (customers.length) startingAfter = customers[customers.length - 1].id;

      for (const customer of customers) {
        const stripeId = customer.id;
        const existingByStripe = await getContactByExternalId("stripe", stripeId);
        const existingByEmail =
          !existingByStripe && customer.email
            ? await getContactByEmail(customer.email)
            : null;
        const existing = existingByStripe ?? existingByEmail;
        const fields = mapStripeCustomerToContactFields(customer);

        if (existing) {
          const updates: Record<string, unknown> = {
            external_stripe_id: stripeId,
            ...fields,
          };
          const { error } = await updateContact(existing.id, updates);
          if (error) {
            result.errors.push({
              stripe_customer_id: stripeId,
              error: error.message,
            });
          } else {
            result.updated += 1;
          }
          continue;
        }

        const email = customer.email?.trim() || null;
        if (!email) {
          result.errors.push({
            stripe_customer_id: stripeId,
            error: "Stripe customer has no email; cannot create contact.",
          });
          continue;
        }

        const { contact, error } = await createContact({
          email,
          full_name: fields.full_name ?? null,
          address: fields.address ?? null,
          city: fields.city ?? null,
          state: fields.state ?? null,
          postal_code: fields.postal_code ?? null,
          country: fields.country ?? null,
          external_stripe_id: stripeId,
          status: CRM_STATUS_SLUG_NEW,
          source: "stripe_sync",
        });
        if (error || !contact) {
          result.errors.push({
            stripe_customer_id: stripeId,
            error: error?.message ?? "Failed to create contact",
          });
        } else {
          result.created += 1;
        }
      }
    }

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("syncStripeCustomersToCrm:", e);
    return {
      ok: false,
      error: message,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    };
  }
}
