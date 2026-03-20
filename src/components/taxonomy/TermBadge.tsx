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
 * Renders a single taxonomy term as a rounded-md chip, or "—" if missing.
 * Uses max-w-full + truncate so dense table columns do not overflow.
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
      className={`inline-flex max-w-full min-w-0 items-center rounded-md px-2 py-0.5 text-xs font-medium border border-border bg-muted ${className}`}
      style={style}
      title={term.name}
    >
      <span className="min-w-0 truncate">{term.name}</span>
    </span>
  );
}
