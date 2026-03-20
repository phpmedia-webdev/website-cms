"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { normalizeHex } from "@/lib/event-type-colors";

export interface TaskFilterOption {
  id: string;
  name: string;
  /** When set and showColorDotInMenu, rendered only inside the dropdown (not on the trigger). */
  color?: string | null;
}

interface TaskFilterMultiSelectProps {
  label: string;
  options: TaskFilterOption[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  /** "All" when nothing selected (or use custom empty label). */
  allPlaceholder?: string;
  className?: string;
  /** Show a color dot before each label inside the menu (Customizer type/status/phase). */
  showColorDotInMenu?: boolean;
}

const DOT_FALLBACK = "#94a3b8";

export function TaskFilterMultiSelect({
  label,
  options,
  selectedIds,
  onToggle,
  allPlaceholder = "All",
  className,
  showColorDotInMenu = false,
}: TaskFilterMultiSelectProps) {
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
    count === 0 ? allPlaceholder : count === 1 ? "1 selected" : `${count} selected`;

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full min-w-0 justify-between gap-1"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {label}: {display}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50", open && "rotate-180")} />
      </Button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-56 min-w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No options</p>
          ) : (
            <div className="p-1">
              {options.map((opt) => {
                const dotColor =
                  showColorDotInMenu && opt.color != null && String(opt.color).trim()
                    ? normalizeHex(String(opt.color))
                    : null;
                return (
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
                    {showColorDotInMenu && (
                      <span
                        className="size-2.5 shrink-0 rounded-full border border-black/15 dark:border-white/25"
                        style={{
                          backgroundColor: dotColor ?? DOT_FALLBACK,
                        }}
                        aria-hidden
                      />
                    )}
                    <span className="truncate">{opt.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
