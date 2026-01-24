/**
 * Design system utility functions
 * Handles loading design system settings and converting them to CSS variables
 */

import { getDesignSystemConfig } from "@/lib/supabase/settings";
import type { DesignSystemConfig, FontConfig } from "@/types/design-system";

/**
 * Convert design system config to CSS custom properties (CSS variables)
 * Returns an object with CSS variable names and values
 */
export function designSystemToCSSVariables(
  config: DesignSystemConfig
): Record<string, string> {
  const vars: Record<string, string> = {};

  // Font variables
  vars["--font-primary"] = `"${config.fonts.primary.family}", sans-serif`;
  vars["--font-secondary"] = `"${config.fonts.secondary.family}", sans-serif`;

  // Color variables (15) - using color01-color15 keys
  vars["--color-01"] = config.colors.color01;
  vars["--color-02"] = config.colors.color02;
  vars["--color-03"] = config.colors.color03;
  vars["--color-04"] = config.colors.color04;
  vars["--color-05"] = config.colors.color05;
  vars["--color-06"] = config.colors.color06;
  vars["--color-07"] = config.colors.color07;
  vars["--color-08"] = config.colors.color08;
  vars["--color-09"] = config.colors.color09;
  vars["--color-10"] = config.colors.color10;
  vars["--color-11"] = config.colors.color11;
  vars["--color-12"] = config.colors.color12;
  vars["--color-13"] = config.colors.color13;
  vars["--color-14"] = config.colors.color14;
  vars["--color-15"] = config.colors.color15;

  // Generate CSS variables from user-defined labels (if available)
  // Example: if color01 has label "Primary", creates --color-primary
  if (config.colorLabels) {
    Object.entries(config.colorLabels).forEach(([colorKey, label]) => {
      if (label) {
        // Sanitize label for CSS variable name (lowercase, replace spaces with hyphens)
        const sanitizedLabel = label
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        const colorValue = config.colors[colorKey as keyof typeof config.colors];
        if (colorValue && sanitizedLabel) {
          vars[`--color-${sanitizedLabel}`] = colorValue;
        }
      }
    });
  }

  return vars;
}

/**
 * Generate Google Fonts URL for the design system fonts
 * Returns the URL to include in the <head> section
 */
export function generateGoogleFontsURL(config: DesignSystemConfig): string {
  const fonts: string[] = [];
  const weights = new Set<number>();

  // Add primary font
  if (config.fonts.primary.source === "google") {
    const primaryWeights = config.fonts.primary.weights.join(",");
    fonts.push(`${config.fonts.primary.family}:wght@${primaryWeights}`);
    config.fonts.primary.weights.forEach((w) => weights.add(w));
  }

  // Add secondary font (if different from primary)
  if (
    config.fonts.secondary.source === "google" &&
    config.fonts.secondary.family !== config.fonts.primary.family
  ) {
    const secondaryWeights = config.fonts.secondary.weights.join(",");
    fonts.push(`${config.fonts.secondary.family}:wght@${secondaryWeights}`);
    config.fonts.secondary.weights.forEach((w) => weights.add(w));
  }

  if (fonts.length === 0) {
    return "";
  }

  // Build Google Fonts URL
  const fontString = fonts.join("&family=");
  return `https://fonts.googleapis.com/css2?family=${fontString}&display=swap`;
}

/**
 * Load design system configuration and convert to CSS variables
 * This is the main function to use in server components
 * Returns defaults if database query fails
 */
export async function loadDesignSystem(): Promise<{
  cssVariables: Record<string, string>;
  googleFontsURL: string;
  config: DesignSystemConfig;
}> {
  try {
    const config = await getDesignSystemConfig();
    const cssVariables = designSystemToCSSVariables(config);
    const googleFontsURL = generateGoogleFontsURL(config);

    return {
      cssVariables,
      googleFontsURL,
      config,
    };
  } catch (error: any) {
    console.error("Error loading design system, using defaults:", error);
    // Return defaults if database query fails
    const defaultConfig = (await import("@/types/design-system")).DEFAULT_DESIGN_SYSTEM;
    const cssVariables = designSystemToCSSVariables(defaultConfig);
    const googleFontsURL = generateGoogleFontsURL(defaultConfig);

    return {
      cssVariables,
      googleFontsURL,
      config: defaultConfig,
    };
  }
}
