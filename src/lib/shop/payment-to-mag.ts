/**
 * Payment-to-MAG flow (Phase 09 Step 17).
 * When an order is paid, for each order item whose product has grant_mag_id,
 * ensure the customer is a member and assign them that MAG.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getContactByEmail } from "@/lib/supabase/crm";
import { addContactToMag } from "@/lib/supabase/crm";
import { createMemberForContact } from "@/lib/supabase/members";
import { getOrderById, getOrderItems, type OrderRow } from "./orders";
import { getProductByContentId } from "@/lib/supabase/products";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/**
 * Resolve the contact ID for the order's customer.
 * Uses order.contact_id, or order.user_id → members → contact_id, or getContactByEmail(order.customer_email).
 */
async function resolveContactForOrder(order: OrderRow): Promise<string | null> {
  if (order.contact_id) return order.contact_id;

  if (order.customer_email) {
    const contact = await getContactByEmail(order.customer_email);
    if (contact) return contact.id;
  }

  if (order.user_id) {
    const { getMemberByUserId } = await import("@/lib/supabase/members");
    const member = await getMemberByUserId(order.user_id);
    if (member) return member.contact_id;
  }

  return null;
}

/**
 * Process membership products for a paid order: for each line whose product has grant_mag_id,
 * ensure the customer has a member record and assign the MAG. Idempotent (duplicate MAG assignment is ignored).
 * Call this after marking an order as paid (e.g. from Stripe webhook or admin "mark paid").
 * Returns { processed: number, errors: string[] }.
 */
export async function processMembershipProductsForOrder(
  orderId: string,
  schema?: string
): Promise<{ processed: number; errors: string[] }> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const order = await getOrderById(orderId, schemaName);
  if (!order) return { processed: 0, errors: ["Order not found"] };
  if (order.status !== "paid") {
    return { processed: 0, errors: [`Order status is ${order.status}, not paid. Run after marking order paid.`] };
  }

  const contactId = await resolveContactForOrder(order);
  if (!contactId) {
    return { processed: 0, errors: ["Could not resolve contact for order (no contact_id, user_id, or matching email)."] };
  }

  const items = await getOrderItems(orderId, schemaName);
  const contentIds = [...new Set(items.map((i) => i.content_id))];
  const errors: string[] = [];
  let processed = 0;

  for (const contentId of contentIds) {
    const product = await getProductByContentId(contentId, schemaName);
    if (!product?.grant_mag_id) continue;

    const { error: memberError } = await createMemberForContact(contactId, order.user_id ?? undefined);
    if (memberError) {
      errors.push(`Content ${contentId}: createMemberForContact: ${memberError}`);
      continue;
    }

    const { success, error: magError } = await addContactToMag(
      contactId,
      product.grant_mag_id,
      "purchase"
    );
    if (magError) {
      const msg = magError.message || String(magError);
      const code = (magError as { code?: string }).code;
      if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
        processed += 1;
        continue;
      }
      errors.push(`Content ${contentId} MAG ${product.grant_mag_id}: ${msg}`);
      continue;
    }
    if (success) processed += 1;
  }

  return { processed, errors };
}
