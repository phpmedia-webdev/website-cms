"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GalleryEmbed } from "./GalleryEmbed";

export interface GalleryStyleOption {
  id: string;
  name: string;
  layout: string;
}

export interface GalleryPageClientProps {
  galleryId: string;
  galleryName: string;
  gallerySlug: string;
  styles: GalleryStyleOption[];
  initialStyleId: string | null;
}

/**
 * Client component for standalone gallery page.
 * Manages style picker and ?style= query param.
 */
export function GalleryPageClient({
  galleryId,
  galleryName,
  gallerySlug,
  styles,
  initialStyleId,
}: GalleryPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get style from URL or use initial
  const styleFromUrl = searchParams.get("style");
  const validStyleFromUrl = styles.find((s) => s.id === styleFromUrl);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(
    validStyleFromUrl?.id ?? initialStyleId
  );

  // Sync URL when style changes
  useEffect(() => {
    const currentUrlStyle = searchParams.get("style");
    if (selectedStyleId && selectedStyleId !== currentUrlStyle) {
      // Only update URL if different from initial/default
      if (selectedStyleId !== initialStyleId || currentUrlStyle) {
        router.replace(`/gallery/${gallerySlug}?style=${selectedStyleId}`, { scroll: false });
      }
    } else if (!selectedStyleId && currentUrlStyle) {
      router.replace(`/gallery/${gallerySlug}`, { scroll: false });
    }
  }, [selectedStyleId, gallerySlug, initialStyleId, router, searchParams]);

  const handleStyleChange = (styleId: string) => {
    setSelectedStyleId(styleId || null);
  };

  const showPicker = styles.length > 1;

  return (
    <div>
      {showPicker && (
        <div className="flex items-center gap-3 mb-6">
          <label htmlFor="style-picker" className="text-sm font-medium text-muted-foreground">
            Display Style:
          </label>
          <select
            id="style-picker"
            value={selectedStyleId ?? ""}
            onChange={(e) => handleStyleChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {styles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name} ({style.layout})
              </option>
            ))}
          </select>
        </div>
      )}
      <GalleryEmbed galleryId={galleryId} styleId={selectedStyleId} />
    </div>
  );
}
