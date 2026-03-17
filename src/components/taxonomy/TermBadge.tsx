"use client";

/** Single term with id, name, optional color (e.g. status/type from taxonomy). */
export interface TermBadgeTerm {
  id: string;
  name: string;
  color: string | null;
}

interface TermBadgeProps {
  term: TermBadgeTerm | null | undefined;
  /** Optional class for the wrapper. */
  className?: string;
}

/**
 * Renders a single taxonomy term as a colored chip, or "—" if missing.
 */
export function TermBadge({ term, className = "" }: TermBadgeProps) {
  if (!term) {
    return <span className={className}>—</span>;
  }
  const bg = term.color ?? undefined;
  const style = bg
    ? { backgroundColor: bg, color: "#fff", border: "none" }
    : undefined;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border border-border bg-muted ${className}`}
      style={style}
    >
      {term.name}
    </span>
  );
}
