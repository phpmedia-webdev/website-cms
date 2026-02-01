/**
 * Galleries utilities: list galleries, get media assignments, add/remove media,
 * display styles (gallery_display_styles table).
 */

import { createClientSupabaseClient } from "./client";
import { getClientSchema } from "./schema";
import type { GalleryDisplayStyle } from "@/types/content";

export interface GalleryListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface GalleryItemWithGallery {
  id: string;
  gallery_id: string;
  media_id: string;
  position: number;
  gallery?: { id: string; name: string; slug: string } | null;
}

/** Get published galleries (for assign-to-gallery picklist). Uses client schema. */
export async function getPublishedGalleries(): Promise<GalleryListItem[]> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase
    .from("galleries")
    .select("id, name, slug, status")
    .eq("status", "published")
    .order("name", { ascending: true });

  if (error) {
    console.error("getPublishedGalleries error:", error);
    return [];
  }
  return (data ?? []) as GalleryListItem[];
}

/** Get galleries that contain this media item. Returns gallery_item ids and gallery info. */
export async function getGalleriesForMedia(
  mediaId: string
): Promise<GalleryItemWithGallery[]> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, gallery_id, media_id, position, galleries(name, slug)")
    .eq("media_id", mediaId);

  if (error) {
    console.error("getGalleriesForMedia error:", error);
    return [];
  }

  const items = (data ?? []) as {
    id: string;
    gallery_id: string;
    media_id: string;
    position: number | null;
    galleries: { name: string; slug: string } | null;
  }[];
  return items.map((item) => ({
    id: item.id,
    gallery_id: item.gallery_id,
    media_id: item.media_id,
    position: item.position ?? 0,
    gallery: item.galleries
      ? { id: item.gallery_id, name: item.galleries.name, slug: item.galleries.slug }
      : null,
  }));
}

/** Add media to gallery. Returns error message or null on success. */
export async function addMediaToGallery(
  mediaId: string,
  galleryId: string
): Promise<string | null> {
  const supabase = createClientSupabaseClient();

  // Get max position in gallery
  const { data: existing } = await supabase
    .from("gallery_items")
    .select("position")
    .eq("gallery_id", galleryId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = existing?.position != null ? existing.position + 1 : 0;

  const { error } = await supabase.from("gallery_items").insert({
    gallery_id: galleryId,
    media_id: mediaId,
    position,
  });

  if (error) {
    if (error.code === "23505") {
      // Unique violation - already in gallery
      return null;
    }
    console.error("addMediaToGallery error:", error);
    return error.message;
  }
  return null;
}

/** Get display URLs for media IDs from media_variants (original or large). Media table has no url column. */
export async function getMediaUrls(
  mediaIds: string[]
): Promise<Map<string, string>> {
  if (mediaIds.length === 0) return new Map();
  const supabase = createClientSupabaseClient();
  const { data } = await supabase
    .from("media_variants")
    .select("media_id, url")
    .in("media_id", mediaIds)
    .in("variant_type", ["original", "large"])
    .order("variant_type", { ascending: false });
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (!map.has(row.media_id)) map.set(row.media_id, row.url);
  }
  return map;
}

/** Remove media from gallery. Returns error message or null on success. */
export async function removeMediaFromGallery(
  mediaId: string,
  galleryId: string
): Promise<string | null> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase
    .from("gallery_items")
    .delete()
    .eq("media_id", mediaId)
    .eq("gallery_id", galleryId);

  if (error) {
    console.error("removeMediaFromGallery error:", error);
    return error.message;
  }
  return null;
}

/** Get display styles for a gallery. Uses client schema. */
export async function getDisplayStylesByGalleryId(
  galleryId: string
): Promise<GalleryDisplayStyle[]> {
  const supabase = createClientSupabaseClient();
  const schema = getClientSchema();
  const { data, error } = await supabase
    .schema(schema)
    .from("gallery_display_styles")
    .select("*")
    .eq("gallery_id", galleryId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getDisplayStylesByGalleryId error:", error);
    return [];
  }
  return (data ?? []) as GalleryDisplayStyle[];
}

/** Get single display style by ID. Uses client schema. */
export async function getDisplayStyleById(
  styleId: string
): Promise<GalleryDisplayStyle | null> {
  const supabase = createClientSupabaseClient();
  const schema = getClientSchema();
  const { data, error } = await supabase
    .schema(schema)
    .from("gallery_display_styles")
    .select("*")
    .eq("id", styleId)
    .maybeSingle();

  if (error) {
    console.error("getDisplayStyleById error:", error);
    return null;
  }
  return data as GalleryDisplayStyle | null;
}
