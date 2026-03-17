"use client";

import type { TaxonomyTermDisplay } from "@/lib/supabase/taxonomy";

interface TaxonomyChipsProps {
  categories: TaxonomyTermDisplay[];
  tags: TaxonomyTermDisplay[];
  /** Optional class for the container. */
  className?: string;
}

/**
 * Renders assigned categories and tags as chips with optional taxonomy color.
 */
export function TaxonomyChips({ categories, tags, className = "" }: TaxonomyChipsProps) {
  const terms = [...categories, ...tags];
  if (terms.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {terms.map((term) => {
        const bg = term.color ?? undefined;
        const style = bg
          ? { backgroundColor: bg, color: "#fff", border: "none" }
          : undefined;
        return (
          <span
            key={term.id}
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border border-border bg-muted"
            style={style}
          >
            {term.name}
          </span>
        );
      })}
    </div>
  );
}
