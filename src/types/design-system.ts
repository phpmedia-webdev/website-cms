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
 * 15 colors total: 9 core colors + 6 alternate colors
 */
export interface ColorPalette {
  // Core Colors (9)
  primary: string; // Primary brand color (hex)
  secondary: string; // Secondary brand color (hex)
  accent: string; // Accent color (hex)
  background: string; // Main background color (hex)
  backgroundAlt: string; // Alternative background color (hex)
  foreground: string; // Main text color (hex)
  foregroundMuted: string; // Muted text color (hex)
  border: string; // Border color (hex)
  link: string; // Link color (hex)
  // Alternate Colors (6) - Custom/flexible colors for theme variations
  alternate1: string; // Alternate color 1 (hex)
  alternate2: string; // Alternate color 2 (hex)
  alternate3: string; // Alternate color 3 (hex)
  alternate4: string; // Alternate color 4 (hex)
  alternate5: string; // Alternate color 5 (hex)
  alternate6: string; // Alternate color 6 (hex)
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
}

/**
 * Site metadata (stored alongside design system)
 */
export interface SiteMetadata {
  name: string;
  description: string;
}

/**
 * Complete settings structure (as stored in database)
 */
export interface DesignSystemSettings {
  "design_system.theme": string;
  "design_system.fonts.primary": FontConfig;
  "design_system.fonts.secondary": FontConfig;
  "design_system.colors": ColorPalette;
  "site.name": string;
  "site.description": string;
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
    // Core Colors (9)
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    accent: "#06b6d4",
    background: "#ffffff",
    backgroundAlt: "#f9fafb",
    foreground: "#111827",
    foregroundMuted: "#6b7280",
    border: "#e5e7eb",
    link: "#3b82f6",
    // Alternate Colors (6)
    alternate1: "#10b981", // Success/Green
    alternate2: "#f59e0b", // Warning/Orange
    alternate3: "#ef4444", // Error/Red
    alternate4: "#3b82f6", // Info/Blue
    alternate5: "#2563eb", // Link Hover/Dark Blue
    alternate6: "#8b5a2b", // Custom/Brown
  },
};
