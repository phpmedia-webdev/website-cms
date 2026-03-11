"use client";

import React, { useMemo } from "react";
import { generateHTML, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { findAllShortcodes, type ShortcodePart, type TextAlignValue } from "@/lib/shortcodes/parse";
import { GalleryEmbed } from "@/components/public/media/GalleryEmbed";
import { MediaShortcodeRender } from "./MediaShortcodeRender";
import { FormEmbed } from "./FormEmbed";
import { buttonStyleHasVisual, buttonStyleToInlineStyle } from "@/components/settings/ButtonStylesPreview";
import type { ButtonStyle, ColorPalette, FormStyle } from "@/types/design-system";
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
  /** Button styles for shortcode render. */
  buttonStyles?: ButtonStyle[] | null;
  /** Theme colors to resolve theme refs in button styles (e.g. backgroundColorTheme -> hex). */
  themeColors?: ColorPalette | null;
  /** Form styles for form shortcode (optional style= slug). */
  formStyles?: FormStyle[] | null;
}

/**
 * Renders Tiptap JSON as HTML with all shortcodes replaced (gallery, media, separator, button, form, snippet, etc.).
 */
export function ContentWithGalleries({
  content,
  className,
  buttonStyles,
  themeColors,
  formStyles,
}: ContentWithGalleriesProps) {
  const parts = useMemo(() => {
    let parsed = content;
    if (!parsed || typeof parsed !== "object") return [];
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed) as Record<string, unknown>;
      } catch {
        return [];
      }
    }
    try {
      const html = generateHTML(parsed as JSONContent, EXTENSIONS);
      const trimmed = html?.trim() ?? "";
      if (!trimmed) return [];
      return findAllShortcodes(trimmed);
    } catch {
      return [];
    }
  }, [content]);

  if (parts.length === 0) return null;

  const proseClass = cn("prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none", className);

  function wrapAlignment(part: ShortcodePart, node: React.ReactNode, key: string | number) {
    const alignment = "alignment" in part ? (part.alignment as TextAlignValue | undefined) : undefined;
    if (alignment) {
      return (
        <div key={key} className="not-prose my-2" style={{ textAlign: alignment }}>
          {node}
        </div>
      );
    }
    return <React.Fragment key={key}>{node}</React.Fragment>;
  }

  function renderShortcodeFragment(html: string, keyPrefix: string): React.ReactNode {
    if (!html.trim()) return null;
    const fragmentParts = findAllShortcodes(html);
    return (
      <>
        {fragmentParts.map((p, idx) => renderPart(p, `${keyPrefix}-${idx}`))}
      </>
    );
  }

  function renderPart(part: ShortcodePart, key: string | number): React.ReactNode {
    if (part.type === "html") {
      return <div key={key} dangerouslySetInnerHTML={{ __html: part.value }} />;
    }
    if (part.type === "gallery") {
      return wrapAlignment(
        part,
        <div className="my-6 not-prose">
          <GalleryEmbed galleryId={part.galleryId} styleId={part.styleId ?? null} />
        </div>,
        key
      );
    }
    if (part.type === "media") {
      return wrapAlignment(part, <MediaShortcodeRender mediaId={part.mediaId} size={part.size} />, key);
    }
    if (part.type === "separator") {
      return wrapAlignment(part, <hr className="shortcode-separator my-4 border-border" />, key);
    }
    if (part.type === "section_break") {
      return wrapAlignment(part, <div className="section-break my-4" />, key);
    }
    if (part.type === "spacer") {
      const sizeClass = part.size ? `spacer-${part.size}` : "spacer";
      return wrapAlignment(part, <div className={cn("spacer my-2", sizeClass)} />, key);
    }
    if (part.type === "clear") {
      return wrapAlignment(part, <div className="clearfix my-2" style={{ clear: "both" }} />, key);
    }
    if (part.type === "button") {
      const matched = buttonStyles?.find((bs) => bs.slug === part.style);
      const useVisual = matched && buttonStyleHasVisual(matched);
      const inlineStyle = useVisual
        ? buttonStyleToInlineStyle(matched!, { colors: themeColors ?? undefined })
        : undefined;
      const styleClass = useVisual ? "btn font-medium" : `btn btn-${part.style}`;
      return wrapAlignment(
        part,
        <p className="not-prose my-2">
          <a
            href={part.url}
            className={styleClass}
            style={inlineStyle}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.label}
          </a>
        </p>,
        key
      );
    }
    if (part.type === "form") {
      return wrapAlignment(
        part,
        <div className="not-prose my-4" data-shortcode="form" data-form-id={part.formId}>
          <FormEmbed
            formId={part.formId}
            styleSlug={part.styleSlug ?? null}
            formStyles={formStyles}
            themeColors={themeColors}
          />
        </div>,
        key
      );
    }
    if (part.type === "snippet") {
      return wrapAlignment(
        part,
        <div className="not-prose my-4" data-shortcode="snippet" data-snippet-id={part.snippetId}>
          [Snippet: {part.snippetId}]
        </div>,
        key
      );
    }
    if (part.type === "layout") {
      const widthArr = part.widths
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));
      const total = widthArr.reduce((a, b) => a + b, 0);
      const pcts = total === 100 ? widthArr : widthArr.map(() => 100 / widthArr.length);
      const colCount = widthArr.length;
      return wrapAlignment(
        part,
        <div
          key={key}
          className="not-prose my-4 flex w-full gap-2"
          style={{ minHeight: part.heightPx }}
        >
          {Array.from({ length: colCount }, (_, j) => (
            <div
              key={j}
              style={{
                width: `${pcts[j] ?? 0}%`,
                minHeight: part.heightPx,
              }}
              className="flex items-center justify-center overflow-hidden"
            >
              {renderShortcodeFragment(part.columnContents[j] ?? "", `layout-${String(key)}-col-${j}`)}
            </div>
          ))}
        </div>,
        key
      );
    }
    return null;
  }

  return (
    <div className={proseClass}>
      {parts.map((part, i) => renderPart(part, i))}
    </div>
  );
}
