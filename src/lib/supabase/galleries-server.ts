/**
 * Server-side gallery helpers for public rendering.
 * Uses createServerSupabaseClient. Only use in server components / API routes.
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";
import type { GalleryDisplayStyle } from "@/types/content";

export interface GalleryItemForRender {
  id: string;
  media_id: string;
  position: number;
  caption: string | null;
  media: {
    id: string;
    media_type: string;
    alt_text: string | null;
    video_url?: string | null;
    provider?: string | null;
    thumbnail_url: string;
    display_url: string;
  };
}

export interface GalleryForPublic {
  id: string;
  name: string;
  slug: string;
  items: GalleryItemForRender[];
  style: GalleryDisplayStyle | null;
}

/** Minimal display style info for picker */
export interface GalleryStyleOption {
  id: string;
  name: string;
  layout: string;
}

/** Access info for membership protection check */
export interface GalleryAccessInfo {
  access_level: "public" | "members" | "mag" | null;
  visibility_mode: "hidden" | "message" | null;
  restricted_message: string | null;
  required_mag_ids: string[];
}

/**
 * Resolve published gallery by slug. Returns id, name, slug, styles, and access info.
 * Used for standalone gallery pages.
 */
export async function getPublishedGalleryBySlug(slug: string): Promise<{
  id: string;
  name: string;
  slug: string;
  styles: GalleryStyleOption[];
  first_style_id: string | null;
  access: GalleryAccessInfo;
} | null> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { data: gallery, error } = await supabase
    .schema(schema)
    .from("galleries")
    .select("id, name, slug, access_level, visibility_mode, restricted_message")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !gallery) return null;

  const [stylesResult, magsResult] = await Promise.all([
    supabase
      .schema(schema)
      .from("gallery_display_styles")
      .select("id, name, layout")
      .eq("gallery_id", gallery.id)
      .order("name", { ascending: true }),
    supabase
      .schema(schema)
      .from("gallery_mags")
      .select("mag_id")
      .eq("gallery_id", gallery.id),
  ]);

  const styleList: GalleryStyleOption[] = (stylesResult.data ?? []).map((s: { id: string; name: string | null; layout: string | null }) => ({
    id: s.id,
    name: s.name,
    layout: s.layout,
  }));

  const requiredMagIds = (magsResult.data ?? []).map((r: { mag_id: string }) => r.mag_id);

  const access: GalleryAccessInfo = {
    access_level: (gallery.access_level as GalleryAccessInfo["access_level"]) ?? "public",
    visibility_mode: (gallery.visibility_mode as GalleryAccessInfo["visibility_mode"]) ?? "hidden",
    restricted_message: gallery.restricted_message ?? null,
    required_mag_ids: requiredMagIds,
  };

  return {
    ...gallery,
    styles: styleList,
    first_style_id: styleList.length > 0 ? styleList[0].id : null,
    access,
  };
}

/**
 * Fetch access info for a gallery (for access checks in API routes).
 */
export async function getGalleryAccessInfo(
  galleryId: string
): Promise<GalleryAccessInfo | null> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { data: gallery, error } = await supabase
    .schema(schema)
    .from("galleries")
    .select("access_level, visibility_mode, restricted_message")
    .eq("id", galleryId)
    .eq("status", "published")
    .maybeSingle();

  if (error || !gallery) return null;

  const { data: magRows } = await supabase
    .schema(schema)
    .from("gallery_mags")
    .select("mag_id")
    .eq("gallery_id", galleryId);

  const requiredMagIds = (magRows ?? []).map((r: { mag_id: string }) => r.mag_id);

  return {
    access_level: (gallery.access_level as GalleryAccessInfo["access_level"]) ?? "public",
    visibility_mode: (gallery.visibility_mode as GalleryAccessInfo["visibility_mode"]) ?? "hidden",
    restricted_message: gallery.restricted_message ?? null,
    required_mag_ids: requiredMagIds,
  };
}

/**
 * Fetch gallery with items and display style for public rendering.
 * Uses fallback options when styleId is null or style not found.
 */
