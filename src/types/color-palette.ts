/**
 * Color Palette types for palette library management
 */

import type { ColorPalette } from "./design-system";

/**
 * Color palette entry (stored in database)
 */
export interface ColorPaletteEntry {
  id: string;
  name: string;
  description: string | null;
  colors: ColorPalette;
  is_predefined: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Color palette creation/update payload
 */
export interface ColorPalettePayload {
  name: string;
  description?: string;
  colors: ColorPalette;
  tags?: string[];
}
