"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/** Valid size param for media shortcode; controls max-width at point of use. */
export const MEDIA_SIZE_OPTIONS = ["small", "medium", "large", "full"] as const;
export type MediaSizeOption = (typeof MEDIA_SIZE_OPTIONS)[number];

const SIZE_CLASSES: Record<MediaSizeOption, string> = {
  small: "max-w-xs",
  medium: "max-w-md",
  large: "max-w-2xl",
  full: "max-w-full",
};

function toSizeOption(size?: string | null): MediaSizeOption {
  if (!size) return "medium";
  const s = size.toLowerCase();
  return MEDIA_SIZE_OPTIONS.includes(s as MediaSizeOption) ? (s as MediaSizeOption) : "medium";
}

interface MediaShortcodeRenderProps {
  mediaId: string;
  size?: string;
  className?: string;
}

export function MediaShortcodeRender({
  mediaId,
  size,
  className,
}: MediaShortcodeRenderProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [error, setError] = useState(false);
  const sizeOption = toSizeOption(size);
  const sizeClass = SIZE_CLASSES[sizeOption];

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shortcodes/media/${encodeURIComponent(mediaId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUrl(data.url ?? null);
        setAlt(data.alt ?? "");
        if (!data.url) setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  if (error || !url) {
    return (
      <span className={className} title={`Media: ${mediaId}`}>
        [Image: {mediaId}]
      </span>
    );
  }

  return (
    <span className={cn("block my-2 not-prose", sizeClass, className)}>
      <img
        src={url}
        alt={alt}
        className="w-full h-auto rounded"
        loading="lazy"
      />
    </span>
  );
}
