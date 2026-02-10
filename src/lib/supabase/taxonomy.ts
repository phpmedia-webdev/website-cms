/**
 * Taxonomy management utilities
 * Handles CRUD operations for taxonomy terms and section configurations
 * Uses RPC functions to bypass PostgREST schema search issues
 */

import { createClientSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/client";
import type { TaxonomyTerm, SectionTaxonomyConfig } from "@/types/taxonomy";

export type MediaViewMode = "images" | "videos" | "all";

function termsForSection(
  allTerms: TaxonomyTerm[],
  configs: SectionTaxonomyConfig[],
  sectionName: string
): { categories: TaxonomyTerm[]; tags: TaxonomyTerm[] } {
  const config = configs.find((c) => c.section_name === sectionName);
  const categories = allTerms.filter((t) => t.type === "category");
  const tags = allTerms.filter((t) => t.type === "tag");

  const filterBySlugs = (terms: TaxonomyTerm[], slugs: string[] | null) => {
    if (slugs == null) return terms;
    if (slugs.length === 0) return [];
    const set = new Set(slugs);
    return terms.filter((t) => set.has(t.slug));
  };

  const filterBySuggested = (terms: TaxonomyTerm[], section: string) => {
    return terms.filter(
      (t) =>
        Array.isArray(t.suggested_sections) &&
        t.suggested_sections.some((s) => s?.toLowerCase() === section.toLowerCase())
    );
  };

  if (!config) {
    return { categories, tags };
  }

  const catSlugs = config.category_slugs;
  const tagSlugs = config.tag_slugs;
  const cats =
    catSlugs == null ? filterBySuggested(categories, sectionName) : filterBySlugs(categories, catSlugs);
  const tgs =
    tagSlugs == null ? filterBySuggested(tags, sectionName) : filterBySlugs(tags, tagSlugs);
  return { categories: cats, tags: tgs };
}

/**
 * Section names for media (must match Section Manager: "image", "video").
 * View mode "images" | "videos" maps to section "image" | "video".
 */
export const MEDIA_SECTION_IMAGE = "image";
export const MEDIA_SECTION_VIDEO = "video";

async function addMagTagSlugToSections(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  schema: string,
  slug: string
): Promise<void> {
  const { data: configs } = await supabase
    .schema(schema)
    .from("section_taxonomy_config")
    .select("id, tag_slugs")
    .in("section_name", ["image", "video", "membership"]);

  for (const row of configs || []) {
    const arr = Array.isArray(row.tag_slugs) ? row.tag_slugs : [];
    if (arr.includes(slug)) continue;
    const next = [...arr, slug];
    await supabase
      .schema(schema)
      .from("section_taxonomy_config")
      .update({ tag_slugs: next })
      .eq("id", row.id);
  }
}

/**
 * Ensure a mag-tag exists in taxonomy for a MAG.
 * Called when creating or updating a MAG (when uid changes).
 * Creates tag with slug `mag-{uid}`, adds to image, video, and membership sections.
 * Idempotent: if tag already exists, ensures it's in sections and returns.
 */
export async function ensureMagTagExists(
  magUid: string,
  magName: string
): Promise<{ termId: string | null; created: boolean; error: string | null }> {
  if (!magUid?.trim()) return { termId: null, created: false, error: "UID is required" };
  const slug = `mag-${magUid.trim().toLowerCase()}`;
  const supabase = createServerSupabaseClient();
  const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

  try {
    const { data: existing } = await supabase
      .schema(schema)
      .from("taxonomy_terms")
      .select("id")
      .eq("type", "tag")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await addMagTagSlugToSections(supabase, schema, slug);
      return { termId: existing.id, created: false, error: null };
    }

    const termData = {
      name: `MAG: ${magName || magUid}`,
      slug,
      type: "tag" as const,
      parent_id: null,
      description: null,
      suggested_sections: ["image", "video", "membership"],
    };

    const { data: inserted, error: insertErr } = await supabase
      .schema(schema)
      .from("taxonomy_terms")
      .insert(termData)
      .select("id")
      .single();

    if (insertErr) {
      console.error("ensureMagTagExists insert:", insertErr);
      return { termId: null, created: false, error: insertErr.message };
    }

    await addMagTagSlugToSections(supabase, schema, slug);

    return { termId: inserted.id, created: true, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ensureMagTagExists:", msg);
    return { termId: null, created: false, error: msg };
  }
}

/**
 * Map media_type to taxonomy section name.
 * Used when assigning taxonomy to a media item.
 */
export function getMediaSectionForType(
  mediaType: "image" | "video"
): typeof MEDIA_SECTION_IMAGE | typeof MEDIA_SECTION_VIDEO {
  return mediaType === "video" ? MEDIA_SECTION_VIDEO : MEDIA_SECTION_IMAGE;
}

/**
 * Derive categories and tags for media library view mode.
 * Uses sections "image" and "video"; "all" = union (deduped).
 */
export function getTermsForMediaViewMode(
  allTerms: TaxonomyTerm[],
  configs: SectionTaxonomyConfig[],
  viewMode: MediaViewMode
): { categories: TaxonomyTerm[]; tags: TaxonomyTerm[] } {
  if (viewMode === "images") {
    return termsForSection(allTerms, configs, MEDIA_SECTION_IMAGE);
  }
  if (viewMode === "videos") {
    return termsForSection(allTerms, configs, MEDIA_SECTION_VIDEO);
  }
  const img = termsForSection(allTerms, configs, MEDIA_SECTION_IMAGE);
  const vid = termsForSection(allTerms, configs, MEDIA_SECTION_VIDEO);
  const byId = new Map<string, TaxonomyTerm>();
  [...img.categories, ...vid.categories].forEach((t) => byId.set(t.id, t));
  [...img.tags, ...vid.tags].forEach((t) => byId.set(t.id, t));
  return {
    categories: Array.from(byId.values()).filter((t) => t.type === "category"),
    tags: Array.from(byId.values()).filter((t) => t.type === "tag"),
  };
}

/**
 * Get categories and tags for a single media section (e.g. when assigning taxonomy to one item).
 */
export function getTermsForMediaSection(
  allTerms: TaxonomyTerm[],
  configs: SectionTaxonomyConfig[],
  sectionName: "image" | "video"
): { categories: TaxonomyTerm[]; tags: TaxonomyTerm[] } {
  return termsForSection(allTerms, configs, sectionName);
}

/**
 * Get categories and tags for a content-type section (section = content_types.slug).
 * Use when assigning taxonomy to content items (post, page, portfolio, etc.).
 */
export function getTermsForContentSection(
  allTerms: TaxonomyTerm[],
  configs: SectionTaxonomyConfig[],
  sectionName: string
): { categories: TaxonomyTerm[]; tags: TaxonomyTerm[] } {
  return termsForSection(allTerms, configs, sectionName);
}

/**
 * Get all taxonomy terms
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getAllTaxonomyTerms(): Promise<TaxonomyTerm[]> {
  try {
    const supabase = createServerSupabaseClient();
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
    const { data, error } = await supabase.rpc("get_taxonomy_terms_dynamic", {
      schema_name: schema,
    });

    if (error) {
      console.error("Error fetching taxonomy terms:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    
    return (data as TaxonomyTerm[]) || [];
  } catch (error) {
    console.error("Error fetching taxonomy terms (catch):", error);
    return [];
  }
}

/**
 * Get all section taxonomy configurations
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getSectionTaxonomyConfigs(): Promise<SectionTaxonomyConfig[]> {
  try {
    const supabase = createServerSupabaseClient();
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
    const { data, error } = await supabase.rpc("get_section_taxonomy_configs_dynamic", {
      schema_name: schema,
    });

    if (error) {
      console.error("Error fetching section configs:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    
    return (data as SectionTaxonomyConfig[]) || [];
  } catch (error) {
    console.error("Error fetching section configs (catch):", error);
    return [];
  }
}

/**
 * Client-side function to get taxonomy terms
 * Tries RPC functions first, falls back to direct query
 */
export async function getTaxonomyTermsClient(): Promise<TaxonomyTerm[]> {
  try {
    const supabase = createClientSupabaseClient();
    
    // Try dynamic RPC first (use client schema)
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_taxonomy_terms_dynamic", {
        schema_name: schema,
      });
      if (!rpcError && rpcData) {
        return rpcData as TaxonomyTerm[];
      }
      if (rpcError) {
        console.warn("Dynamic RPC failed, trying direct query:", rpcError.message || rpcError);
      }
    } catch (rpcErr) {
      console.warn("RPC call failed, trying direct query:", rpcErr);
    }
    
    // Try schema-specific RPC (if exists, for backward compatibility)
    try {
      const { data: rpcData2, error: rpcError2 } = await supabase.rpc("get_taxonomy_terms");
      if (!rpcError2 && rpcData2) {
        return rpcData2 as TaxonomyTerm[];
      }
    } catch (rpcErr2) {
      // Function doesn't exist, continue to direct query
    }
    
    // Direct query from client schema (tables are in client schema, not public)
    // Reuse schema variable declared above
    const { data, error } = await supabase
      .schema(schema)
      .from("taxonomy_terms")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Direct query error:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    return (data as TaxonomyTerm[]) || [];
  } catch (error) {
    console.error("Error fetching taxonomy terms (client):", error);
    const errorDetails = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null
      ? JSON.stringify(error, Object.getOwnPropertyNames(error))
      : String(error);
    console.error("Full error details:", errorDetails);
    throw error; // Re-throw so component can handle it
  }
}

