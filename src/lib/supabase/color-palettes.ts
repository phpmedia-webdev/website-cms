/**
 * Color palette management utilities
 * Handles CRUD operations for color palettes (predefined and custom)
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import type { ColorPaletteEntry, ColorPalettePayload } from "@/types/color-palette";
import type { ColorPalette } from "@/types/design-system";

/**
 * Get all color palettes (predefined and custom)
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getAllColorPalettes(): Promise<ColorPaletteEntry[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_color_palettes");

    if (error) {
      console.error("Error fetching color palettes:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    
    return (data as ColorPaletteEntry[]) || [];
  } catch (error) {
    console.error("Error fetching color palettes (catch):", error);
    return [];
  }
}

/**
 * Get predefined color palettes only
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getPredefinedPalettes(): Promise<ColorPaletteEntry[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_predefined_color_palettes");

    if (error) throw error;
    return (data as ColorPaletteEntry[]) || [];
  } catch (error) {
    console.error("Error fetching predefined palettes:", error);
    return [];
  }
}

/**
 * Get custom (user-created) color palettes only
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getCustomPalettes(): Promise<ColorPaletteEntry[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_custom_color_palettes");

    if (error) throw error;
    return (data as ColorPaletteEntry[]) || [];
  } catch (error) {
    console.error("Error fetching custom palettes:", error);
    return [];
  }
}

/**
 * Get a single color palette by ID
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getColorPalette(id: string): Promise<ColorPaletteEntry | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_color_palette_by_id", {
      palette_id: id,
    });

    if (error) throw error;
    // RPC returns an array, get first item
    return (data && data.length > 0) ? (data[0] as ColorPaletteEntry) : null;
  } catch (error) {
    console.error("Error fetching color palette:", error);
    return null;
  }
}

/**
 * Create a new custom color palette
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function createColorPalette(
  payload: ColorPalettePayload
): Promise<ColorPaletteEntry | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("create_color_palette", {
      palette_name: payload.name,
      palette_description: payload.description || null,
      palette_colors: payload.colors,
      palette_tags: payload.tags || [],
    });

    if (error) {
      console.error("Error creating color palette:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    
    // RPC returns an array, get first item
    return (data && data.length > 0) ? (data[0] as ColorPaletteEntry) : null;
  } catch (error) {
    console.error("Error creating color palette (catch):", error);
    return null;
  }
}

/**
 * Update an existing color palette (custom palettes only)
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function updateColorPalette(
  id: string,
  payload: Partial<ColorPalettePayload>
): Promise<ColorPaletteEntry | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("update_color_palette", {
      palette_id: id,
      palette_name: payload.name || null,
      palette_description: payload.description !== undefined ? (payload.description || null) : null,
      palette_colors: payload.colors || null,
      palette_tags: payload.tags || null,
    });

    if (error) {
      console.error("Error updating color palette:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    
    // RPC returns an array, get first item
    return (data && data.length > 0) ? (data[0] as ColorPaletteEntry) : null;
  } catch (error) {
    console.error("Error updating color palette (catch):", error);
    return null;
  }
}

/**
 * Delete a color palette (custom palettes only)
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function deleteColorPalette(id: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("delete_color_palette", {
      palette_id: id,
    });

    if (error) {
      console.error("Error deleting color palette:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    
    return data === true;
  } catch (error) {
    console.error("Error deleting color palette (catch):", error);
    return false;
  }
}

/**
 * Search color palettes by name or tags
 * Uses getAllColorPalettes and filters client-side (RPC functions don't support complex WHERE clauses easily)
 */
export async function searchColorPalettes(query: string): Promise<ColorPaletteEntry[]> {
  try {
    // Get all palettes and filter client-side
    const allPalettes = await getAllColorPalettes();
    const searchLower = query.toLowerCase();
    
    return allPalettes.filter(
      (palette) =>
        palette.name.toLowerCase().includes(searchLower) ||
        (palette.description?.toLowerCase().includes(searchLower) ?? false) ||
        palette.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  } catch (error) {
    console.error("Error searching color palettes:", error);
    return [];
  }
}
