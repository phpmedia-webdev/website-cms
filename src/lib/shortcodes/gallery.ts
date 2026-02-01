/**
 * Gallery shortcode spec and parser.
 * Format: [[gallery:gallery-id, style-id]] or [[gallery:gallery-id]] (fallback to default view)
 * Legacy: [[gallery-id]] and [[gallery-id, style-id]] (backward compatible)
 */

/** Layout types for gallery display */
export type GalleryLayout = "grid" | "masonry" | "slider";

/** Gap size (maps to design tokens) */
export type GalleryGap = "sm" | "md" | "lg";

/** Media variant size for thumbnails */
export type GallerySize =
  | "thumbnail"
  | "small"
  | "medium"
  | "large"
  | "original";

/** Border preset */
export type GalleryBorder = "none" | "subtle" | "frame";

/** Gallery cell display scale (physical size) */
export type GalleryCellSize = "xsmall" | "small" | "medium" | "large" | "xlarge";

/** Slider animation type */
export type SliderAnimation = "slide" | "fade";

/** Slider control visibility */
export type SliderControls = "arrows" | "dots" | "both" | "none";

/** Full display style options (matches gallery_display_styles table) */
export interface GalleryDisplayStyleOptions {
  layout: GalleryLayout;
  columns: number;
  gap: GalleryGap;
  size: GallerySize;
  cell_size?: GalleryCellSize;
  captions: boolean;
  lightbox: boolean;
  border: GalleryBorder;
  slider_animation?: SliderAnimation;
  slider_autoplay?: boolean;
  slider_delay?: number;
  slider_controls?: SliderControls;
}

/** Parsed gallery shortcode result */
export interface ParsedGalleryShortcode {
  galleryId: string;
  styleId: string | null;
}

/** Default options for fallback (simple inline, height preserved) */
export const GALLERY_DEFAULT_OPTIONS: GalleryDisplayStyleOptions = {
  layout: "grid",
  columns: 3,
  gap: "md",
  size: "medium",
  cell_size: "medium",
  captions: true,
  lightbox: true,
  border: "none",
};

/**
 * Shortcode prefix for galleries. Self-documenting in content.
 * Convention: [[type:id]] — e.g. gallery:, form: (when form shortcodes are added)
 */
export const GALLERY_SHORTCODE_PREFIX = "gallery:";

/** GALLERY_SHORTCODE_SPEC — attributes and defaults for documentation */
export const GALLERY_SHORTCODE_SPEC = {
  format: "[[gallery:gallery-id, style-id]] or [[gallery:gallery-id]]",
  description:
    "Embeds a gallery. With style-id uses saved Display Style; without style uses fallback (simple inline, height preserved).",
  attributes: {
    galleryId: { required: true, type: "uuid", description: "Gallery UUID" },
    styleId: { required: false, type: "uuid", description: "Display Style UUID (optional)" },
  },
  displayStyleOptions: {
    layout: { type: "grid | masonry | slider", default: "grid" },
    columns: { type: "1-6", default: 3 },
    gap: { type: "sm | md | lg", default: "md" },
    size: { type: "thumbnail | small | medium | large | original", default: "medium" },
    captions: { type: "boolean", default: true },
    lightbox: { type: "boolean", default: true },
    border: { type: "none | subtle | frame", default: "none" },
    slider_animation: { type: "slide | fade", default: "slide" },
    slider_autoplay: { type: "boolean", default: false },
    slider_delay: { type: "1-30 seconds", default: 5 },
    slider_controls: { type: "arrows | dots | both | none", default: "arrows" },
  },
  example: "[[gallery:550e8400-e29b-41d4-a716-446655440000, 7c9e6679-7425-40de-944b-e07fc1f90ae7]]",
  exampleFallback: "[[gallery:550e8400-e29b-41d4-a716-446655440000]]",
} as const;

/** UUID regex (simple pattern) */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parse gallery shortcode from content.
 * Matches: [[gallery:uuid, style-id]] or [[gallery:uuid]] or legacy [[uuid]] / [[uuid, style-id]]
 * @param text - Raw shortcode string
 * @returns Parsed result or null if invalid
 */
export function parseGalleryShortcode(
  text: string
): ParsedGalleryShortcode | null {
  const trimmed = text.trim();
  // Match [[...]] — double brackets
  const match = trimmed.match(/^\[\[(.+)\]\]$/);
  if (!match) return null;

  let inner = match[1].trim();
  // Strip optional "gallery:" prefix for parsing
  if (inner.startsWith("gallery:")) {
    inner = inner.slice("gallery:".length).trim();
  }
  const parts = inner.split(",").map((p) => p.trim());

  if (parts.length === 0 || parts.length > 2) return null;

  const galleryId = parts[0];
  if (!UUID_REGEX.test(galleryId)) return null;

  let styleId: string | null = null;
  if (parts.length === 2) {
    styleId = parts[1];
    if (!UUID_REGEX.test(styleId)) return null;
  }

  return { galleryId, styleId };
}

/**
 * Generate gallery shortcode string from IDs.
 * Output: [[gallery:uuid]] or [[gallery:uuid, style-id]]
 * @param galleryId - Gallery UUID
 * @param styleId - Optional Display Style UUID
 * @returns Shortcode string (self-documenting with gallery: prefix)
 */
export function generateGalleryShortcode(
  galleryId: string,
  styleId?: string | null
): string {
  const prefix = `${GALLERY_SHORTCODE_PREFIX}${galleryId}`;
  if (styleId) {
    return `[[${prefix}, ${styleId}]]`;
  }
  return `[[${prefix}]]`;
}

/**
 * Find all gallery shortcodes in a string.
 * @param content - Text content (e.g. post body)
 * @returns Array of { match, parsed } for each shortcode found
 */
export function findGalleryShortcodes(content: string): Array<{
  match: string;
  parsed: ParsedGalleryShortcode;
  index: number;
}> {
  // (?:gallery:)? = optional "gallery:" prefix for backward compatibility
  const regex = /\[\[(?:gallery:)?([0-9a-f-]{36})(?:,\s*([0-9a-f-]{36}))?\]\]/gi;
  const results: Array<{ match: string; parsed: ParsedGalleryShortcode; index: number }> = [];

  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    const galleryId = m[1];
    const styleId = m[2] ?? null;
    if (UUID_REGEX.test(galleryId) && (styleId === null || UUID_REGEX.test(styleId))) {
      results.push({
        match: m[0],
        parsed: { galleryId, styleId },
        index: m.index,
      });
    }
  }

  return results;
}
