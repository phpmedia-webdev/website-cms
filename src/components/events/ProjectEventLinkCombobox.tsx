"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";

export interface ProjectLinkOption {
  id: string;
  name: string;
  status_slug?: string | null;
}

interface ProjectEventLinkComboboxProps {
  /** HTML id for label association */
  htmlId?: string;
  value: string | null;
  onValueChange: (projectId: string | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable single-select for linking an event to a project.
 * Options come from GET /api/projects?for_event_link=true (status slugs complete/archived excluded).
 * If the current value is not in that list (e.g. legacy link to a completed project), name is loaded via GET /api/projects/[id].
 */
export function ProjectEventLinkCombobox({
  htmlId,
  value,
  onValueChange,
  disabled = false,
  className,
}: ProjectEventLinkComboboxProps) {
  const [options, setOptions] = useState<ProjectLinkOption[]>([]);
  const [orphanLabel, setOrphanLabel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/projects?for_event_link=true")
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: { projects?: ProjectLinkOption[] }) =>
        setOptions(Array.isArray(j.projects) ? j.projects : [])
      )
      .catch(() => setOptions([]));
  }, []);

  useEffect(() => {
    if (!value) {
      setOrphanLabel(null);
      return;
    }
    if (options.some((o) => o.id === value)) {
      setOrphanLabel(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/projects/${encodeURIComponent(value)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { name?: string } | null) => {
        if (cancelled) return;
        if (p?.name) setOrphanLabel(String(p.name));
        else setOrphanLabel("Unknown project");
      })
      .catch(() => {
        if (!cancelled) setOrphanLabel("Unknown project");
      });
    return () => {
      cancelled = true;
    };
  }, [value, options]);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    const o = options.find((x) => x.id === value);
    if (o) return o.name;
    return orphanLabel ?? "";
  }, [value, options, orphanLabel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const selectProject = useCallback(
    (id: string | null) => {
      onValueChange(id);
      setQuery("");
      setOpen(false);
    },
    [onValueChange]
  );

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

  return (
    <div ref={containerRef} className={cn("relative space-y-1", className)}>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          id={htmlId}
          disabled={disabled}
          className={cn(
            "h-9 flex-1 min-w-0 justify-between px-3 font-normal",
            !value && "text-muted-foreground"
          )}
          onClick={() => !disabled && setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="truncate text-left">
            {value ? selectedLabel || "Loading…" : "Search projects…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => selectProject(null)}
            aria-label="Clear project"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {open && !disabled && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          <div className="border-b p-2">
            <Input
              placeholder="Type to filter…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
              autoFocus
              aria-label="Filter projects"
            />
          </div>
          <ul className="max-h-52 overflow-auto p-1">
            <li>
              <button
                type="button"
                role="option"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => selectProject(null)}
              >
                {!value && <Check className="mr-2 h-4 w-4 shrink-0" />}
                {value && <span className="mr-2 w-4 shrink-0" />}
                <span className="text-muted-foreground">No project</span>
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                No matching projects
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    className={cn(
                      "flex w-full min-w-0 items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                      value === o.id && "bg-accent"
                    )}
                    onClick={() => selectProject(o.id)}
                  >
                    {value === o.id ? (
                      <Check className="mr-2 h-4 w-4 shrink-0" />
                    ) : (
                      <span className="mr-2 w-4 shrink-0" />
                    )}
                    <span className="truncate">{o.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
