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
 * Derive categories and tags for media library view mode.
 * Images/videos sections; "all" = union (deduped).
 */
export function getTermsForMediaViewMode(
  allTerms: TaxonomyTerm[],
  configs: SectionTaxonomyConfig[],
  viewMode: MediaViewMode
): { categories: TaxonomyTerm[]; tags: TaxonomyTerm[] } {
  if (viewMode === "images") {
    return termsForSection(allTerms, configs, "images");
  }
  if (viewMode === "videos") {
    return termsForSection(allTerms, configs, "videos");
  }
  const img = termsForSection(allTerms, configs, "images");
  const vid = termsForSection(allTerms, configs, "videos");
  const byId = new Map<string, TaxonomyTerm>();
  [...img.categories, ...vid.categories].forEach((t) => byId.set(t.id, t));
  [...img.tags, ...vid.tags].forEach((t) => byId.set(t.id, t));
  return {
    categories: Array.from(byId.values()).filter((t) => t.type === "category"),
    tags: Array.from(byId.values()).filter((t) => t.type === "tag"),
  };
}

/**
 * Get all taxonomy terms
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getAllTaxonomyTerms(): Promise<TaxonomyTerm[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_taxonomy_terms");

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
    const { data, error } = await supabase.rpc("get_section_taxonomy_configs");

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
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "public";
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
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "public";
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
 * Client-side function to get section configs
 * Tries RPC functions first, falls back to direct query
 */
export async function getSectionConfigsClient(): Promise<SectionTaxonomyConfig[]> {
  try {
    const supabase = createClientSupabaseClient();
    
    // Try dynamic RPC first (use client schema)
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "public";
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
