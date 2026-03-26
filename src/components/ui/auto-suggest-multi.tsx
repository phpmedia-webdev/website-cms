"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutoSuggestOption {
  id: string;
  label: string;
  /** Optional hidden search text (e.g. email) not shown in UI label. */
  searchText?: string;
}

export interface AutoSuggestGroup {
  heading: string;
  options: AutoSuggestOption[];
  /** Shown when this group has no entries (e.g. empty directory slice). */
  emptyLabel?: string;
}

function filterOptions(
  opts: AutoSuggestOption[],
  selectedIds: Set<string>,
  query: string
): AutoSuggestOption[] {
  return opts.filter((opt) => {
    if (selectedIds.has(opt.id)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${opt.label} ${opt.searchText ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}

type AutoSuggestMultiProps = {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  /** Optional: limit dropdown height (default max-h-48) */
  dropdownClassName?: string;
  /** When `1`, choosing an option replaces the selection (single-select). */
  maxSelections?: number;
} & (
  | {
      /** Flat list (default behavior). */
      options: AutoSuggestOption[];
      groups?: never;
    }
  | {
      options?: never;
      /** Section headers + lists (e.g. TEAM / CONTACTS). Each section shows emptyLabel when it has no options. */
      groups: AutoSuggestGroup[];
    }
);

const DEFAULT_GROUP_EMPTY = "- no users found -";

/**
 * Multi-select with type-to-filter (auto-suggest). Shows selected as removable badges.
 * Pass either `options` or `groups` (not both).
 */
export function AutoSuggestMulti({
  options: optionsProp,
  groups,
  selectedIds,
  onSelectionChange,
  placeholder = "Type to search...",
  label,
  className,
  dropdownClassName,
  maxSelections,
}: AutoSuggestMultiProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isGrouped = groups != null;
  const options = useMemo(
    () => (isGrouped ? groups!.flatMap((g) => g.options) : (optionsProp ?? [])),
    [isGrouped, groups, optionsProp]
  );

  const filtered = useMemo(
    () => filterOptions(options, selectedIds, query),
    [options, selectedIds, query]
  );

  const firstSelectableId = useMemo(() => {
    if (!isGrouped || !groups) return filtered[0]?.id;
    for (const g of groups) {
      const fg = filterOptions(g.options, selectedIds, query);
      if (fg[0]) return fg[0].id;
    }
    return undefined;
  }, [isGrouped, groups, selectedIds, query, filtered]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const add = (id: string) => {
    if (maxSelections === 1) {
      onSelectionChange(new Set([id]));
    } else {
      const next = new Set(selectedIds);
      next.add(id);
      onSelectionChange(next);
    }
    setQuery("");
  };

  const remove = (id: string) => {
    const next = new Set(selectedIds);
    next.delete(id);
    onSelectionChange(next);
  };

  const selectedInThisSection = options.filter((o) => selectedIds.has(o.id));

  const renderFlatDropdown = () => (
    <>
      {filtered.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          {query.trim() ? "No matches" : "No options"}
        </p>
      ) : (
        <ul className="p-1">
          {filtered.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => add(opt.id)}
                role="option"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const renderGroupedDropdown = () => (
    <div className="py-1">
      {groups!.map((group, groupIndex) => {
        const filteredG = filterOptions(group.options, selectedIds, query);
        const isEmptyGroup = group.options.length === 0;
        const noSelectable = !isEmptyGroup && filteredG.length === 0;
        const isOffsetSection = groupIndex > 0;
        return (
          <div
            key={group.heading}
            role="group"
            aria-label={group.heading}
            className={cn(
              "mb-1 last:mb-0",
              isOffsetSection && "mt-1.5 border-l-2 border-muted/70 pl-3 ml-2 mr-1"
            )}
          >
            <div
              className={cn(
                "mx-1 rounded-sm px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                "bg-muted/50",
                isOffsetSection && "bg-muted/70"
              )}
            >
              {group.heading}
            </div>
            {isEmptyGroup ? (
              <p
                className={cn(
                  "px-2 pb-1.5 pt-1 text-sm text-muted-foreground",
                  isOffsetSection && "pl-1"
                )}
              >
                {group.emptyLabel ?? DEFAULT_GROUP_EMPTY}
              </p>
            ) : noSelectable ? (
              <p
                className={cn(
                  "px-2 pb-1.5 pt-1 text-sm text-muted-foreground",
                  isOffsetSection && "pl-1"
                )}
              >
                {query.trim() ? "No matches" : "All selected"}
              </p>
            ) : (
              <ul className={cn("px-1 pb-0.5 pt-0.5", isOffsetSection && "pl-0.5")}>
                {filteredG.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => add(opt.id)}
                      role="option"
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={containerRef} className={cn("relative space-y-1", className)}>
      {label && (
        <p className="text-sm font-medium text-foreground">{label}</p>
      )}
      <div className="flex flex-wrap gap-1.5 rounded-md border bg-background px-2 py-1.5 min-h-9">
        {options
          .filter((opt) => selectedIds.has(opt.id))
          .map((opt) => (
            <Badge
              key={opt.id}
              variant="secondary"
              className="gap-0.5 pr-1 text-xs font-normal"
            >
              {opt.label}
              <button
                type="button"
                className="ml-0.5 rounded p-0.5 hover:bg-muted"
                onClick={() => remove(opt.id)}
                aria-label={`Remove ${opt.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // In forms (event create/edit), Enter should select the top match
            // instead of submitting the form while focus is in this combobox.
            e.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            const id = isGrouped ? firstSelectableId : filtered[0]?.id;
            if (id) add(id);
          }}
          placeholder={selectedInThisSection.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[8rem] border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
          aria-autocomplete="list"
          aria-expanded={open}
          role="combobox"
        />
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-0.5 w-full min-w-[12rem] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md",
            dropdownClassName ?? "max-h-48"
          )}
          role="listbox"
        >
          {isGrouped ? renderGroupedDropdown() : renderFlatDropdown()}
        </div>
      )}
    </div>
  );
}
