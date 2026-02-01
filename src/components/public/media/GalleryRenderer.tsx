import { getGalleryForPublic } from "@/lib/supabase/galleries-server";
import { GALLERY_DEFAULT_OPTIONS } from "@/lib/shortcodes/gallery";
import type { GalleryDisplayStyle } from "@/types/content";
import { GalleryGrid } from "./GalleryGrid";
import { GalleryMasonry } from "./GalleryMasonry";
import { GallerySlider } from "./GallerySlider";
import { cn } from "@/lib/utils";

export interface GalleryRendererProps {
  galleryId: string;
  styleId?: string | null;
  className?: string;
}

/**
 * Server component. Fetches gallery and style, renders layout.
 * Fallback: simple inline grid when no style or style missing.
 */
export async function GalleryRenderer({
  galleryId,
  styleId = null,
  className,
}: GalleryRendererProps) {
  const data = await getGalleryForPublic(galleryId, styleId);
  if (!data || !data.items.length) return null;

  const style = data.style;
  const opts = style
    ? styleToOptions(style)
    : GALLERY_DEFAULT_OPTIONS;

  const gapClass =
    opts.gap === "sm"
      ? "gap-2"
      : opts.gap === "lg"
        ? "gap-6"
        : "gap-4";

  const borderClass =
    opts.border === "subtle"
      ? "border border-muted rounded-md overflow-hidden"
      : opts.border === "frame"
        ? "border-2 border-muted rounded-lg overflow-hidden p-1"
        : "";

  const itemClasses = cn(
    "block w-full h-auto object-cover",
    opts.border === "frame" && "rounded"
  );

  const common = {
    items: data.items,
    opts,
    itemClasses,
    captions: opts.captions,
    lightbox: opts.lightbox,
  };

  if (opts.layout === "slider") {
    return (
      <div className={cn("gallery-renderer gallery-slider", borderClass, className)}>
        <GallerySlider
          items={data.items}
          itemClasses={itemClasses}
          captions={opts.captions}
          lightbox={opts.lightbox}
          animation={opts.slider_animation ?? "slide"}
          autoplay={opts.slider_autoplay ?? false}
          delay={(opts.slider_delay ?? 5) * 1000}
          controls={opts.slider_controls ?? "arrows"}
        />
      </div>
    );
  }

  if (opts.layout === "masonry") {
    return (
      <div className={cn("gallery-renderer gallery-masonry", borderClass, className)}>
        <GalleryMasonry {...common} gapClass={gapClass} />
      </div>
    );
  }

  return (
    <div className={cn("gallery-renderer gallery-grid", borderClass, className)}>
      <GalleryGrid {...common} gapClass={gapClass} />
    </div>
  );
}

function styleToOptions(style: GalleryDisplayStyle) {
  return {
    layout: style.layout,
    columns: style.columns,
    gap: style.gap,
    size: style.size,
    captions: style.captions,
    lightbox: style.lightbox,
    border: style.border,
    slider_animation: style.slider_animation ?? undefined,
    slider_autoplay: style.slider_autoplay ?? false,
    slider_delay: style.slider_delay ?? 5,
    slider_controls: style.slider_controls ?? "arrows",
  };
}
