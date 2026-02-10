"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaxonomyMultiSelect, type TaxonomyMultiSelectOption } from "@/components/media/TaxonomyMultiSelect";

export interface EventsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterCategories?: TaxonomyMultiSelectOption[];
  filterTags?: TaxonomyMultiSelectOption[];
  filterMemberships?: { id: string; name: string }[];
  selectedCategoryIds?: Set<string>;
  selectedTagIds?: Set<string>;
  selectedMembershipIds?: Set<string>;
  onCategoryToggle?: (id: string, checked: boolean) => void;
  onTagToggle?: (id: string, checked: boolean) => void;
  onMembershipToggle?: (id: string, checked: boolean) => void;
  onReset?: () => void;
}

export function EventsFilterBar({
  search,
  onSearchChange,
  filterCategories = [],
  filterTags = [],
  filterMemberships = [],
  selectedCategoryIds = new Set(),
  selectedTagIds = new Set(),
  selectedMembershipIds = new Set(),
  onCategoryToggle,
  onTagToggle,
  onMembershipToggle,
  onReset,
}: EventsFilterBarProps) {
  const hasFilters =
    search.trim().length > 0 ||
    selectedCategoryIds.size > 0 ||
    selectedTagIds.size > 0 ||
    selectedMembershipIds.size > 0;

  const magOptions: TaxonomyMultiSelectOption[] = filterMemberships.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  return (
    <div className="space-y-3">
      {/* Row 1: Search | Reset (right justified) */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 flex-1 min-w-0"
          aria-label="Search events"
        />
        {onReset && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={onReset}
            disabled={!hasFilters}
            title="Reset search and filters"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Row 2: Categories, Tags, Memberships */}
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
        {onTagToggle && (
          <TaxonomyMultiSelect
            label="Tags"
            options={filterTags}
            selectedIds={selectedTagIds}
            onToggle={onTagToggle}
            placeholder="All tags"
          />
        )}
        {filterMemberships.length > 0 && onMembershipToggle && (
          <TaxonomyMultiSelect
            label="Memberships"
            options={magOptions}
            selectedIds={selectedMembershipIds}
            onToggle={onMembershipToggle}
            placeholder="All memberships"
          />
        )}
      </div>
    </div>
  );
}
