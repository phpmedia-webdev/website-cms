/**
 * Checkout coupon flow (Step 19).
 * Validate discount codes (membership_code_batches with purpose=discount) and redeem on order.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { hashCode } from "@/lib/mags/code-generator";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface ValidateDiscountResult {
  valid: boolean;
  discount_amount?: number;
  coupon_code?: string;
  coupon_batch_id?: string;
  error?: string;
}

/**
 * Validate a discount code against cart subtotal.
 * Returns discount_amount (positive number to subtract), coupon_code (normalized), coupon_batch_id.
 * For single-use: looks up membership_codes by code_hash where status=available, then batch.
 * For multi-use: looks up membership_code_batches by code_hash where use_type=multi_use.
 */
export async function validateDiscountCode(
  code: string,
  subtotal: number,
  schema?: string
): Promise<ValidateDiscountResult> {
  const schemaName = schema ?? SCHEMA;
  const trimmed = code?.trim();
  if (!trimmed) return { valid: false, error: "Code is required" };

  const codeHash = hashCode(trimmed);
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const subtotalNum = Number(subtotal) || 0;
  if (subtotalNum <= 0) return { valid: false, error: "Cart subtotal must be greater than zero" };

  // Single-use: find available code
  const { data: codeRow } = await supabase
    .schema(schemaName)
    .from("membership_codes")
    .select("id, batch_id")
    .eq("code_hash", codeHash)
    .eq("status", "available")
    .limit(1)
    .maybeSingle();

  if (codeRow) {
    const row = codeRow as { id: string; batch_id: string };
    const { data: batch } = await supabase
      .schema(schemaName)
      .from("membership_code_batches")
      .select("id, purpose, discount_type, discount_value, min_purchase, expires_at")
      .eq("id", row.batch_id)
      .single();

    if (!batch) return { valid: false, error: "Invalid code" };
    const b = batch as {
      id: string;
      purpose?: string;
      discount_type?: string | null;
      discount_value?: number | null;
      min_purchase?: number | null;
      expires_at?: string | null;
    };
    if (b.purpose !== "discount") {
      return { valid: false, error: "This code is not a discount code." };
    }
    if (b.expires_at && b.expires_at < now) {
      return { valid: false, error: "Code has expired." };
    }
    const minPurchase = Number(b.min_purchase) || 0;
    if (minPurchase > 0 && subtotalNum < minPurchase) {
      return { valid: false, error: `Minimum purchase of $${minPurchase.toFixed(2)} required.` };
    }
    const discount = computeDiscount(
      b.discount_type ?? "fixed",
      Number(b.discount_value) ?? 0,
      subtotalNum
    );
    if (discount <= 0) {
      return { valid: false, error: "Invalid discount configuration." };
    }
    return {
      valid: true,
      discount_amount: discount,
      coupon_code: trimmed,
      coupon_batch_id: b.id,
    };
  }

  // Multi-use: batch with code_hash
  const { data: multiBatch } = await supabase
    .schema(schemaName)
    .from("membership_code_batches")
    .select("id, purpose, discount_type, discount_value, min_purchase, expires_at, max_uses, use_count")
    .eq("use_type", "multi_use")
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (multiBatch) {
    const b = multiBatch as {
      id: string;
      purpose?: string;
      discount_type?: string | null;
      discount_value?: number | null;
      min_purchase?: number | null;
      expires_at?: string | null;
      max_uses?: number | null;
      use_count?: number;
    };
    if (b.purpose !== "discount") {
      return { valid: false, error: "This code is not a discount code." };
    }
    if (b.expires_at && b.expires_at < now) {
      return { valid: false, error: "Code has expired." };
    }
    const maxUses = b.max_uses != null ? Number(b.max_uses) : null;
    const useCount = Number(b.use_count) ?? 0;
    if (maxUses != null && useCount >= maxUses) {
      return { valid: false, error: "Code has reached maximum uses." };
    }
    const minPurchase = Number(b.min_purchase) || 0;
    if (minPurchase > 0 && subtotalNum < minPurchase) {
      return { valid: false, error: `Minimum purchase of $${minPurchase.toFixed(2)} required.` };
    }
    const discount = computeDiscount(
      b.discount_type ?? "fixed",
      Number(b.discount_value) ?? 0,
      subtotalNum
    );
    if (discount <= 0) {
      return { valid: false, error: "Invalid discount configuration." };
    }
    return {
      valid: true,
      discount_amount: discount,
      coupon_code: trimmed,
      coupon_batch_id: b.id,
    };
  }

  return { valid: false, error: "Invalid or expired code." };
}

function computeDiscount(
  discountType: string,
  discountValue: number,
  subtotal: number
): number {
  if (discountValue <= 0) return 0;
  if (discountType === "percent") {
    const amount = (subtotal * Math.min(100, discountValue)) / 100;
    return Math.round(amount * 100) / 100;
  }
  return Math.min(discountValue, subtotal);
}

/**
 * Redeem a discount code (mark single-use as redeemed or increment multi-use).
 * Call after order is created so the code is consumed.
 */
export async function redeemDiscountCode(
  code: string,
  schema?: string
): Promise<{ ok: boolean; error?: string }> {
  const schemaName = schema ?? SCHEMA;
  const trimmed = code?.trim();
  if (!trimmed) return { ok: false, error: "Code is required" };

  const codeHash = hashCode(trimmed);
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data: codeRow } = await supabase
    .schema(schemaName)
    .from("membership_codes")
    .select("id, batch_id")
    .eq("code_hash", codeHash)
    .eq("status", "available")
    .limit(1)
    .maybeSingle();

  if (codeRow) {
    const row = codeRow as { id: string };
    const { error } = await supabase
      .schema(schemaName)
      .from("membership_codes")
      .update({ status: "redeemed", redeemed_at: now })
      .eq("id", row.id);
    if (error) {
      console.warn("redeemDiscountCode single-use:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  const { data: batch } = await supabase
    .schema(schemaName)
    .from("membership_code_batches")
    .select("id, use_count")
    .eq("use_type", "multi_use")
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (batch) {
    const b = batch as { id: string; use_count: number };
    const { error } = await supabase
      .schema(schemaName)
      .from("membership_code_batches")
      .update({ use_count: (b.use_count ?? 0) + 1 })
      .eq("id", b.id);
    if (error) {
      console.warn("redeemDiscountCode multi-use:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  return { ok: false, error: "Code not found or already used." };
}
