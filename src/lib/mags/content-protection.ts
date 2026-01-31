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

  const termIds = [...new Set(rels.map((r) => r.term_id))];

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
