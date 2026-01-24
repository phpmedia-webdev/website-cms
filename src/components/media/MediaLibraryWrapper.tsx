"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { MediaWithVariants } from "@/types/media";
import { getMediaWithVariants, getMediaStats, deleteMedia } from "@/lib/supabase/media";
import { ImageList } from "./ImageList";
import { MediaLibraryList } from "./MediaLibraryList";
import { MediaLibraryHeader } from "./MediaLibraryHeader";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { ImageUpload } from "./ImageUpload";

type SortType = "name-asc" | "name-desc" | "date-newest" | "date-oldest" | "size-smallest" | "size-largest";

export function MediaLibraryWrapper() {
  const [view, setView] = useState<"list" | "grid">("grid");
  const [media, setMedia] = useState<MediaWithVariants[]>([]);
  const [displayedMedia, setDisplayedMedia] = useState<MediaWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("date-newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<MediaWithVariants | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(20);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load storage stats
  useEffect(() => {
    loadStats();
  }, [media.length]);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await getMediaStats();
      setTotalSize(stats.totalSizeBytes);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Load media
  useEffect(() => {
    loadMedia();
  }, [refreshTrigger]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const allMedia = await getMediaWithVariants();
      setMedia(allMedia);
      setHasMore(true);
      setDisplayLimit(20);
    } catch (error) {
      console.error("Error loading media:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply search and sort
  useEffect(() => {
    let filtered = media.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.slug.toLowerCase().includes(search.toLowerCase()) ||
        item.original_filename.toLowerCase().includes(search.toLowerCase())
    );

    // Apply sorting
    switch (sort) {
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "date-newest":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "date-oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "size-smallest":
        filtered.sort((a, b) => {
          const aSize = a.variants.reduce((sum, v) => sum + (v.size_bytes || 0), 0);
          const bSize = b.variants.reduce((sum, v) => sum + (v.size_bytes || 0), 0);
          return aSize - bSize;
        });
        break;
      case "size-largest":
        filtered.sort((a, b) => {
          const aSize = a.variants.reduce((sum, v) => sum + (v.size_bytes || 0), 0);
          const bSize = b.variants.reduce((sum, v) => sum + (v.size_bytes || 0), 0);
          return bSize - aSize;
        });
        break;
    }

    setDisplayedMedia(filtered);
    setHasMore(filtered.length > displayLimit);
  }, [media, search, sort, displayLimit]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && view === "grid") {
        setDisplayLimit((prev) => prev + 20);
      }
    });

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, view]);

  // Persist view preference
  useEffect(() => {
    const saved = localStorage.getItem("mediaLibraryView");
    if (saved === "list" || saved === "grid") {
      setView(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("mediaLibraryView", view);
  }, [view]);

  const handleSelect = (mediaId: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(mediaId);
    } else {
      newSelected.delete(mediaId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(displayedMedia.map((m) => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (
      !confirm(
        `Delete ${selectedIds.size} ${selectedIds.size === 1 ? "image" : "images"} and all their variants? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      for (const id of Array.from(selectedIds)) {
        await deleteMedia(id);
      }
      setSelectedIds(new Set());
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Failed to delete some media items");
    }
  };

  const displayedList = displayedMedia.slice(0, displayLimit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <MediaLibraryHeader
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        totalSize={totalSize}
        totalItems={media.length}
        isLoadingStats={isLoadingStats}
      />

      {/* Main Content: 2/3 Library + 1/3 Upload */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Media Library (2/3) */}
        <div className="col-span-2 space-y-3">
          {/* Bulk Delete Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-sm font-medium flex-1">
                {selectedIds.size} {selectedIds.size === 1 ? "image" : "images"} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}

          {/* View Renderer */}
          {view === "grid" ? (
            <div>
              <ImageList
                onSelect={(m) => setSelectedMedia(m)}
                onDelete={() => setRefreshTrigger((prev) => prev + 1)}
                refreshTrigger={refreshTrigger}
              />
              {/* Infinite scroll trigger */}
              {hasMore && <div ref={observerTarget} className="h-4" />}
            </div>
          ) : (
            <MediaLibraryList
              media={displayedList}
              loading={loading}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onItemClick={(m) => setSelectedMedia(m)}
              onDelete={() => setRefreshTrigger((prev) => prev + 1)}
            />
          )}
        </div>

        {/* Right: Upload (1/3) */}
        <div className="col-span-1">
          <ImageUpload
            onUploadComplete={() => setRefreshTrigger((prev) => prev + 1)}
            onError={(error) => alert(error.message)}
          />
        </div>
      </div>

      {/* Preview Modal */}
      {selectedMedia && (
        <ImagePreviewModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onUpdate={(m) => {
            setSelectedMedia(m);
            setRefreshTrigger((prev) => prev + 1);
          }}
          onDelete={() => {
            setSelectedMedia(null);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