/**
 * Fetch taxonomy relationships for media items (content_type = 'media').
 * Returns { content_id, term_id }[] for filtering media by categories/tags.
 */
export async function getMediaTaxonomyRelationships(
  mediaIds: string[]
): Promise<{ content_id: string; term_id: string }[]> {
  if (mediaIds.length === 0) return [];
  try {
    const supabase = createClientSupabaseClient();
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
    const { data, error } = await supabase
      .schema(schema)
      .from("taxonomy_relationships")
      .select("content_id, term_id")
      .eq("content_type", "media")
      .in("content_id", mediaIds);

    if (error) throw error;
    return (data as { content_id: string; term_id: string }[]) || [];
  } catch (e) {
    console.error("getMediaTaxonomyRelationships:", e);
    return [];
  }
}

/**
 * Get taxonomy term IDs assigned to a single media item.
 */
export async function getTaxonomyForMedia(
  mediaId: string
): Promise<{ categoryIds: string[]; tagIds: string[] }> {
  const rels = await getMediaTaxonomyRelationships([mediaId]);
  if (rels.length === 0)
    return { categoryIds: [], tagIds: [] };

  const supabase = createClientSupabaseClient();
  const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
  const termIds = [...new Set(rels.map((r) => r.term_id))];
  const { data: terms, error } = await supabase
    .schema(schema)
    .from("taxonomy_terms")
    .select("id, type")
    .in("id", termIds);

  if (error) {
    console.error("getTaxonomyForMedia:", error);
    return { categoryIds: [], tagIds: [] };
  }

  const categoryIds = (terms || []).filter((t) => t.type === "category").map((t) => t.id);
  const tagIds = (terms || []).filter((t) => t.type === "tag").map((t) => t.id);
  return { categoryIds, tagIds };
}

