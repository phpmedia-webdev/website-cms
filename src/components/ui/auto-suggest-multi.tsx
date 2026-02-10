"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutoSuggestOption {
  id: string;
  label: string;
}

interface AutoSuggestMultiProps {
  options: AutoSuggestOption[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  /** Optional: limit dropdown height (default max-h-48) */
  dropdownClassName?: string;
}

/**
 * Multi-select with type-to-filter (auto-suggest). Shows selected as removable badges.
 */
export function AutoSuggestMulti({
  options,
  selectedIds,
  onSelectionChange,
  placeholder = "Type to search...",
  label,
  className,
  dropdownClassName,
}: AutoSuggestMultiProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((opt) => {
    if (selectedIds.has(opt.id)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return opt.label.toLowerCase().includes(q);
  });

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
    const next = new Set(selectedIds);
    next.add(id);
    onSelectionChange(next);
    setQuery("");
  };

  const remove = (id: string) => {
    const next = new Set(selectedIds);
    next.delete(id);
    onSelectionChange(next);
  };

  const selectedInThisSection = options.filter((o) => selectedIds.has(o.id));

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
        </div>
      )}
    </div>
  );
}
