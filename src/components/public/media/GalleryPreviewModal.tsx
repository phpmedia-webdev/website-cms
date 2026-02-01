"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryPreviewItem {
  id: string;
  media_id: string;
  caption: string | null;
  media: {
    id: string;
    media_type: string;
    alt_text: string | null;
    display_url: string;
    thumbnail_url: string;
    video_url?: string | null;
    provider?: string | null;
  };
}

export interface GalleryPreviewModalProps {
  items: GalleryPreviewItem[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Lightbox modal for gallery items. Supports images and videos.
 * Navigation: arrows, keyboard (left/right/esc), click outside to close.
 */
export function GalleryPreviewModal({
  items,
  currentIndex,
  open,
  onClose,
  onNavigate,
}: GalleryPreviewModalProps) {
  const item = items[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, goPrev, goNext]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !item) return null;

  const isVideo = item.media.media_type === "video";
  const caption = item.caption ?? item.media.alt_text;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Previous button */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Content */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={item.media.display_url}
            poster={item.media.thumbnail_url}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] object-contain"
          />
        ) : (
          <img
            src={item.media.display_url}
            alt={item.media.alt_text ?? ""}
            className="max-w-full max-h-[80vh] object-contain"
          />
        )}

        {/* Caption */}
        {caption && (
          <p className="mt-4 text-white text-center text-sm max-w-xl">
            {caption}
          </p>
        )}

        {/* Counter */}
        {items.length > 1 && (
          <p className="mt-2 text-white/60 text-xs">
            {currentIndex + 1} / {items.length}
          </p>
        )}
      </div>
    </div>
  );
}
