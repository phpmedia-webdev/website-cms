"use client";

import { useState, useEffect, useCallback } from "react";
import { GalleryGrid } from "./GalleryGrid";
import { GalleryMasonry } from "./GalleryMasonry";
import { GallerySlider } from "./GallerySlider";
import { GalleryPreviewModal } from "./GalleryPreviewModal";
import { GALLERY_DEFAULT_OPTIONS } from "@/lib/shortcodes/gallery";
import type { GalleryDisplayStyle } from "@/types/content";
import { cn } from "@/lib/utils";

interface GalleryItemForRender {
  id: string;
  media_id: string;
  position: number;
  caption: string | null;
  media: {
    id: string;
    media_type: string;
    alt_text: string | null;
    thumbnail_url: string;
    display_url: string;
  };
}

interface GalleryData {
  id: string;
  name: string;
  slug: string;
  items: GalleryItemForRender[];
  style: GalleryDisplayStyle | null;
}

export interface GalleryEmbedProps {
  galleryId: string;
  styleId?: string | null;
  className?: string;
}

/**
 * Client component. Fetches gallery from API and renders.
 */
export function GalleryEmbed({
  galleryId,
  styleId = null,
  className,
}: GalleryEmbedProps) {
  const [data, setData] = useState<GalleryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const url = styleId
      ? `/api/galleries/${galleryId}/public?styleId=${styleId}`
      : `/api/galleries/${galleryId}/public`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [galleryId, styleId]);

  const handleItemClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const handleLightboxNavigate = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  if (error) return null;
  if (!data || !data.items.length) return null;

  const opts = data.style ? styleToOptions(data.style) : GALLERY_DEFAULT_OPTIONS;
  const cellSize = opts.cell_size ?? "medium";
  const cellSizeClass =
    cellSize === "xsmall"
      ? "max-w-xs mx-auto"
      : cellSize === "small"
        ? "max-w-sm mx-auto"
        : cellSize === "large"
          ? "max-w-4xl mx-auto"
          : cellSize === "xlarge"
            ? "max-w-6xl mx-auto"
            : "w-full";
  const gapClass = opts.gap === "sm" ? "gap-2" : opts.gap === "lg" ? "gap-6" : "gap-4";
  const borderClass =
    opts.border === "subtle"
      ? "border border-muted rounded-md overflow-hidden"
      : opts.border === "frame"
        ? "border-2 border-muted rounded-lg overflow-hidden p-1"
        : "";
  // Grid: scale to fit (object-contain), equal-height rows, no crop
  const gridItemClasses = cn("max-w-full max-h-full object-contain", opts.border === "frame" && "rounded");
  const masonryItemClasses = cn("block w-full h-auto", opts.border === "frame" && "rounded");

  const common = {
    items: data.items,
    opts,
    captions: opts.captions,
    lightbox: opts.lightbox,
  };

  const lightboxModal = opts.lightbox && (
    <GalleryPreviewModal
      items={data.items}
      currentIndex={lightboxIndex}
      open={lightboxOpen}
      onClose={handleLightboxClose}
      onNavigate={handleLightboxNavigate}
    />
  );

  if (opts.layout === "slider") {
    return (
      <div className={cn("gallery-embed gallery-slider", cellSizeClass, borderClass, className)}>
        <GallerySlider
          items={data.items}
          itemClasses={gridItemClasses}
          captions={opts.captions}
          lightbox={opts.lightbox}
          animation={opts.slider_animation ?? "slide"}
          autoplay={opts.slider_autoplay ?? false}
          delay={(opts.slider_delay ?? 5) * 1000}
          controls={opts.slider_controls ?? "arrows"}
          onItemClick={opts.lightbox ? handleItemClick : undefined}
        />
        {lightboxModal}
      </div>
    );
  }

  if (opts.layout === "masonry") {
    return (
      <div className={cn("gallery-embed gallery-masonry", cellSizeClass, borderClass, gapClass, className)}>
        <GalleryMasonry
          {...common}
          itemClasses={masonryItemClasses}
          gapClass={gapClass}
          onItemClick={opts.lightbox ? handleItemClick : undefined}
        />
        {lightboxModal}
      </div>
    );
  }

  return (
    <div className={cn("gallery-embed gallery-grid", cellSizeClass, borderClass, gapClass, className)}>
      <GalleryGrid
        {...common}
        itemClasses={gridItemClasses}
        gapClass={gapClass}
        onItemClick={opts.lightbox ? handleItemClick : undefined}
      />
      {lightboxModal}
    </div>
  );
}

function styleToOptions(style: GalleryDisplayStyle) {
  const validCellSize = ["xsmall", "small", "medium", "large", "xlarge"].includes(style.cell_size ?? "")
    ? (style.cell_size as "xsmall" | "small" | "medium" | "large" | "xlarge")
    : "medium";
  return {
    layout: style.layout,
    columns: style.columns,
    gap: style.gap,
    size: style.size,
    cell_size: validCellSize,
    captions: style.captions,
    lightbox: style.lightbox,
    border: style.border,
    slider_animation: style.slider_animation ?? undefined,
    slider_autoplay: style.slider_autoplay ?? false,
    slider_delay: style.slider_delay ?? 5,
    slider_controls: style.slider_controls ?? "arrows",
  };
}
