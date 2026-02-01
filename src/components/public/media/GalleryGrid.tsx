import type { GalleryItemForRender } from "@/lib/supabase/galleries-server";
import { cn } from "@/lib/utils";

export interface GalleryGridProps {
  items: GalleryItemForRender[];
  opts: {
    columns: number;
  };
  itemClasses: string;
  captions: boolean;
  lightbox: boolean;
  gapClass?: string;
  onItemClick?: (index: number) => void;
}

/**
 * CSS grid layout. Equal-height rows; images scale to fit (object-contain, no crop).
 */
export function GalleryGrid({
  items,
  opts,
  itemClasses,
  captions,
  lightbox,
  gapClass = "gap-4",
  onItemClick,
}: GalleryGridProps) {
  const gridCols =
    opts.columns === 1
      ? "grid-cols-1"
      : opts.columns === 2
        ? "grid-cols-2"
        : opts.columns === 4
          ? "grid-cols-4"
          : opts.columns === 5
            ? "grid-cols-5"
            : opts.columns === 6
              ? "grid-cols-6"
              : "grid-cols-3";

  return (
    <div className={cn("grid", gridCols, gapClass)}>
      {items.map((item, index) => (
        <figure key={item.id} className="m-0">
          {lightbox && onItemClick ? (
            <button
              type="button"
              onClick={() => onItemClick(index)}
              className="block aspect-video w-full overflow-hidden flex items-center justify-center bg-muted/30 cursor-pointer"
            >
              {item.media.media_type === "video" ? (
                <video
                  src={item.media.display_url}
                  poster={item.media.thumbnail_url}
                  className={itemClasses}
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={item.media.display_url}
                  alt={item.media.alt_text ?? ""}
                  className={itemClasses}
                />
              )}
            </button>
          ) : (
            <a
              href={item.media.display_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-video w-full overflow-hidden flex items-center justify-center bg-muted/30"
            >
              {item.media.media_type === "video" ? (
                <video
                  src={item.media.display_url}
                  poster={item.media.thumbnail_url}
                  className={itemClasses}
                  controls
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={item.media.display_url}
                  alt={item.media.alt_text ?? ""}
                  className={itemClasses}
                />
              )}
            </a>
          )}
          {captions && (item.caption || item.media.alt_text) && (
            <figcaption className="mt-1 text-sm text-muted-foreground text-center">
              {item.caption ?? item.media.alt_text}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
