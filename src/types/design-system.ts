/**
 * TypeScript types for the design system settings
 * These types define the structure of design system configuration stored in the settings table
 */

/**
 * Font configuration
 */
export interface FontConfig {
  family: string; // Font family name (e.g., "Inter", "Roboto", "Open Sans")
  source: "google" | "system" | "custom"; // Font source
  weights: number[]; // Available font weights (e.g., [400, 500, 600, 700])
  url?: string; // Custom font URL (if source is "custom")
}

/**
 * Color palette configuration
 * 15 colors total, stored as color01-color15
 * Users can customize labels for each color (e.g., "Primary", "Hover", "Accent")
 */
export interface ColorPalette {
  color01: string; // Color 1 (hex)
  color02: string; // Color 2 (hex)
  color03: string; // Color 3 (hex)
  color04: string; // Color 4 (hex)
  color05: string; // Color 5 (hex)
  color06: string; // Color 6 (hex)
  color07: string; // Color 7 (hex)
  color08: string; // Color 8 (hex)
  color09: string; // Color 9 (hex)
  color10: string; // Color 10 (hex)
  color11: string; // Color 11 (hex)
  color12: string; // Color 12 (hex)
  color13: string; // Color 13 (hex)
  color14: string; // Color 14 (hex)
  color15: string; // Color 15 (hex)
}

/**
 * Color labels configuration
 * Maps color keys (color01-color15) to user-defined labels
 * Example: { color01: "Primary", color02: "Hover", color03: "Accent" }
 */
export interface ColorLabels {
  color01?: string;
  color02?: string;
  color03?: string;
  color04?: string;
  color05?: string;
  color06?: string;
  color07?: string;
  color08?: string;
  color09?: string;
  color10?: string;
  color11?: string;
  color12?: string;
  color13?: string;
  color14?: string;
  color15?: string;
}

/**
 * Design system configuration structure
 */
export interface DesignSystemConfig {
  theme: string; // Active theme name (e.g., "default", "modern", "classic")
  fonts: {
    primary: FontConfig;
    secondary: FontConfig;
  };
  colors: ColorPalette;
  colorLabels?: ColorLabels; // Optional user-defined labels for colors
}

/**
 * Site metadata (stored alongside design system)
 */
export interface SiteMetadata {
  name: string;
  description: string;
  /** Site domain/URL for links (e.g. https://example.com). WordPress-style. */
  url?: string;
}

/**
 * Complete settings structure (as stored in database)
 */
export interface DesignSystemSettings {
  "design_system.theme": string;
  "design_system.fonts.primary": FontConfig;
  "design_system.fonts.secondary": FontConfig;
  "design_system.colors": ColorPalette;
  "design_system.colorLabels"?: ColorLabels; // Optional user-defined color labels
  "site.name": string;
  "site.description": string;
  "site.url"?: string;
}

/**
 * Default design system values
 */
export const DEFAULT_DESIGN_SYSTEM: DesignSystemConfig = {
  theme: "default",
  fonts: {
    primary: {
      family: "Inter",
      source: "google",
      weights: [400, 500, 600, 700],
    },
    secondary: {
      family: "Inter",
      source: "google",
      weights: [400, 500, 600],
    },
  },
  colors: {
    // 15 colors using color01-color15 keys
    // Default mapping from old schema: primary→color01, secondary→color02, etc.
    color01: "#3b82f6", // Primary (was: primary)
    color02: "#8b5cf6", // Secondary (was: secondary)
    color03: "#06b6d4", // Accent (was: accent)
    color04: "#ffffff", // Background (was: background)
    color05: "#f9fafb", // Background Alt (was: backgroundAlt)
    color06: "#111827", // Foreground (was: foreground)
    color07: "#6b7280", // Foreground Muted (was: foregroundMuted)
    color08: "#e5e7eb", // Border (was: border)
    color09: "#3b82f6", // Link (was: link)
    color10: "#10b981", // Success/Green (was: alternate1)
    color11: "#f59e0b", // Warning/Orange (was: alternate2)
    color12: "#ef4444", // Error/Red (was: alternate3)
    color13: "#3b82f6", // Info/Blue (was: alternate4)
    color14: "#2563eb", // Link Hover/Dark Blue (was: alternate5)
    color15: "#8b5a2b", // Custom/Brown (was: alternate6)
  },
  // Default color labels (users can customize these)
  colorLabels: {
    color01: "Primary",
    color02: "Secondary",
    color03: "Accent",
    color04: "Background",
    color05: "Background Alt",
    color06: "Foreground",
    color07: "Foreground Muted",
    color08: "Border",
    color09: "Link",
    color10: "Alternate 1",
    color11: "Alternate 2",
    color12: "Alternate 3",
    color13: "Alternate 4",
    color14: "Alternate 5",
    color15: "Alternate 6",
  },
};