/**
 * Set taxonomy for a media item. Replaces existing assignments.
 * termIds: all selected term IDs (categories + tags).
 */
export async function setTaxonomyForMedia(
  mediaId: string,
  termIds: string[]
): Promise<void> {
  const supabase = createClientSupabaseClient();
  const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

  const { error: delErr } = await supabase
    .schema(schema)
    .from("taxonomy_relationships")
    .delete()
    .eq("content_type", "media")
    .eq("content_id", mediaId);

  if (delErr) {
    console.error("setTaxonomyForMedia delete:", delErr);
    throw delErr;
  }

  if (termIds.length === 0) return;

  const rows = termIds.map((term_id) => ({
    term_id,
    content_type: "media" as const,
    content_id: mediaId,
  }));

  const { error: insErr } = await supabase
    .schema(schema)
    .from("taxonomy_relationships")
    .insert(rows);

  if (insErr) {
    console.error("setTaxonomyForMedia insert:", insErr);
    throw insErr;
  }
}

/**
 * Fetch taxonomy relationships for content items (unified content model).
 * content_type = content_types.slug (post, page, portfolio, etc.).
 * Returns { content_id, content_type, term_id }[] for filtering or resolving categories/tags.
 */
export async function getContentTaxonomyRelationships(
  contentIds: string[]
): Promise<{ content_id: string; content_type: string; term_id: string }[]> {
  if (contentIds.length === 0) return [];
  try {
    const supabase = createClientSupabaseClient();
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
    const { data, error } = await supabase
      .schema(schema)
      .from("taxonomy_relationships")
      .select("content_id, content_type, term_id")
      .in("content_id", contentIds);

    if (error) throw error;
    return (data as { content_id: string; content_type: string; term_id: string }[]) || [];
  } catch (e) {
    if (process.env.NODE_ENV === "development" && e != null && typeof e === "object" && ("message" in e || "stack" in e))
      console.warn("getContentTaxonomyRelationships:", e);
    return [];
  }
}

