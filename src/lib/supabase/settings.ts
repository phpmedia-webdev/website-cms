/**
 * Settings utility functions for managing design system and site settings
 * Settings are stored in the settings table with key-value pairs (JSONB values)
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import type {
  DesignSystemConfig,
  DesignSystemSettings,
  FontConfig,
  ColorPalette,
  ColorLabels,
  SiteMetadata,
} from "@/types/design-system";
import { DEFAULT_DESIGN_SYSTEM as defaultConfig } from "@/types/design-system";

/**
 * Migration helper: Convert old color schema (primary/secondary/alternate1-6) to new (color01-color15)
 * This ensures backward compatibility during migration
 */
function migrateColorPalette(oldColors: any): ColorPalette {
  // If already in new format (has color01), return as-is
  if (oldColors && oldColors.color01) {
    return oldColors as ColorPalette;
  }

  // Migrate from old format to new format
  return {
    color01: oldColors?.primary || defaultConfig.colors.color01,
    color02: oldColors?.secondary || defaultConfig.colors.color02,
    color03: oldColors?.accent || defaultConfig.colors.color03,
    color04: oldColors?.background || defaultConfig.colors.color04,
    color05: oldColors?.backgroundAlt || defaultConfig.colors.color05,
    color06: oldColors?.foreground || defaultConfig.colors.color06,
    color07: oldColors?.foregroundMuted || defaultConfig.colors.color07,
    color08: oldColors?.border || defaultConfig.colors.color08,
    color09: oldColors?.link || defaultConfig.colors.color09,
    color10: oldColors?.alternate1 || defaultConfig.colors.color10,
    color11: oldColors?.alternate2 || defaultConfig.colors.color11,
    color12: oldColors?.alternate3 || defaultConfig.colors.color12,
    color13: oldColors?.alternate4 || defaultConfig.colors.color13,
    color14: oldColors?.alternate5 || defaultConfig.colors.color14,
    color15: oldColors?.alternate6 || defaultConfig.colors.color15,
  };
}

/**
 * Get a single setting by key
 */
export async function getSetting<T = unknown>(
  key: string
): Promise<T | null> {
  try {
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    // Note: PostgREST has issues querying custom schemas directly
    // Use RPC function in public schema to query the custom schema (bypasses PostgREST schema search)
    const { data, error } = await supabase.rpc("get_setting", {
      setting_key: key,
    });

    if (error) {
      // Log detailed error information
      console.error(`Error fetching setting ${key}:`, {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        schema,
      });
      return null;
    }

    // RPC returns the value directly (not wrapped in an object)
    return (data as T) || null;
  } catch (error: any) {
    console.error(`Error fetching setting ${key} (catch):`, {
      error,
      message: error?.message,
      stack: error?.stack,
    });
    return null;
  }
}

/**
 * Set/update a single setting by key
 */
export async function setSetting(
  key: string,
  value: unknown
): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    // Note: PostgREST has issues querying custom schemas directly
    // Use RPC function in public schema to update the custom schema (bypasses PostgREST schema search)
    const { error } = await supabase.rpc("set_setting", {
      setting_key: key,
      setting_value: value as any,
    });

    if (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    return false;
  }
}

/**
 * Get multiple settings by keys
 */
export async function getSettings(
  keys: string[]
): Promise<Record<string, unknown>> {
  try {
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    // If no keys requested, return empty object
    if (keys.length === 0) {
      return {};
    }

    // Note: PostgREST has issues querying custom schemas directly
    // Use RPC function in public schema to query the custom schema (bypasses PostgREST schema search)
    const { data, error } = await supabase.rpc("get_settings", {
      keys: keys,
    });

    if (error) {
      // Log error details for debugging
      const errorDetails = {
        message: error?.message || "Unknown error",
        details: error?.details || null,
        hint: error?.hint || null,
        code: error?.code || null,
        schema,
        keys,
        errorString: String(error),
        errorKeys: error ? Object.keys(error) : [],
      };
      console.error("Error fetching settings:", errorDetails);
      // Return empty object on error - defaults will be used
      return {};
    }

    const result: Record<string, unknown> = {};
    data?.forEach((item) => {
      result[item.key] = item.value;
    });

    return result;
  } catch (error: any) {
    console.error("Error fetching settings (catch block):", {
      error,
      message: error?.message,
      stack: error?.stack,
    });
    // Return empty object on error - defaults will be used
    return {};
  }
}

