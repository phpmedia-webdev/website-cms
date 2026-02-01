/**
 * Membership code generation and redemption.
 * Two types: single-use (unique codes per redemption) and multi-use (one shared code).
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { addContactToMag, getContactMags, createNote, getMagById } from "@/lib/supabase/crm";
import { createHash } from "crypto";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Preset: omit ambiguous chars (o,O,0,i,I,l,L,1) */
const NO_AMBIGUOUS = "oO0iIlL1";

export interface CodePatternOptions {
  prefix?: string;
  suffix?: string;
  randomLength?: number;
  excludeChars?: string;
}

/**
 * Generate a crypto-safe random code string with optional prefix/suffix.
 */
export function generateCodeString(options: CodePatternOptions = {}): string {
  const {
    prefix = "",
    suffix = "",
    randomLength = 8,
    excludeChars = NO_AMBIGUOUS,
  } = options;

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789".replace(
    new RegExp(`[${excludeChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`, "gi"),
    ""
  );

  const bytes = new Uint8Array(randomLength * 2); // oversample for modulo
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    throw new Error("crypto.getRandomValues not available");
  }

  let result = "";
  for (let i = 0; i < randomLength; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return prefix + result + suffix;
}

/**
 * Normalize and hash a code for storage/lookup. Never store plain codes.
 */