/**
 * Get taxonomy term IDs assigned to a single content item.
 * content_type = content_types.slug (e.g. post, page, portfolio).
 */
export async function getTaxonomyForContent(
  contentId: string,
  contentTypeSlug: string
): Promise<{ categoryIds: string[]; tagIds: string[] }> {
  try {
    const supabase = createClientSupabaseClient();
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
    const { data: rels, error: relErr } = await supabase
      .schema(schema)
      .from("taxonomy_relationships")
      .select("term_id")
      .eq("content_type", contentTypeSlug)
      .eq("content_id", contentId);

    if (relErr) {
      console.error("getTaxonomyForContent relationships:", relErr);
      return { categoryIds: [], tagIds: [] };
    }
    const termIds = [...new Set((rels || []).map((r) => r.term_id))];
    if (termIds.length === 0) return { categoryIds: [], tagIds: [] };

    const { data: terms, error: termErr } = await supabase
      .schema(schema)
      .from("taxonomy_terms")
      .select("id, type")
      .in("id", termIds);

    if (termErr) {
      console.error("getTaxonomyForContent terms:", termErr);
      return { categoryIds: [], tagIds: [] };
    }

    const categoryIds = (terms || []).filter((t) => t.type === "category").map((t) => t.id);
    const tagIds = (terms || []).filter((t) => t.type === "tag").map((t) => t.id);
    return { categoryIds, tagIds };
  } catch (e) {
    console.error("getTaxonomyForContent:", e);
    return { categoryIds: [], tagIds: [] };
  }
}

/**
 * Set taxonomy for a content item. Replaces existing assignments.
 * content_type = content_types.slug (e.g. post, page, portfolio).
 * termIds: all selected term IDs (categories + tags).
 */
export async function setTaxonomyForContent(
  contentId: string,
  contentTypeSlug: string,
  termIds: string[]
): Promise<void> {
  const supabase = createClientSupabaseClient();
  const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

  const { error: delErr } = await supabase
    .schema(schema)
    .from("taxonomy_relationships")
    .delete()
    .eq("content_type", contentTypeSlug)
    .eq("content_id", contentId);

  if (delErr) {
    console.error("setTaxonomyForContent delete:", delErr);
    throw delErr;
  }

  if (termIds.length === 0) return;

  const rows = termIds.map((term_id) => ({
    term_id,
    content_type: contentTypeSlug,
    content_id: contentId,
  }));

  const { error: insErr } = await supabase
    .schema(schema)
    .from("taxonomy_relationships")
    .insert(rows);

  if (insErr) {
    console.error("setTaxonomyForContent insert:", insErr);
    throw insErr;
  }
}

/**
 * Client-side function to get section configs
 * Tries RPC functions first, falls back to direct query
 */
export async function getSectionConfigsClient(): Promise<SectionTaxonomyConfig[]> {
  try {
    const supabase = createClientSupabaseClient();
    
    // Try dynamic RPC first (use client schema)
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_section_taxonomy_configs_dynamic", {
        schema_name: schema,
      });
      if (!rpcError && rpcData) {
        return rpcData as SectionTaxonomyConfig[];
      }
      if (rpcError) {
        console.warn("Dynamic RPC failed, trying direct query:", rpcError.message || rpcError);
      }
    } catch (rpcErr) {
      console.warn("RPC call failed, trying direct query:", rpcErr);
    }
    
    // Try schema-specific RPC (if exists, for backward compatibility)
    try {
      const { data: rpcData2, error: rpcError2 } = await supabase.rpc("get_section_taxonomy_configs");
      if (!rpcError2 && rpcData2) {
        return rpcData2 as SectionTaxonomyConfig[];
      }
    } catch (rpcErr2) {
      // Function doesn't exist, continue to direct query
    }
    
    // Direct query from client schema (tables are in client schema, not public)
    // Reuse schema variable declared above
    const { data, error } = await supabase
      .schema(schema)
      .from("section_taxonomy_config")
      .select("*")
      .order("display_name", { ascending: true });

    if (error) {
      console.error("Direct query error:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    return (data as SectionTaxonomyConfig[]) || [];
  } catch (error) {
    console.error("Error fetching section configs (client):", error);
    const errorDetails = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null
      ? JSON.stringify(error, Object.getOwnPropertyNames(error))
      : String(error);
    console.error("Full error details:", errorDetails);
    throw error; // Re-throw so component can handle it
  }
}
