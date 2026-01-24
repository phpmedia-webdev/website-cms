/**
 * Taxonomy management utilities
 * Handles CRUD operations for taxonomy terms and section configurations
 * Uses RPC functions to bypass PostgREST schema search issues
 */

import { createClientSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/client";
import type { TaxonomyTerm, SectionTaxonomyConfig } from "@/types/taxonomy";

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
