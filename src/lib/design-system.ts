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

  // Color variables
  vars["--color-primary"] = config.colors.primary;
  vars["--color-secondary"] = config.colors.secondary;
  vars["--color-accent"] = config.colors.accent;
  vars["--color-background"] = config.colors.background;
  vars["--color-background-alt"] = config.colors.backgroundAlt;
  vars["--color-foreground"] = config.colors.foreground;
  vars["--color-foreground-muted"] = config.colors.foregroundMuted;
  vars["--color-border"] = config.colors.border;
  vars["--color-link"] = config.colors.link;
  vars["--color-link-hover"] = config.colors.linkHover;
  vars["--color-success"] = config.colors.success;
  vars["--color-warning"] = config.colors.warning;
  vars["--color-error"] = config.colors.error;
  vars["--color-info"] = config.colors.info;

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
