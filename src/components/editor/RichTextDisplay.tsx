"use client";

import { useMemo } from "react";
import { generateHTML, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";

const EXTENSIONS = [
  StarterKit,
  Image.configure({ inline: true, allowBase64: true }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: "noopener noreferrer" },
  }),
];

export interface RichTextDisplayProps {
  /** Tiptap JSON (content.body). */
  content?: Record<string, unknown> | null;
  className?: string;
}

/**
 * Renders Tiptap JSON as HTML with typography styles.
 * Uses the same extensions as RichTextEditor (StarterKit, Image, Link).
 */
export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  const html = useMemo(() => {
    if (!content || typeof content !== "object") return "";
    try {
      return generateHTML(content as JSONContent, EXTENSIONS);
    } catch {
      return "";
    }
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={cn("prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
