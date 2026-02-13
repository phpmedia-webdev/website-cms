"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getMediaWithVariants } from "@/lib/supabase/media";
import type { MediaWithVariants } from "@/types/media";

function getImageDisplayUrl(item: MediaWithVariants): string {
  const large = item.variants.find((v) => v.variant_type === "large");
  const original = item.variants.find((v) => v.variant_type === "original");
  const first = item.variants[0];
  return large?.url || original?.url || first?.url || "";
}

interface AvatarMediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

/**
 * Dialog to pick an image from the media library for use as avatar.
 * Shows only images; returns the selected item's display URL (large or original variant).
 */
export function AvatarMediaPicker({
  open,
  onOpenChange,
  onSelect,
}: AvatarMediaPickerProps) {
  const [media, setMedia] = useState<MediaWithVariants[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMediaWithVariants()
      .then((all) => setMedia(all.filter((m) => m.media_type === "image")))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSelect = (item: MediaWithVariants) => {
    const url = getImageDisplayUrl(item);
    if (url) {
      onSelect(url);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose from Media Library</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select an image to use as your avatar.
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading media…</p>
            </div>
          ) : media.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No images in the media library. Upload images in Media first.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {media.map((item) => {
                const url = getImageDisplayUrl(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="relative aspect-square rounded-md border overflow-hidden bg-muted hover:ring-2 hover:ring-primary focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    onClick={() => handleSelect(item)}
                  >
                    {url ? (
                      <Image
                        src={url}
                        alt={item.alt_text || item.name}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground p-2 break-all">
                        {item.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
