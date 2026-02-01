"use client";

import { Layout, LayoutGrid, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaxonomyMultiSelect, type TaxonomyMultiSelectOption } from "./TaxonomyMultiSelect";

export type SortType =
  | "name-asc"
  | "name-desc"
  | "date-newest"
  | "date-oldest"
  | "size-smallest"
  | "size-largest";

export interface MediaFilterBarProps {
  /** Line 2: search by name, slug, or filename */
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortType;
  onSortChange: (value: SortType) => void;
  view: "list" | "grid";
  onViewChange: (view: "list" | "grid") => void;
  /** Line 1: taxonomy filters */
  filterCategories?: TaxonomyMultiSelectOption[];
  filterTags?: TaxonomyMultiSelectOption[];
  selectedCategoryIds?: Set<string>;
  selectedTagIds?: Set<string>;
  onCategoryToggle?: (id: string, checked: boolean) => void;
  onTagToggle?: (id: string, checked: boolean) => void;
  onResetFilters?: () => void;
}

export function MediaFilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  filterCategories = [],
  filterTags = [],
  selectedCategoryIds = new Set(),
  selectedTagIds = new Set(),
  onCategoryToggle,
  onTagToggle,
  onResetFilters,
}: MediaFilterBarProps) {
  const hasFilters =
    selectedCategoryIds.size > 0 ||
    selectedTagIds.size > 0 ||
    search.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Line 1: Categories, Tags, Reset Filters */}
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

      {/* Line 2: Search, Sort, View toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Search by name, slug, or filename..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortType)}>
          <SelectTrigger className="w-40 h-9 shrink-0">
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
        <div className="flex gap-1 border rounded-md p-1 bg-muted shrink-0">
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
