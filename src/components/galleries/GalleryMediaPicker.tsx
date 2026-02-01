"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Loader2, Video, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaWithVariants } from "@/types/media";
import {
  getTaxonomyTermsClient,
  getSectionConfigsClient,
  getTermsForMediaViewMode,
  getMediaTaxonomyRelationships,
} from "@/lib/supabase/taxonomy";
import { MediaFilterBar, type SortType } from "@/components/media/MediaFilterBar";
import Image from "next/image";

interface GalleryMediaPickerProps {
  media: MediaWithVariants[];
  loading?: boolean;
  mode: "gallery" | "cover";
  /** IDs of media already in the gallery (for checkmark badges) */
  alreadyInGalleryIds?: Set<string>;
  onAddToGallery?: (mediaIds: string[]) => void;
  onSelectCover?: (media: MediaWithVariants) => void;
  onCancel: () => void;
  isAdding?: boolean;
}

export function GalleryMediaPicker({
  media,
  loading = false,
  mode,
  alreadyInGalleryIds = new Set(),
  onAddToGallery,
  onSelectCover,
  onCancel,
  isAdding = false,
}: GalleryMediaPickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("date-newest");
  const [view, setView] = useState<"list" | "grid">("grid");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof getTaxonomyTermsClient>>>([]);
  const [configs, setConfigs] = useState<Awaited<ReturnType<typeof getSectionConfigsClient>>>([]);
  const [mediaTermIds, setMediaTermIds] = useState<Map<string, Set<string>>>(new Map());

  // Load taxonomy terms and section configs
  useEffect(() => {
    const loadTaxonomy = async () => {
      try {
        const [t, c] = await Promise.all([
          getTaxonomyTermsClient(),
          getSectionConfigsClient(),
        ]);
        setTerms(t);
        setConfigs(c);
      } catch (error) {
        console.error("Error loading taxonomy:", error);
      }
    };
    loadTaxonomy();
  }, []);

  // Load taxonomy relationships for all media
  useEffect(() => {
    const loadRelationships = async () => {
      if (media.length === 0) return;
      try {
        const rels = await getMediaTaxonomyRelationships(media.map((m) => m.id));
        const map = new Map<string, Set<string>>();
        rels.forEach((rel) => {
          const set = map.get(rel.content_id) ?? new Set<string>();
          set.add(rel.term_id);
          map.set(rel.content_id, set);
        });
        setMediaTermIds(map);
      } catch (error) {
        console.error("Error loading media taxonomy relationships:", error);
      }
    };
    loadRelationships();
  }, [media]);

  const { categories: filterCategories, tags: filterTags } = useMemo(
    () => getTermsForMediaViewMode(terms, configs, "all"),
    [terms, configs]
  );

  // Filter and sort (same logic as MediaLibraryWrapper)
  const filteredMedia = useMemo(() => {
    let filtered = media;

    // Search by name, slug, or filename
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          (item.original_filename || "").toLowerCase().includes(q)
      );
    }

    // Taxonomy: categories AND tags (must match selected categories and selected tags)
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

    // Sort
    const sorted = [...filtered];
    switch (sort) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "date-newest":
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "date-oldest":
        sorted.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "size-smallest":
        sorted.sort((a, b) => {
          const aSize = a.variants.reduce((sum, v) => sum + (v.size_bytes || 0), 0);
          const bSize = b.variants.reduce((sum, v) => sum + (v.size_bytes || 0), 0);
          return aSize - bSize;
        });
        break;
      case "size-largest":
        sorted.sort((a, b) => {
          const aSize = a.variants.reduce((sum, v) => sum + (v.size_bytes || 0), 0);
          const bSize = b.variants.reduce((sum, v) => sum + (v.size_bytes || 0), 0);
          return bSize - aSize;
        });
        break;
    }
    return sorted;
  }, [media, search, sort, selectedCategoryIds, selectedTagIds, mediaTermIds]);

  const handleItemClick = useCallback(
    (item: MediaWithVariants, index: number, ev?: React.MouseEvent) => {
      if (mode === "cover") {
        onSelectCover?.(item);
        return;
      }
      const shiftKey = ev?.shiftKey ?? false;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const lastIndex = lastClickedIndexRef.current;
        if (lastIndex !== null && shiftKey) {
          const [lo, hi] = index < lastIndex ? [index, lastIndex] : [lastIndex, index];
          for (let i = lo; i <= hi; i++) {
            const m = filteredMedia[i];
            if (m && !alreadyInGalleryIds.has(m.id)) next.add(m.id);
          }
        } else {
          if (alreadyInGalleryIds.has(item.id)) return prev;
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          lastClickedIndexRef.current = index;
        }
        return next;
      });
    },
    [mode, filteredMedia, alreadyInGalleryIds, onSelectCover]
  );

  const handleAdd = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length > 0 && onAddToGallery) {
      onAddToGallery(ids);
      setSelectedIds(new Set());
    }
  }, [selectedIds, onAddToGallery]);

  const handleCategoryToggle = useCallback((id: string, checked: boolean) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleTagToggle = useCallback((id: string, checked: boolean) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setSelectedCategoryIds(new Set());
    setSelectedTagIds(new Set());
  }, []);

  const selectableCount = filteredMedia.filter((m) => !alreadyInGalleryIds.has(m.id)).length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Loading media...</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No media found. Upload media to get started.</p>
      </div>
    );
  }

  const renderItem = (item: MediaWithVariants, index: number) => {
    const thumbnail = item.variants.find((v) => v.variant_type === "thumbnail");
    const original = item.variants.find((v) => v.variant_type === "original");
    const displayUrl = thumbnail?.url || original?.url || "";
    const isSelected = selectedIds.has(item.id);
    const isInGallery = alreadyInGalleryIds.has(item.id);
    const isSelectable = mode === "cover" || !isInGallery;

    return (
      <Card
        key={item.id}
        role="option"
        aria-selected={isSelected}
        className={`relative cursor-pointer overflow-hidden transition-all ${
          isSelectable ? "hover:ring-2 hover:ring-primary" : "opacity-75 cursor-default"
        } ${isSelected ? "ring-2 ring-primary" : ""}`}
        onClick={(e) => isSelectable && handleItemClick(item, index, e)}
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
              <span className="text-xs truncate px-2 max-w-full">Video</span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground px-2 truncate max-w-full">
                {item.name}
              </p>
            </div>
          )}
          {isInGallery && (
            <Badge
              variant="secondary"
              className="absolute top-1.5 right-1.5 h-6 px-1.5 bg-green-600 text-white hover:bg-green-600 border-0"
            >
              <Check className="h-3.5 w-3.5" />
            </Badge>
          )}
          {isSelected && !isInGallery && (
            <div className="absolute inset-0 ring-2 ring-primary ring-inset bg-primary/10" />
          )}
        </div>
        <p
          className="text-xs text-foreground truncate px-2 py-1.5 border-t bg-background"
          title={item.name}
        >
          {item.name}
        </p>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Reuse Media Library filter bar: Line 1 = Categories, Tags, Reset; Line 2 = Search, Sort, View */}
      <MediaFilterBar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        filterCategories={filterCategories.map((t) => ({ id: t.id, name: t.name }))}
        filterTags={filterTags.map((t) => ({ id: t.id, name: t.name }))}
        selectedCategoryIds={selectedCategoryIds}
        selectedTagIds={selectedTagIds}
        onCategoryToggle={handleCategoryToggle}
        onTagToggle={handleTagToggle}
        onResetFilters={handleResetFilters}
      />

      {mode === "gallery" && (
        <p className="text-sm text-muted-foreground">
          Click to select, Shift+click to select a range. Items with a checkmark are already in this gallery.
        </p>
      )}

      <div className="max-h-[400px] overflow-y-auto rounded-md border p-2" role="listbox">
        {filteredMedia.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No media matches your filters. Try adjusting your search or taxonomy filters.
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredMedia.map((item, index) => renderItem(item, index))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredMedia.map((item, index) => {
              const thumb = item.variants.find((v) => v.variant_type === "thumbnail");
              const orig = item.variants.find((v) => v.variant_type === "original");
              const url = thumb?.url || orig?.url || "";
              const isSelected = selectedIds.has(item.id);
              const isInGallery = alreadyInGalleryIds.has(item.id);
              const isSelectable = mode === "cover" || !isInGallery;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`flex items-center gap-3 rounded-md border p-2 transition-all ${
                    isSelectable ? "hover:bg-muted/60 cursor-pointer" : "opacity-75 cursor-default"
                  } ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  onClick={(e) => isSelectable && handleItemClick(item, index, e)}
                >
                  <div className="relative h-10 w-10 shrink-0 rounded bg-muted overflow-hidden">
                    {url ? (
                      <Image
                        src={url}
                        alt={item.alt_text || item.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : item.media_type === "video" ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <Video className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground truncate px-1 flex items-center justify-center h-full">
                        —
                      </span>
                    )}
                    {isInGallery && (
                      <Badge
                        variant="secondary"
                        className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 bg-green-600 text-white border-0"
                      >
                        <Check className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm truncate flex-1 min-w-0" title={item.name}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {mode === "gallery" && (
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
            {selectableCount < filteredMedia.length &&
              ` · ${filteredMedia.length - selectableCount} already in gallery`}
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          {mode === "gallery" && (
            <Button
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding…
                </>
              ) : (
                `Add ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`
              )}
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
