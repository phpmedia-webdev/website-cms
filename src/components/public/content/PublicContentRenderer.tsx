"use client";

import dynamic from "next/dynamic";
import type { ButtonStyle, ColorPalette, FormStyle } from "@/types/design-system";

const ContentWithGalleries = dynamic(
  () =>
    import("@/components/editor/ContentWithGalleries").then((m) => m.ContentWithGalleries),
  { ssr: false }
);

export interface PublicContentRendererProps {
  /** Tiptap JSON (content.body). */
  content?: Record<string, unknown> | null;
  /** Button styles from Settings → Style → Buttons (for custom appearance on front-end). */
  buttonStyles?: ButtonStyle[];
  /** Theme colors to resolve theme refs in button styles (updates when theme changes). */
  themeColors?: ColorPalette | null;
  /** Form styles for form shortcode (optional style= slug). */
  formStyles?: FormStyle[] | null;
}

/**
 * Client component that renders Tiptap body with gallery shortcodes.
 * Uses ssr: false because ContentWithGalleries relies on browser APIs (generateHTML).
 */
export function PublicContentRenderer({ content, buttonStyles, themeColors, formStyles }: PublicContentRendererProps) {
  return (
    <ContentWithGalleries
      content={content}
      buttonStyles={buttonStyles}
      themeColors={themeColors}
      formStyles={formStyles}
    />
  );
}
