/**
 * Order address snapshot and CRM update (Phase 09 Step 15).
 * When an order has billing/shipping snapshots and the customer is a known contact,
 * update the CRM contact's address fields so the record stays current.
 */

import { getContactByEmail, updateContact } from "@/lib/supabase/crm";
import type { OrderRow } from "./orders";
import type { AddressSnapshot } from "./orders";

function toStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function buildAddressLine(snapshot: AddressSnapshot | Record<string, unknown> | null): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const a = toStr((snapshot as AddressSnapshot).address);
  const a2 = toStr((snapshot as AddressSnapshot).address_line2);
  if (!a && !a2) return null;
  return a2 ? `${a ?? ""}\n${a2}`.trim() : a;
}

/**
 * Update CRM contact's billing and shipping fields from an order's address snapshots.
 * Contact is resolved by order.contact_id, or by order.customer_email (lookup by email).
 * Only updates if we have a contact; does not create contacts (guest remains guest until checkout creates/links one).
 */
export async function updateContactFromOrderAddresses(
  order: OrderRow
): Promise<{ updated: boolean; contactId: string | null }> {
  let contactId: string | null = order.contact_id;

  if (!contactId && order.customer_email) {
    const byEmail = await getContactByEmail(order.customer_email);
    contactId = byEmail?.id ?? null;
  }

  if (!contactId) return { updated: false, contactId: null };

  const billing = order.billing_snapshot as AddressSnapshot | null | undefined;
  const shipping = order.shipping_snapshot as AddressSnapshot | null | undefined;

  const payload: Partial<{
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    shipping_address: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_postal_code: string | null;
    shipping_country: string | null;
  }> = {};

  if (billing && typeof billing === "object") {
    const line = buildAddressLine(billing);
    if (line != null) payload.address = line;
    if (toStr(billing.city) != null) payload.city = toStr(billing.city);
    if (toStr(billing.state) != null) payload.state = toStr(billing.state);
    if (toStr(billing.postal_code) != null) payload.postal_code = toStr(billing.postal_code);
    if (toStr(billing.country) != null) payload.country = toStr(billing.country);
  }

  if (shipping && typeof shipping === "object") {
    const line = buildAddressLine(shipping);
    if (line != null) payload.shipping_address = line;
    if (toStr(shipping.city) != null) payload.shipping_city = toStr(shipping.city);
    if (toStr(shipping.state) != null) payload.shipping_state = toStr(shipping.state);
    if (toStr(shipping.postal_code) != null) payload.shipping_postal_code = toStr(shipping.postal_code);
    if (toStr(shipping.country) != null) payload.shipping_country = toStr(shipping.country);
  }

  if (Object.keys(payload).length === 0) return { updated: false, contactId };

  const { error } = await updateContact(contactId, payload);
  if (error) {
    console.warn("updateContactFromOrderAddresses:", error.message);
    return { updated: false, contactId };
  }
  return { updated: true, contactId };
}
