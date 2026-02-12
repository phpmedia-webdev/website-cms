"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Mag, MarketingList } from "@/lib/supabase/crm";
import type { TaxonomyTerm } from "@/types/taxonomy";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";

interface ContactsListFiltersProps {
  selectedStatus: string;
  onSelectedStatusChange: (value: string) => void;
  selectedMagId: string;
  onSelectedMagIdChange: (value: string) => void;
  selectedListId: string;
  onSelectedListIdChange: (value: string) => void;
  selectedCategoryId: string;
  onSelectedCategoryIdChange: (value: string) => void;
  selectedTagId: string;
  onSelectedTagIdChange: (value: string) => void;
  resetFilters: () => void;
  hasFilters: boolean;
  contactStatuses: CrmContactStatusOption[];
  mags: Mag[];
  marketingLists: MarketingList[];
  categories: TaxonomyTerm[];
  tags: TaxonomyTerm[];
}

const selectClass =
  "h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

/**
 * Filter row for contacts list: status, membership, list, category, tag + Clear all.
 */
export function ContactsListFilters({
  selectedStatus,
  onSelectedStatusChange,
  selectedMagId,
  onSelectedMagIdChange,
  selectedListId,
  onSelectedListIdChange,
  selectedCategoryId,
  onSelectedCategoryIdChange,
  selectedTagId,
  onSelectedTagIdChange,
  resetFilters,
  hasFilters,
  contactStatuses,
  mags,
  marketingLists,
  categories,
  tags,
}: ContactsListFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectClass} value={selectedStatus} onChange={(e) => onSelectedStatusChange(e.target.value)}>
          <option value="">All Statuses</option>
          {contactStatuses.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={selectedMagId} onChange={(e) => onSelectedMagIdChange(e.target.value)}>
          <option value="">All Memberships</option>
          {mags.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select className={selectClass} value={selectedListId} onChange={(e) => onSelectedListIdChange(e.target.value)}>
          <option value="">All Lists</option>
          {marketingLists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={selectedCategoryId}
          onChange={(e) => onSelectedCategoryIdChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={selectClass} value={selectedTagId} onChange={(e) => onSelectedTagIdChange(e.target.value)}>
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs shrink-0">
          <X className="h-3 w-3 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
}
