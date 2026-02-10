"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Trash2, X } from "lucide-react";
import { MediaWithVariants } from "@/types/media";
import { getMediaWithVariants, getMediaStats, deleteMedia } from "@/lib/supabase/media";
import {
  getTaxonomyTermsClient,
  getSectionConfigsClient,
  getMediaTaxonomyRelationships,
  getTermsForMediaViewMode,
} from "@/lib/supabase/taxonomy";
import type { TaxonomyTerm } from "@/types/taxonomy";
import { ImageList } from "./ImageList";
import { MediaLibraryList } from "./MediaLibraryList";
import { MediaLibraryHeader, type ViewMode } from "./MediaLibraryHeader";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { MediaFileUpload } from "./MediaFileUpload";
import { AddVideoUrlForm } from "./AddVideoUrlForm";

type SortType = "name-asc" | "name-desc" | "date-newest" | "date-oldest" | "size-smallest" | "size-largest";

export function MediaLibraryWrapper() {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [configs, setConfigs] = useState<Awaited<ReturnType<typeof getSectionConfigsClient>>>([]);
  const [mediaTermIds, setMediaTermIds] = useState<Map<string, Set<string>>>(new Map());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [mediaIdsWithMembership, setMediaIdsWithMembership] = useState<Set<string>>(new Set());
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

  // Load taxonomy terms and section configs
  useEffect(() => {
    (async () => {
      try {
        const [t, c] = await Promise.all([
          getTaxonomyTermsClient(),
          getSectionConfigsClient(),
        ]);
        setTerms(t);
        setConfigs(c);
      } catch (e) {
        console.error("Error loading taxonomy:", e);
      }
    })();
  }, []);

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
      const rels = await getMediaTaxonomyRelationships(allMedia.map((m) => m.id));
      const map = new Map<string, Set<string>>();
      for (const r of rels) {
        const set = map.get(r.content_id) ?? new Set<string>();
        set.add(r.term_id);
        map.set(r.content_id, set);
      }
      setMediaTermIds(map);
    } catch (error) {
      console.error("Error loading media:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply view mode (type), search, and sort
  useEffect(() => {
    let filtered = media;

    // Filter by view mode (images / videos / all)
    if (viewMode === "images") {
      filtered = filtered.filter((item) => item.media_type === "image");
    } else if (viewMode === "videos") {
      filtered = filtered.filter((item) => item.media_type === "video");
    }

    // Filter by search
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.slug.toLowerCase().includes(search.toLowerCase()) ||
        item.original_filename.toLowerCase().includes(search.toLowerCase())
    );

    // Filter by taxonomy (categories AND tags)
    const hasCat = selectedCategoryIds.size > 0;
    const hasTag = selectedTagIds.size > 0;
    if (hasCat || hasTag) {
      filtered = filtered.filter((item) => {
        const termIds = mediaTermIds.get(item.id);
        if (!termIds || termIds.size === 0) return !hasCat && !hasTag;
        const matchCat = !hasCat || [...selectedCategoryIds].some((id) => termIds.has(id));
        const matchTag = !hasTag || [...selectedTagIds].some((id) => termIds.has(id));
        return matchCat && matchTag;
      });
    }

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
  }, [
    media,
    viewMode,
    search,
    sort,
    displayLimit,
    selectedCategoryIds,
    selectedTagIds,
    mediaTermIds,
  ]);

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

  // Fetch which displayed media have membership (for M badge)
  useEffect(() => {
    const ids = displayedMedia.slice(0, displayLimit).map((m) => m.id);
    if (ids.length === 0) {
      setMediaIdsWithMembership(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/media/membership-ids?ids=${encodeURIComponent(ids.join(","))}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setMediaIdsWithMembership(new Set((data.media_ids as string[]) ?? []));
      } catch {
        if (!cancelled) setMediaIdsWithMembership(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [displayedMedia, displayLimit]);

  // Persist view and viewMode preferences
  useEffect(() => {
    const savedView = localStorage.getItem("mediaLibraryView");
    if (savedView === "list" || savedView === "grid") setView(savedView);
    const savedMode = localStorage.getItem("mediaLibraryViewMode");
    if (savedMode === "images" || savedMode === "videos" || savedMode === "all") setViewMode(savedMode);
  }, []);

  useEffect(() => {
    localStorage.setItem("mediaLibraryView", view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem("mediaLibraryViewMode", viewMode);
  }, [viewMode]);

  // Escape to close upload modal
  useEffect(() => {
    if (!uploadModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUploadModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [uploadModalOpen]);

  const { categories: filterCategories, tags: filterTags } = getTermsForMediaViewMode(
    terms,
    configs,
    viewMode
  );

  const handleCategoryToggle = (id: string, checked: boolean) => {
    const next = new Set(selectedCategoryIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedCategoryIds(next);
  };

  const handleTagToggle = (id: string, checked: boolean) => {
    const next = new Set(selectedTagIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedTagIds(next);
  };

  const handleResetFilters = () => {
    setSelectedCategoryIds(new Set());
    setSelectedTagIds(new Set());
    setSearch("");
  };

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
        `Delete ${selectedIds.size} ${selectedIds.size === 1 ? "item" : "items"} and all their variants? This cannot be undone.`
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        totalSize={totalSize}
        totalItems={displayedMedia.length}
        isLoadingStats={isLoadingStats}
        onUploadClick={() => setUploadModalOpen(true)}
        filterCategories={filterCategories.map((t) => ({ id: t.id, name: t.name }))}
        filterTags={filterTags.map((t) => ({ id: t.id, name: t.name }))}
        selectedCategoryIds={selectedCategoryIds}
        selectedTagIds={selectedTagIds}
        onCategoryToggle={handleCategoryToggle}
        onTagToggle={handleTagToggle}
        onResetFilters={handleResetFilters}
      />

      {/* Main Content: Full-width grid or list */}
      <div className="space-y-3">
        {/* Bulk Delete Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium flex-1">
              {selectedIds.size} {selectedIds.size === 1 ? "item" : "items"} selected
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
              media={displayedList}
              loading={loading}
              onSelect={(m) => setSelectedMedia(m)}
              mediaIdsWithMembership={mediaIdsWithMembership}
            />
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
            mediaIdsWithMembership={mediaIdsWithMembership}
          />
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setUploadModalOpen(false)}
        >
          <Card
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="font-semibold">
                {uploadMode === "file" ? "Upload Media" : "Add Video URL"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setUploadModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2 border-b pb-2">
                <Button
                  type="button"
                  variant={uploadMode === "file" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setUploadMode("file")}
                >
                  Upload file
                </Button>
                <Button
                  type="button"
                  variant={uploadMode === "url" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setUploadMode("url")}
                >
                  Add Video URL
                </Button>
              </div>
              {uploadMode === "file" ? (
                <MediaFileUpload
                  onUploadComplete={() => {
                    setRefreshTrigger((prev) => prev + 1);
                    setUploadModalOpen(false);
                  }}
                  onError={(err) => alert(err.message)}
                />
              ) : (
                <AddVideoUrlForm
                  onSuccess={() => {
                    setRefreshTrigger((prev) => prev + 1);
                    setUploadModalOpen(false);
                  }}
                  onError={(err) => alert(err.message)}
                />
              )}
            </div>
          </Card>
        </div>
      )}

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
