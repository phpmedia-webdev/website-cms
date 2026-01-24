"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Trash2, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMediaWithVariants, deleteMedia } from "@/lib/supabase/media";
import { formatFileSize } from "@/lib/media/image-optimizer";
import { MediaWithVariants } from "@/types/media";
import Image from "next/image";

interface ImageListProps {
  onSelect?: (media: MediaWithVariants) => void;
  onDelete?: (mediaId: string) => void;
  refreshTrigger?: number; // Increment to trigger refresh
}

export function ImageList({
  onSelect,
  onDelete,
  refreshTrigger = 0,
}: ImageListProps) {
  const [media, setMedia] = useState<MediaWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load media on mount and when refreshTrigger changes
  useEffect(() => {
    loadMedia();
  }, [refreshTrigger]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const allMedia = await getMediaWithVariants();
      setMedia(allMedia);
    } catch (error) {
      console.error("Error loading media:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter media based on search
  const filteredMedia = media.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this media? This cannot be undone.")) {
      return;
    }

    setDeleting(mediaId);
    try {
      await deleteMedia(mediaId);
      setMedia(media.filter((m) => m.id !== mediaId));
      onDelete?.(mediaId);
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Failed to delete media");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Loading media...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            {search ? "No media matches your search" : "No media found. Upload an image to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Media Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredMedia.map((item) => {
              // Get thumbnail variant
              const thumbnail = item.variants.find((v) => v.variant_type === "thumbnail");
              const original = item.variants.find((v) => v.variant_type === "original");
              const displayUrl = thumbnail?.url || original?.url || "";

              return (
                <Card
                  key={item.id}
                  className="relative group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => onSelect?.(item)}
                >
                  {/* Image */}
                  <div className="aspect-square relative bg-muted">
                    {displayUrl ? (
                      <Image
                        src={displayUrl}
                        alt={item.alt_text || item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground px-1 truncate">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Overlay with Actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deleting === item.id}
                      title="Delete"
                    >
                      {deleting === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Variant Count Badge */}
                  <div className="absolute top-1 right-1 bg-primary/80 text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                    {item.variants.length}
                  </div>

                  {/* Name Tooltip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-300 truncate">{item.slug}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Showing {filteredMedia.length} of {media.length} media items
          </p>
        </div>
      )}
    </div>
  );
}