export async function getGalleryForPublic(
  galleryId: string,
  styleId: string | null
): Promise<GalleryForPublic | null> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { data: gallery, error: galleryError } = await supabase
    .schema(schema)
    .from("galleries")
    .select("id, name, slug")
    .eq("id", galleryId)
    .eq("status", "published")
    .maybeSingle();

  if (galleryError || !gallery) return null;

  const { data: rows, error: itemsError } = await supabase
    .schema(schema)
    .from("gallery_items")
    .select("id, gallery_id, media_id, position, caption")
    .eq("gallery_id", galleryId)
    .order("position", { ascending: true });

  if (itemsError || !rows?.length) {
    let style: GalleryDisplayStyle | null = null;
    if (styleId) {
      const { data: styleRow } = await supabase
        .schema(schema)
        .from("gallery_display_styles")
        .select("*")
        .eq("id", styleId)
        .maybeSingle();
      style = styleRow as GalleryDisplayStyle | null;
    }
    return {
      ...gallery,
      items: [],
      style,
    };
  }

  const mediaIds = rows.map((r: { media_id: string }) => r.media_id);
  const { data: mediaRows } = await supabase
    .schema(schema)
    .from("media")
    .select("id, media_type, alt_text, video_url, provider, name, created_at")
    .in("id", mediaIds);

  const mediaMap = new Map(
    (mediaRows ?? []).map((m: { id: string }) => [m.id, m])
  );

  const sizeOrder = ["original", "large", "medium", "small", "thumbnail"];
  const { data: variants } = await supabase
    .schema(schema)
    .from("media_variants")
    .select("media_id, url, variant_type")
    .in("media_id", mediaIds)
    .in("variant_type", sizeOrder);

  const urlByMedia = new Map<string, Record<string, string>>();
  for (const v of variants ?? []) {
    if (!urlByMedia.has(v.media_id)) urlByMedia.set(v.media_id, {});
    urlByMedia.get(v.media_id)![v.variant_type] = v.url;
  }

  let style: GalleryDisplayStyle | null = null;
  if (styleId) {
    const { data: styleRow } = await supabase
      .schema(schema)
      .from("gallery_display_styles")
      .select("*")
      .eq("id", styleId)
      .maybeSingle();
    style = styleRow as GalleryDisplayStyle | null;
  }
  const sizePreference = style?.size ?? "medium";
  const sizePriority =
    sizePreference === "original"
      ? ["original", "large", "medium"]
      : sizePreference === "large"
        ? ["large", "original", "medium"]
        : sizePreference === "medium"
          ? ["medium", "large", "original"]
          : sizePreference === "small"
            ? ["small", "medium", "large"]
            : ["thumbnail", "small", "medium"];

  type MediaRow = { id: string; media_type: string; alt_text: string | null; video_url?: string | null; provider?: string | null; name?: string; created_at?: string };
  const items: GalleryItemForRender[] = rows.map(
    (r: { id: string; gallery_id: string; media_id: string; position: number; caption: string | null }) => {
      const media = mediaMap.get(r.media_id) as MediaRow | undefined;
      const urls = urlByMedia.get(r.media_id) ?? {};
      let displayUrl = "";
      let thumbnailUrl = "";
      for (const s of sizePriority) {
        if (urls[s]) {
          displayUrl = urls[s];
          break;
        }
      }
      for (const s of ["thumbnail", "small", "medium", "large", "original"]) {
        if (urls[s]) {
          thumbnailUrl = urls[s];
          break;
        }
      }
      if (!displayUrl && Object.keys(urls).length > 0) {
        displayUrl = Object.values(urls)[0];
      }
      if (!thumbnailUrl) thumbnailUrl = displayUrl;

      return {
        id: r.id,
        media_id: r.media_id,
        position: r.position,
        caption: r.caption,
        media: {
          id: media?.id ?? r.media_id,
          media_type: media?.media_type ?? "image",
          alt_text: media?.alt_text ?? null,
          video_url: media?.video_url ?? null,
          provider: media?.provider ?? null,
          thumbnail_url: thumbnailUrl,
          display_url: displayUrl,
        },
      };
    }
  );

  const sortOrder = style?.sort_order ?? "as_added";
  if (sortOrder !== "as_added" && sortOrder !== "custom") {
    const mediaRow = (id: string) => mediaMap.get(id) as MediaRow | undefined;
    items.sort((a, b) => {
      const ma = mediaRow(a.media_id);
      const mb = mediaRow(b.media_id);
      const nameA = (ma?.name ?? "").toLowerCase();
      const nameB = (mb?.name ?? "").toLowerCase();
      const dateA = ma?.created_at ? new Date(ma.created_at).getTime() : 0;
      const dateB = mb?.created_at ? new Date(mb.created_at).getTime() : 0;
      if (sortOrder === "name_asc") return nameA.localeCompare(nameB);
      if (sortOrder === "name_desc") return nameB.localeCompare(nameA);
      if (sortOrder === "date_newest") return dateB - dateA;
      if (sortOrder === "date_oldest") return dateA - dateB;
      return 0;
    });
  }

  return {
    ...gallery,
    items,
    style,
  };
}
