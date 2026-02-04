"use client";

import { useMemo } from "react";
import { generateHTML, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { findGalleryShortcodes } from "@/lib/shortcodes/gallery";
import { GalleryEmbed } from "@/components/public/media/GalleryEmbed";
import { cn } from "@/lib/utils";

const EXTENSIONS = [
  StarterKit,
  Image.configure({ inline: true, allowBase64: true }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: "noopener noreferrer" },
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
];

export interface ContentWithGalleriesProps {
  /** Tiptap JSON (content.body). */
  content?: Record<string, unknown> | null;
  className?: string;
}

/**
 * Server component. Renders Tiptap JSON as HTML with gallery shortcodes replaced by GalleryRenderer.
 * Shortcode format: [[gallery:gallery-id, style-id]] or [[gallery:gallery-id]]
 */
export function ContentWithGalleries({
  content,
  className,
}: ContentWithGalleriesProps) {
  const html = useMemo(() => {
    let parsed = content;
    if (!parsed || typeof parsed !== "object") return "";
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed) as Record<string, unknown>;
      } catch {
        return "";
      }
    }
    try {
      const h = generateHTML(parsed as JSONContent, EXTENSIONS);
      return h && h.trim() ? h : "";
    } catch {
      return "";
    }
  }, [content]);

  if (!html) return null;

  const shortcodes = findGalleryShortcodes(html);
  const proseClass = cn("prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none", className);

  if (shortcodes.length === 0) {
    return (
      <div
        className={proseClass}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const parts: Array<{ type: "html" | "gallery"; value: string; galleryId?: string; styleId?: string }> = [];
  let lastEnd = 0;

  for (const sc of shortcodes) {
    const { match, parsed: scParsed, index } = sc;
    if (index > lastEnd) {
      parts.push({
        type: "html",
        value: html.slice(lastEnd, index),
      });
    }
    parts.push({
      type: "gallery",
      value: match,
      galleryId: scParsed.galleryId,
      styleId: scParsed.styleId ?? undefined,
    });
    lastEnd = index + match.length;
  }
  if (lastEnd < html.length) {
    parts.push({
      type: "html",
      value: html.slice(lastEnd),
    });
  }

  return (
    <div className={cn("prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none", className)}>
      {parts.map((part, i) => {
        if (part.type === "html") {
          return (
            <div
              key={i}
              dangerouslySetInnerHTML={{ __html: part.value }}
            />
          );
        }
        if (part.type === "gallery" && part.galleryId) {
          return (
            <div key={i} className="my-6 not-prose">
              <GalleryEmbed
                galleryId={part.galleryId}
                styleId={part.styleId ?? null}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
