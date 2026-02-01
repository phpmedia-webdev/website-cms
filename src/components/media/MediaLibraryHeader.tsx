"use client";

import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFileSize } from "@/lib/media/image-optimizer";
import type { TaxonomyMultiSelectOption } from "./TaxonomyMultiSelect";
import { MediaFilterBar, type SortType } from "./MediaFilterBar";

export type ViewMode = "images" | "videos" | "all";

export type { SortType } from "./MediaFilterBar";

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

      {/* Filter bar: Line 1 = Categories, Tags, Reset; Line 2 = Search, Sort, View */}
      <MediaFilterBar
        search={search}
        onSearchChange={onSearchChange}
        sort={sort}
        onSortChange={onSortChange}
        view={view}
        onViewChange={onViewChange}
        filterCategories={filterCategories}
        filterTags={filterTags}
        selectedCategoryIds={selectedCategoryIds}
        selectedTagIds={selectedTagIds}
        onCategoryToggle={onCategoryToggle}
        onTagToggle={onTagToggle}
        onResetFilters={onResetFilters}
      />
    </div>
  );
}
