"use client";

import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";
import type { ButtonStyle, ColorPalette } from "@/types/design-system";

export interface ComingSoonSnippetViewProps {
  /** Tiptap JSON (content.body). */
  content: Record<string, unknown> | null;
  /** Button styles for shortcode rendering (from Settings → Style → Buttons). */
  buttonStyles?: ButtonStyle[];
  /** Theme colors to resolve theme refs in button styles. */
  themeColors?: ColorPalette | null;
}

/**
 * Renders snippet body on the Coming Soon page. Center-screen, mobile responsive.
 * Design system (colors, fonts) is applied by the parent; this adds max-width and prose.
 */
export function ComingSoonSnippetView({ content, buttonStyles, themeColors }: ComingSoonSnippetViewProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 text-center [&_.prose]:mx-auto [&_.prose]:text-left [&_.prose_a]:underline [&_.prose_img]:rounded-lg">
      <PublicContentRenderer content={content} buttonStyles={buttonStyles} themeColors={themeColors} />
    </div>
  );
}
