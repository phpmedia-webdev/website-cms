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
 */
export interface ColorPalette {
  primary: string; // Primary brand color (hex)
  secondary: string; // Secondary brand color (hex)
  accent: string; // Accent color (hex)
  background: string; // Main background color (hex)
  backgroundAlt: string; // Alternative background color (hex)
  foreground: string; // Main text color (hex)
  foregroundMuted: string; // Muted text color (hex)
  border: string; // Border color (hex)
  link: string; // Link color (hex)
  linkHover: string; // Link hover color (hex)
  success: string; // Success state color (hex)
  warning: string; // Warning state color (hex)
  error: string; // Error state color (hex)
  info: string; // Info state color (hex)
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
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    accent: "#06b6d4",
    background: "#ffffff",
    backgroundAlt: "#f9fafb",
    foreground: "#111827",
    foregroundMuted: "#6b7280",
    border: "#e5e7eb",
    link: "#3b82f6",
    linkHover: "#2563eb",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
  },
};
