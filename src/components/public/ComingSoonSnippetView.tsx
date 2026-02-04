"use client";

import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";

export interface ComingSoonSnippetViewProps {
  /** Tiptap JSON (content.body). */
  content: Record<string, unknown> | null;
}

/**
 * Renders snippet body on the Coming Soon page. Center-screen, mobile responsive.
 * Design system (colors, fonts) is applied by the parent; this adds max-width and prose.
 */
export function ComingSoonSnippetView({ content }: ComingSoonSnippetViewProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 text-center [&_.prose]:mx-auto [&_.prose]:text-left [&_.prose_a]:underline [&_.prose_img]:rounded-lg">
      <PublicContentRenderer content={content} />
    </div>
  );
}
