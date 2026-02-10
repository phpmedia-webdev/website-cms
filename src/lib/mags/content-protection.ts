/**
 * Content protection helpers for membership (MAG) restriction.
 * Resolves mag-tags on media, checks user MAGs for visibility.
 * Design: media with no mag-tag = public; media with mag-tag = visible only if user has matching MAG.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getContactMags } from "@/lib/supabase/crm";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Prefix for membership restriction tags. Slug format: mag-{mag.uid} */
export const MAG_TAG_PREFIX = "mag-";

/**
 * Get mag-tag slugs assigned to media items.
 * Returns a map of mediaId -> mag-tag slugs (e.g. ["mag-premium", "mag-vip"]).
 */
export async function getMagTagSlugsOnMedia(
  mediaIds: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();

  if (mediaIds.length === 0) return result;

  const supabase = createServerSupabaseClient();

  const { data: rels, error: relErr } = await supabase
    .schema(SCHEMA)
    .from("taxonomy_relationships")
    .select("content_id, term_id")
    .eq("content_type", "media")
    .in("content_id", mediaIds);

  if (relErr || !rels?.length) return result;

  const termIds = [...new Set(rels.map((r: { term_id: string }) => r.term_id))];

  const { data: terms, error: termErr } = await supabase
    .schema(SCHEMA)
    .from("taxonomy_terms")
    .select("id, slug")
    .in("id", termIds)
    .eq("type", "tag");

  if (termErr || !terms?.length) return result;

  const magTagSlugsByTermId = new Map<string, string>();
  for (const t of terms) {
    if (t.slug?.startsWith(MAG_TAG_PREFIX)) {
      magTagSlugsByTermId.set(t.id, t.slug);
    }
  }

  for (const r of rels) {
    const slug = magTagSlugsByTermId.get(r.term_id);
    if (!slug) continue;
    const existing = result.get(r.content_id) ?? [];
    if (!existing.includes(slug)) existing.push(slug);
    result.set(r.content_id, existing);
  }

  return result;
}

/**
 * Check if a user can access media based on mag-tag restriction.
 * @param magTagSlugs - mag-tags on the media (from getMagTagSlugsOnMedia)
 * @param userMagUids - MAG uids the user has (null = anonymous/unauthenticated)
 * @returns true if accessible (no mag-tags, or user has at least one matching MAG)
 */
export function canAccessMediaByMagTags(
  magTagSlugs: string[],
  userMagUids: string[] | null
): boolean {
  if (magTagSlugs.length === 0) return true;
  if (userMagUids == null || userMagUids.length === 0) return false;

  const userMagSlugs = new Set(
    userMagUids.map((uid) => `${MAG_TAG_PREFIX}${uid.toLowerCase()}`)
  );
  return magTagSlugs.some((slug) => userMagSlugs.has(slug.toLowerCase()));
}

/**
 * Filter media IDs to those the user can access based on mag-tag restriction.
 */
export async function filterMediaByMagTagAccess(
  mediaIds: string[],
  userMagUids: string[] | null
): Promise<string[]> {
  if (mediaIds.length === 0) return [];
  const magTags = await getMagTagSlugsOnMedia(mediaIds);

  return mediaIds.filter((id) => {
    const slugs = magTags.get(id) ?? [];
    return canAccessMediaByMagTags(slugs, userMagUids);
  });
}

/**
 * Get MAG uids for a contact (for use with canAccessMediaByMagTags / filterMediaByMagTagAccess).
 */
export async function getMagUidsForContact(contactId: string): Promise<string[]> {
  const mags = await getContactMags(contactId);
  return mags.map((m) => m.mag_uid).filter(Boolean);
}

/**
 * Get MAG uids for the current request user (from cookies/session).
 * Use in API routes or server components. Returns null if unauthenticated, [] if authenticated but not a member.
 */
export async function getMagUidsForCurrentUser(): Promise<string[] | null> {
  const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
  const { getMemberByUserId } = await import("@/lib/supabase/members");

  const supabase = await createServerSupabaseClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const member = await getMemberByUserId(user.id);
  if (!member?.contact_id) return [];

  return getMagUidsForContact(member.contact_id);
}

/**
 * Get MAG IDs (UUIDs) assigned to media items via media_mags table.
 * Returns a map of mediaId -> mag_id[] (empty array = no restriction = public).
 */
export async function getMagIdsOnMedia(
  mediaIds: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();

  if (mediaIds.length === 0) return result;

  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .schema(SCHEMA)
    .from("media_mags")
    .select("media_id, mag_id")
    .in("media_id", mediaIds);

  if (error || !rows?.length) {
    mediaIds.forEach((id) => result.set(id, []));
    return result;
  }

  for (const id of mediaIds) {
    result.set(id, []);
  }
  for (const r of rows as { media_id: string; mag_id: string }[]) {
    const arr = result.get(r.media_id) ?? [];
    if (!arr.includes(r.mag_id)) arr.push(r.mag_id);
    result.set(r.media_id, arr);
  }

  return result;
}

/**
 * Check if a user can access media based on media_mags restriction.
 * @param mediaMagIds - MAG IDs on the media (from getMagIdsOnMedia)
 * @param userMagIds - MAG IDs the user has (null = anonymous, [] = member with no MAGs)
 * @returns true if accessible (no MAGs on media, or user has at least one matching MAG)
 */
export function canAccessMediaByMagIds(
  mediaMagIds: string[],
  userMagIds: string[] | null
): boolean {
  if (mediaMagIds.length === 0) return true;
  if (userMagIds == null || userMagIds.length === 0) return false;

  const userSet = new Set(userMagIds);
  return mediaMagIds.some((id) => userSet.has(id));
}

/**
 * Filter media IDs to those the user can access based on media_mags.
 * Use this for gallery/public API when protection is driven by media_mags (not mag-tag).
 */
export async function filterMediaByMagIdAccess(
  mediaIds: string[],
  userMagIds: string[] | null
): Promise<string[]> {
  if (mediaIds.length === 0) return [];
  const magIdsByMedia = await getMagIdsOnMedia(mediaIds);

  return mediaIds.filter((id) => {
    const magIds = magIdsByMedia.get(id) ?? [];
    return canAccessMediaByMagIds(magIds, userMagIds);
  });
}
