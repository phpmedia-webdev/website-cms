"use client";

import dynamic from "next/dynamic";

const ContentWithGalleries = dynamic(
  () =>
    import("@/components/editor/ContentWithGalleries").then((m) => m.ContentWithGalleries),
  { ssr: false }
);

export interface PublicContentRendererProps {
  /** Tiptap JSON (content.body). */
  content?: Record<string, unknown> | null;
}

/**
 * Client component that renders Tiptap body with gallery shortcodes.
 * Uses ssr: false because ContentWithGalleries relies on browser APIs (generateHTML).
 */
export function PublicContentRenderer({ content }: PublicContentRendererProps) {
  return <ContentWithGalleries content={content} />;
}