export function hashCode(code: string): string {
  const normalized = code.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Create a single-use code batch (no codes yet; call generateSingleUseCodes to populate).
 */
export async function createSingleUseBatch(
  magId: string,
  name: string,
  options: {
    numCodes: number;
    expiresAt?: Date | null;
    codePrefix?: string;
    codeSuffix?: string;
    randomLength?: number;
    excludeChars?: string;
    createdBy?: string;
  }
): Promise<{ batchId: string; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("membership_code_batches")
    .insert({
      mag_id: magId,
      name,
      use_type: "single_use",
      num_codes: options.numCodes,
      expires_at: options.expiresAt?.toISOString() ?? null,
      code_prefix: options.codePrefix ?? null,
      code_suffix: options.codeSuffix ?? null,
      random_length: options.randomLength ?? 8,
      exclude_chars: options.excludeChars ?? NO_AMBIGUOUS,
      created_by: options.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error) return { batchId: "", error: new Error(error.message) };
  return { batchId: (data as { id: string }).id, error: null };
}

/**
 * Create a multi-use code batch (one shared code, finite or unlimited uses).
 */
export async function createMultiUseCode(
  magId: string,
  code: string,
  options: { name?: string; maxUses?: number; expiresAt?: Date | null }
): Promise<{ batchId: string; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const codeHash = hashCode(code);

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("membership_code_batches")
    .insert({
      mag_id: magId,
      name: options.name ?? `Multi-use ${code.slice(0, 4)}...`,
      use_type: "multi_use",
      code_hash: codeHash,
      code_plain: code.trim(),
      max_uses: options.maxUses ?? null,
      use_count: 0,
      expires_at: options.expiresAt?.toISOString() ?? null,
    })
    .select("id")
    .single();

  if (error) return { batchId: "", error: new Error(error.message) };
  return { batchId: (data as { id: string }).id, error: null };
}

/**
 * Generate single-use codes and insert into membership_codes.
 * Returns plain codes (only once - caller must save for distribution). We never store plain codes.
 */
export async function generateSingleUseCodes(
  batchId: string,
  count: number,
  options: CodePatternOptions = {}
): Promise<{ codes: string[]; error: Error | null }> {
  const supabase = createServerSupabaseClient();

  const batch = await supabase
    .schema(SCHEMA)
    .from("membership_code_batches")
    .select("id, random_length, code_prefix, code_suffix, exclude_chars")
    .eq("id", batchId)
    .single();

  if (batch.error || !batch.data) {
    return { codes: [], error: new Error(batch.error?.message ?? "Batch not found") };
  }

  const b = batch.data as {
    id: string;
    random_length?: number;
    code_prefix?: string | null;
    code_suffix?: string | null;
    exclude_chars?: string | null;
  };

  const patternOptions: CodePatternOptions = {
    prefix: options.prefix ?? b.code_prefix ?? "",
    suffix: options.suffix ?? b.code_suffix ?? "",
    randomLength: options.randomLength ?? b.random_length ?? 8,
    excludeChars: options.excludeChars ?? b.exclude_chars ?? NO_AMBIGUOUS,
  };

  const seen = new Set<string>();
  const rows: { batch_id: string; code_hash: string; code_plain: string }[] = [];
  const plainCodes: string[] = [];

  for (let i = 0; i < count * 2; i++) {
    if (rows.length >= count) break;
    const plain = generateCodeString(patternOptions);
    const h = hashCode(plain);
    if (seen.has(h)) continue;
    seen.add(h);
    rows.push({ batch_id: batchId, code_hash: h, code_plain: plain });
    plainCodes.push(plain);
  }

  if (rows.length === 0) return { codes: [], error: new Error("Could not generate unique codes") };

  const { error } = await supabase.schema(SCHEMA).from("membership_codes").insert(rows);

  if (error) return { codes: [], error: new Error(error.message) };
  return { codes: plainCodes, error: null };
}

export interface RedeemResult {
  success: boolean;
  error?: string;
  magId?: string;
}

/**
 * Redeem a code. Assigns MAG to the member's contact.
 * Idempotent: if contact already has MAG, returns success without double-assigning.
 */
export async function redeemCode(
  code: string,
  memberId: string
): Promise<RedeemResult> {
  const supabase = createServerSupabaseClient();
  const codeHash = hashCode(code);

  const member = await supabase
    .schema(SCHEMA)
    .from("members")
    .select("id, contact_id")
    .eq("id", memberId)
    .single();

  if (member.error || !member.data) {
    return { success: false, error: "Member not found" };
  }
  const contactId = (member.data as { contact_id: string }).contact_id;

  const now = new Date().toISOString();

  // Single-use: find available code
  const single = await supabase
    .schema(SCHEMA)
    .from("membership_codes")
    .select("id, batch_id")
    .eq("code_hash", codeHash)
    .eq("status", "available")
    .limit(1)
    .maybeSingle();

  if (single.data) {
    const row = single.data as { id: string; batch_id: string };
    const batch = await supabase
      .schema(SCHEMA)
      .from("membership_code_batches")
      .select("mag_id, expires_at")
      .eq("id", row.batch_id)
      .single();

    if (batch.error || !batch.data) return { success: false, error: "Invalid batch" };
    const b = batch.data as { mag_id: string; expires_at: string | null };
    if (b.expires_at && b.expires_at < now) return { success: false, error: "Code expired" };

    const existing = await getContactMags(contactId);
    if (existing.some((m) => m.mag_id === b.mag_id)) {
      return { success: true, magId: b.mag_id };
    }

    const { error: assignErr } = await addContactToMag(contactId, b.mag_id, "code");
    if (assignErr) return { success: false, error: assignErr.message };

    await supabase
      .schema(SCHEMA)
      .from("membership_codes")
      .update({
        status: "redeemed",
        redeemed_at: now,
        redeemed_by_member_id: memberId,
      })
      .eq("id", row.id);

    const mag = await getMagById(b.mag_id);
    await createNote(
      contactId,
      `Membership code redeemed: ${mag?.name ?? "Membership"} (${mag?.uid ?? ""})`,
      null,
      "code_redemption"
    );

    return { success: true, magId: b.mag_id };
  }

  // Multi-use: find batch
  const multi = await supabase
    .schema(SCHEMA)
    .from("membership_code_batches")
    .select("id, mag_id, max_uses, use_count, expires_at")
    .eq("use_type", "multi_use")
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (multi.data) {
    const b = multi.data as {
      id: string;
      mag_id: string;
      max_uses: number | null;
      use_count: number;
      expires_at: string | null;
    };
    if (b.expires_at && b.expires_at < now) return { success: false, error: "Code expired" };
    if (b.max_uses != null && b.use_count >= b.max_uses) {
      return { success: false, error: "Code has reached maximum uses" };
    }

    const existing = await getContactMags(contactId);
    if (existing.some((m) => m.mag_id === b.mag_id)) {
      return { success: true, magId: b.mag_id };
    }

    const { error: assignErr } = await addContactToMag(contactId, b.mag_id, "code");
    if (assignErr) return { success: false, error: assignErr.message };

    await supabase
      .schema(SCHEMA)
      .from("membership_code_batches")
      .update({ use_count: b.use_count + 1 })
      .eq("id", b.id);

    await supabase.schema(SCHEMA).from("membership_code_redemptions").insert({
      batch_id: b.id,
      member_id: memberId,
      contact_id: contactId,
    });

    const mag = await getMagById(b.mag_id);
    await createNote(
      contactId,
      `Membership code redeemed: ${mag?.name ?? "Membership"} (${mag?.uid ?? ""})`,
      null,
      "code_redemption"
    );

    return { success: true, magId: b.mag_id };
  }

  return { success: false, error: "Invalid or already used code" };
}
