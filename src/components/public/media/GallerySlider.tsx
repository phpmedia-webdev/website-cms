"use client";

import { useState, useEffect, useCallback } from "react";
import type { GalleryItemForRender } from "@/lib/supabase/galleries-server";
import { cn } from "@/lib/utils";

export interface GallerySliderProps {
  items: GalleryItemForRender[];
  itemClasses: string;
  captions: boolean;
  lightbox: boolean;
  animation: "slide" | "fade";
  autoplay: boolean;
  delay: number;
  controls: "arrows" | "dots" | "both" | "none";
  onItemClick?: (index: number) => void;
}

/**
 * Client component. Carousel with arrows, dots, optional autoplay.
 */
export function GallerySlider({
  items,
  itemClasses,
  captions,
  lightbox,
  animation,
  autoplay,
  delay,
  controls,
  onItemClick,
}: GallerySliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!autoplay || paused || items.length <= 1) return;
    const t = setInterval(next, delay);
    return () => clearInterval(t);
  }, [autoplay, paused, delay, items.length, next]);

  if (items.length === 0) return null;

  const showArrows = controls === "arrows" || controls === "both";
  const showDots = controls === "dots" || controls === "both";
  const current = items[index];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {animation === "slide" ? (
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{
              width: `${items.length * 100}%`,
              transform: `translateX(-${index * (100 / items.length)}%)`,
            }}
          >
            {items.map((item, i) => (
              <div
                key={item.id}
                className="flex-shrink-0 flex items-center justify-center"
                style={{ width: `${100 / items.length}%` }}
              >
                {lightbox && onItemClick ? (
                  <button
                    type="button"
                    onClick={() => onItemClick(i)}
                    className="block w-full h-full flex items-center justify-center cursor-pointer"
                  >
                    {item.media.media_type === "video" ? (
                      <video
                        src={item.media.display_url}
                        poster={item.media.thumbnail_url}
                        className={cn(itemClasses, "max-h-full")}
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={item.media.display_url}
                        alt={item.media.alt_text ?? ""}
                        className={cn(itemClasses, "max-h-full object-contain")}
                      />
                    )}
                  </button>
                ) : (
                  <a
                    href={item.media.display_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full flex items-center justify-center"
                  >
                    {item.media.media_type === "video" ? (
                      <video
                        src={item.media.display_url}
                        poster={item.media.thumbnail_url}
                        className={cn(itemClasses, "max-h-full")}
                        controls
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={item.media.display_url}
                        alt={item.media.alt_text ?? ""}
                        className={cn(itemClasses, "max-h-full object-contain")}
                      />
                    )}
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                i === index ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none"
              )}
            >
              {lightbox && onItemClick ? (
                <button
                  type="button"
                  onClick={() => onItemClick(i)}
                  className="block w-full h-full flex items-center justify-center cursor-pointer"
                >
                  {item.media.media_type === "video" ? (
                    <video
                      src={item.media.display_url}
                      poster={item.media.thumbnail_url}
                      className={cn(itemClasses, "max-h-full")}
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.media.display_url}
                      alt={item.media.alt_text ?? ""}
                      className={cn(itemClasses, "max-h-full object-contain")}
                    />
                  )}
                </button>
              ) : (
                <a
                  href={item.media.display_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full flex items-center justify-center"
                >
                  {item.media.media_type === "video" ? (
                    <video
                      src={item.media.display_url}
                      poster={item.media.thumbnail_url}
                      className={cn(itemClasses, "max-h-full")}
                      controls
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.media.display_url}
                      alt={item.media.alt_text ?? ""}
                      className={cn(itemClasses, "max-h-full object-contain")}
                    />
                  )}
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {showArrows && items.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-background/80 p-2 shadow hover:bg-background"
            aria-label="Previous"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-background/80 p-2 shadow hover:bg-background"
            aria-label="Next"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {showDots && items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-colors",
                i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {captions && (current.caption || current.media.alt_text) && (
        <p className="mt-2 text-sm text-muted-foreground text-center">
          {current.caption ?? current.media.alt_text}
        </p>
      )}
    </div>
  );
}
