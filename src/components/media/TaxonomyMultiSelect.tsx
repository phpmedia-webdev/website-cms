"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface TaxonomyMultiSelectOption {
  id: string;
  name: string;
}

interface TaxonomyMultiSelectProps {
  label: string;
  options: TaxonomyMultiSelectOption[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  placeholder?: string;
  className?: string;
}

export function TaxonomyMultiSelect({
  label,
  options,
  selectedIds,
  onToggle,
  placeholder = "None",
  className,
}: TaxonomyMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const count = selectedIds.size;
  const display =
    count === 0 ? placeholder : count === 1 ? "1 selected" : `${count} selected`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 min-w-[7rem] justify-between gap-1"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {label}: {display}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 opacity-50", open && "rotate-180")}
        />
      </Button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{placeholder}</p>
          ) : (
            <div className="p-1">
              {options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                  role="option"
                  aria-selected={selectedIds.has(opt.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(opt.id)}
                    onCheckedChange={(c) => onToggle(opt.id, c === true)}
                    onClick={(e) => e.stopPropagation()}
                    aria-hidden
                  />
                  <span className="truncate">{opt.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
