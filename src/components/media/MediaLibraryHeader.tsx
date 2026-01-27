"use client";

import { Layout, LayoutGrid, Loader2, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFileSize } from "@/lib/media/image-optimizer";
import { TaxonomyMultiSelect, type TaxonomyMultiSelectOption } from "./TaxonomyMultiSelect";

export type ViewMode = "images" | "videos" | "all";

export type SortType = "name-asc" | "name-desc" | "date-newest" | "date-oldest" | "size-smallest" | "size-largest";

interface MediaLibraryHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  view: "list" | "grid";
  onViewChange: (view: "list" | "grid") => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: SortType;
  onSortChange: (sort: SortType) => void;
  totalSize: number;
  totalItems: number;
  isLoadingStats: boolean;
  onUploadClick?: () => void;
  /** Taxonomy filter row (above search) */
  filterCategories?: TaxonomyMultiSelectOption[];
  filterTags?: TaxonomyMultiSelectOption[];
  selectedCategoryIds?: Set<string>;
  selectedTagIds?: Set<string>;
  onCategoryToggle?: (id: string, checked: boolean) => void;
  onTagToggle?: (id: string, checked: boolean) => void;
  onResetFilters?: () => void;
}

function itemLabel(mode: ViewMode, count: number): string {
  if (mode === "images") return count === 1 ? "image" : "images";
  if (mode === "videos") return count === 1 ? "video" : "videos";
  return count === 1 ? "item" : "items";
}

export function MediaLibraryHeader({
  viewMode,
  onViewModeChange,
  view,
  onViewChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  totalSize,
  totalItems,
  isLoadingStats,
  onUploadClick,
  filterCategories = [],
  filterTags = [],
  selectedCategoryIds = new Set(),
  selectedTagIds = new Set(),
  onCategoryToggle,
  onTagToggle,
  onResetFilters,
}: MediaLibraryHeaderProps) {
  const hasFilters =
    selectedCategoryIds.size > 0 || selectedTagIds.size > 0 || search.trim().length > 0;

  return (
    <div className="space-y-4 pb-4 border-b">
      {/* Title, View Mode, Upload Media — same line */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold shrink-0">Media Library</h1>
        <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <SelectTrigger className="w-36 h-9 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="images">Images</SelectItem>
            <SelectItem value="videos">Videos</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        {onUploadClick && (
          <Button onClick={onUploadClick} size="sm" className="shrink-0">
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </Button>
        )}
      </div>
      {/* Stats */}
      <p className="text-sm text-muted-foreground">
        {isLoadingStats ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading stats...
          </span>
        ) : (
          <>
            {totalItems} {itemLabel(viewMode, totalItems)} •{" "}
            {formatFileSize(totalSize)} used
          </>
        )}
      </p>

      {/* Filter row: Categories, Tags, Reset Filters — above search */}
      {(filterCategories.length > 0 || filterTags.length > 0 || onResetFilters) && (
        <div className="flex flex-wrap items-center gap-2">
          {filterCategories.length > 0 && onCategoryToggle && (
            <TaxonomyMultiSelect
              label="Categories"
              options={filterCategories}
              selectedIds={selectedCategoryIds}
              onToggle={onCategoryToggle}
              placeholder="All categories"
            />
          )}
          {filterTags.length > 0 && onTagToggle && (
            <TaxonomyMultiSelect
              label="Tags"
              options={filterTags}
              selectedIds={selectedTagIds}
              onToggle={onTagToggle}
              placeholder="All tags"
            />
          )}
          {onResetFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onResetFilters}
              disabled={!hasFilters}
              title="Reset categories, tags, and search"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset Filters
            </Button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search by name, slug, or filename..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Sort */}
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A → Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z → A)</SelectItem>
            <SelectItem value="date-newest">Newest First</SelectItem>
            <SelectItem value="date-oldest">Oldest First</SelectItem>
            <SelectItem value="size-smallest">Smallest First</SelectItem>
            <SelectItem value="size-largest">Largest First</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex gap-1 border rounded-md p-1 bg-muted">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onViewChange("list")}
            title="List view"
          >
            <Layout className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onViewChange("grid")}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