/**
 * Get the complete design system configuration
 * Returns default values if settings don't exist or query fails
 */
export async function getDesignSystemConfig(): Promise<DesignSystemConfig> {
  try {
    const keys = [
      "design_system.theme",
      "design_system.fonts.primary",
      "design_system.fonts.secondary",
      "design_system.colors",
      "design_system.colorLabels",
    ];

    const settings = await getSettings(keys);

    // Parse settings with defaults
    const theme =
      (settings["design_system.theme"] as string) || defaultConfig.theme;

    const primaryFont =
      (settings["design_system.fonts.primary"] as FontConfig) ||
      defaultConfig.fonts.primary;

    const secondaryFont =
      (settings["design_system.fonts.secondary"] as FontConfig) ||
      defaultConfig.fonts.secondary;

    const colorsFromDb = settings["design_system.colors"] as any;

    // Migrate colors from old schema to new schema if needed
    const colors: ColorPalette = colorsFromDb
      ? migrateColorPalette(colorsFromDb)
      : defaultConfig.colors;

    // Get color labels (optional - defaults provided if missing)
    const colorLabelsFromDb =
      (settings["design_system.colorLabels"] as ColorLabels) || null;
    const colorLabels: ColorLabels = colorLabelsFromDb || defaultConfig.colorLabels || {};

    return {
      theme,
      fonts: {
        primary: primaryFont,
        secondary: secondaryFont,
      },
      colors,
      colorLabels,
    };
  } catch (error: any) {
    console.error("Error in getDesignSystemConfig, using defaults:", error);
    // Return defaults if anything fails
    return defaultConfig;
  }
}

/**
 * Update the design system configuration
 */
export async function updateDesignSystemConfig(
  config: Partial<DesignSystemConfig>
): Promise<boolean> {
  try {
    const updates: Promise<boolean>[] = [];

    if (config.theme !== undefined) {
      updates.push(setSetting("design_system.theme", config.theme));
    }

    if (config.fonts?.primary) {
      updates.push(
        setSetting("design_system.fonts.primary", config.fonts.primary)
      );
    }

    if (config.fonts?.secondary) {
      updates.push(
        setSetting("design_system.fonts.secondary", config.fonts.secondary)
      );
    }

    if (config.colors) {
      // Ensure colors are in new format (color01-color15)
      const migratedColors = migrateColorPalette(config.colors);
      updates.push(setSetting("design_system.colors", migratedColors));
    }

    if (config.colorLabels !== undefined) {
      updates.push(setSetting("design_system.colorLabels", config.colorLabels));
    }

    const results = await Promise.all(updates);
    return results.every((result) => result === true);
  } catch (error) {
    console.error("Error updating design system config:", error);
    return false;
  }
}

/**
 * Get site metadata
 */
export async function getSiteMetadata(): Promise<SiteMetadata> {
  const keys = ["site.name", "site.description"];
  const settings = await getSettings(keys);

  return {
    name: (settings["site.name"] as string) || "Website CMS",
    description: (settings["site.description"] as string) || "",
  };
}

/**
 * Update site metadata
 */
export async function updateSiteMetadata(
  metadata: Partial<SiteMetadata>
): Promise<boolean> {
  try {
    const updates: Promise<boolean>[] = [];

    if (metadata.name !== undefined) {
      updates.push(setSetting("site.name", metadata.name));
    }

    if (metadata.description !== undefined) {
      updates.push(setSetting("site.description", metadata.description));
    }

    const results = await Promise.all(updates);
    return results.every((result) => result === true);
  } catch (error) {
    console.error("Error updating site metadata:", error);
    return false;
  }
}
