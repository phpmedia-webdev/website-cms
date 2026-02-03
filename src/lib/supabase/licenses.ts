/**
 * User licenses (ownership) utilities: per-item access for media and courses.
 * iTunes-style "My Library". Access: MAG OR ownership grants access.
 * See docs/reference/members-and-ownership-summary.md
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";

const LICENSES_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export type LicenseContentType = "media" | "course";

export interface UserLicense {
  id: string;
  member_id: string;
  content_type: LicenseContentType;
  content_id: string;
  granted_via: string | null;
  granted_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GrantLicenseOptions {
  granted_via?: string;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}

/** Check if member has license for content. Considers expires_at. */
export async function hasLicense(
  memberId: string,
  contentType: LicenseContentType,
  contentId: string
): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(LICENSES_SCHEMA)
    .from("user_licenses")
    .select("id, expires_at")
    .eq("member_id", memberId)
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .maybeSingle();

  if (error || !data) return false;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false;
  return true;
}

/** Grant license to member. Idempotent: if exists, updates options. */
export async function grantLicense(
  memberId: string,
  contentType: LicenseContentType,
  contentId: string,
  options?: GrantLicenseOptions
): Promise<{ license: UserLicense | null; error: string | null }> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const existing = await supabase
    .schema(schema)
    .from("user_licenses")
    .select("*")
    .eq("member_id", memberId)
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .maybeSingle();

  if (existing.data) {
    const updates: Record<string, unknown> = {
      granted_at: new Date().toISOString(),
    };
    if (options?.granted_via != null) updates.granted_via = options.granted_via;
    if (options?.expires_at !== undefined) updates.expires_at = options.expires_at;
    if (options?.metadata != null) updates.metadata = options.metadata;

    const { data, error } = await supabase
      .schema(schema)
      .from("user_licenses")
      .update(updates)
      .eq("id", existing.data.id)
      .select()
      .single();

    if (error) return { license: null, error: error.message };
    return { license: data as UserLicense, error: null };
  }

  const { data, error } = await supabase
    .schema(schema)
    .from("user_licenses")
    .insert({
      member_id: memberId,
      content_type: contentType,
      content_id: contentId,
      granted_via: options?.granted_via ?? null,
      expires_at: options?.expires_at ?? null,
      metadata: options?.metadata ?? {},
    })
    .select()
    .single();

  if (error) return { license: null, error: error.message };
  return { license: data as UserLicense, error: null };
}

/** Revoke license. */
export async function revokeLicense(
  memberId: string,
  contentType: LicenseContentType,
  contentId: string
): Promise<{ error: string | null }> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { error } = await supabase
    .schema(schema)
    .from("user_licenses")
    .delete()
    .eq("member_id", memberId)
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  return { error: error?.message ?? null };
}

/** List licenses for member, optionally filtered by content type. Excludes expired. */
export async function getMemberLicenses(
  memberId: string,
  contentType?: LicenseContentType
): Promise<UserLicense[]> {
  const supabase = createServerSupabaseClient();
  let q = supabase
    .schema(LICENSES_SCHEMA)
    .from("user_licenses")
    .select("*")
    .eq("member_id", memberId)
    .or("expires_at.is.null,expires_at.gte." + new Date().toISOString());

  if (contentType) q = q.eq("content_type", contentType);
  const { data, error } = await q.order("granted_at", { ascending: false });

  if (error) {
    console.error("getMemberLicenses error:", error);
    return [];
  }
  return (data ?? []) as UserLicense[];
}

/** Filter media IDs to only those the member owns. */
export async function filterMediaByOwnership(
  mediaIds: string[],
  memberId: string
): Promise<string[]> {
  if (mediaIds.length === 0) return [];

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(LICENSES_SCHEMA)
    .from("user_licenses")
    .select("content_id")
    .eq("member_id", memberId)
    .eq("content_type", "media")
    .in("content_id", mediaIds)
    .or("expires_at.is.null,expires_at.gte." + new Date().toISOString());

  if (error) return [];
  const owned = new Set((data ?? []).map((r: { content_id: string }) => r.content_id));
  return mediaIds.filter((id) => owned.has(id));
}
