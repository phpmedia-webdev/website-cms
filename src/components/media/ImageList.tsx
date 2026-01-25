"use client";

import { Loader2, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MediaWithVariants } from "@/types/media";
import Image from "next/image";

interface ImageListProps {
  media: MediaWithVariants[];
  loading?: boolean;
  onSelect?: (media: MediaWithVariants) => void;
}

export function ImageList({
  media,
  loading = false,
  onSelect,
}: ImageListProps) {
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Loading media...</p>
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            No media found. Upload media to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {media.map((item) => {
              // Get thumbnail variant
              const thumbnail = item.variants.find((v) => v.variant_type === "thumbnail");
              const original = item.variants.find((v) => v.variant_type === "original");
              const displayUrl = thumbnail?.url || original?.url || "";

              return (
                <Card
                  key={item.id}
                  className="cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => onSelect?.(item)}
                >
                  <div className="aspect-square relative bg-muted">
                    {displayUrl ? (
                      <Image
                        src={displayUrl}
                        alt={item.alt_text || item.name}
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      />
                    ) : item.media_type === "video" ? (
                      <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                        <Video className="h-10 w-10 shrink-0" />
                        <span className="text-xs truncate px-2 max-w-full">
                          Video
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-muted-foreground px-2 truncate max-w-full">
                          {item.name}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-foreground truncate px-2 py-1.5 border-t bg-background" title={item.name}>
                    {item.name}
                  </p>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Showing {media.length} {media.length === 1 ? "item" : "items"}
          </p>
        </div>
      )}
    </div>
  );
}
