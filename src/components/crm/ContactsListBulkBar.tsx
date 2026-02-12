"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash2, ChevronDown } from "lucide-react";
import type { RefObject } from "react";

interface ContactsListBulkBarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  showTrashed: boolean;
  onShowTrashedChange: (show: boolean) => void;
  hasTrashedContacts: boolean;
  trashedCount: number;
  hasSelection: boolean;
  bulkMenuOpen: boolean;
  onBulkMenuOpenChange: (open: boolean) => void;
  bulkMenuRef: RefObject<HTMLDivElement | null>;
  onExport: () => void;
  onAddToList: () => void;
  onRemoveFromList: () => void;
  onSetCrmFields: () => void;
  onTaxonomy: () => void;
  onTrash: () => void;
  onRestore: () => void;
  restoreLoading: boolean;
  onEmptyTrash: () => void;
}

/**
 * Second toolbar row for contacts list: search, Show trash / Show active, Bulk actions dropdown.
 */
export function ContactsListBulkBar({
  searchQuery,
  onSearchQueryChange,
  showTrashed,
  onShowTrashedChange,
  hasTrashedContacts,
  trashedCount,
  hasSelection,
  bulkMenuOpen,
  onBulkMenuOpenChange,
  bulkMenuRef,
  onExport,
  onAddToList,
  onRemoveFromList,
  onSetCrmFields,
  onTaxonomy,
  onTrash,
  onRestore,
  restoreLoading,
  onEmptyTrash,
}: ContactsListBulkBarProps) {
  const closeAnd = (fn: () => void) => {
    onBulkMenuOpenChange(false);
    fn();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search name, email, phone…"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-7 h-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        {hasTrashedContacts && !showTrashed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            onClick={() => onShowTrashedChange(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Show trash ({trashedCount})
          </Button>
        )}
        {showTrashed && (
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onShowTrashedChange(false)}>
            Show active contacts
          </Button>
        )}
        <div className="relative" ref={bulkMenuRef}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            disabled={!hasSelection}
            onClick={() => hasSelection && onBulkMenuOpenChange(!bulkMenuOpen)}
            aria-expanded={bulkMenuOpen}
            aria-haspopup="true"
            aria-label="Bulk actions"
          >
            Bulk actions
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
          {bulkMenuOpen && hasSelection && (
            <ul
              className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border bg-background py-1 shadow-md"
              role="menu"
            >
              <li role="none">
                <button type="button" role="menuitem" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => closeAnd(onExport)}>
                  Export
                </button>
              </li>
              <li role="none">
                <button type="button" role="menuitem" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => closeAnd(onAddToList)}>
                  Add to list
                </button>
              </li>
              <li role="none">
                <button type="button" role="menuitem" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => closeAnd(onRemoveFromList)}>
                  Remove from list
                </button>
              </li>
              <li role="none">
                <button type="button" role="menuitem" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => closeAnd(onSetCrmFields)}>
                  Set CRM Fields
                </button>
              </li>
              <li role="none">
                <button type="button" role="menuitem" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => closeAnd(onTaxonomy)}>
                  Taxonomy
                </button>
              </li>
              <li role="none">
                <button type="button" role="menuitem" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => closeAnd(onTrash)}>
                  Delete
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  onClick={onRestore}
                  disabled={restoreLoading || !showTrashed}
                >
                  {restoreLoading ? "Restoring…" : "Restore"}
                </button>
              </li>
              <li role="separator" className="my-1 border-t" />
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
                  disabled={!hasTrashedContacts}
                  onClick={() => closeAnd(onEmptyTrash)}
                >
                  Empty trash
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
