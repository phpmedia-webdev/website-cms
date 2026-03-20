"use client";

import { SelectItem } from "@/components/ui/select";
import { normalizeHex } from "@/lib/event-type-colors";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";

const FALLBACK_DOT = "#94a3b8";

/** Color dot for Customizer-aligned task term chips (selects, taxonomy overrides). */
export function TaskTermColorDot({ color }: { color: string | null | undefined }) {
  const bg =
    color != null && String(color).trim() ? normalizeHex(String(color)) : FALLBACK_DOT;
  return (
    <span
      className="size-2.5 shrink-0 rounded-full border border-black/15 dark:border-white/25"
      style={{ backgroundColor: bg }}
      aria-hidden
    />
  );
}

/** Select options for task status / type (Customizer-merged labels + colors). */
export function TaskTermSelectItems({ terms }: { terms: StatusOrTypeTerm[] }) {
  return terms.map((t) => (
    <SelectItem key={t.id} value={t.id} textValue={t.name}>
      <span className="flex min-w-0 items-center gap-2">
        <TaskTermColorDot color={t.color} />
        <span className="truncate">{t.name}</span>
      </span>
    </SelectItem>
  ));
}
