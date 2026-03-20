/**
 * Build task status / type / phase select options from Customizer rows only (no taxonomy).
 * Select values use slug as `id` so they match `tasks.task_*_slug` columns.
 */

import { normalizeHex } from "@/lib/event-type-colors";
import type { CustomizerOptionRowServer } from "@/lib/supabase/settings";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";

export function statusTermsFromCustomizerRows(rows: CustomizerOptionRowServer[]): StatusOrTypeTerm[] {
  return rows
    .filter((r) => String(r.slug ?? "").trim().length > 0)
    .map((r) => {
      const slug = String(r.slug).trim().toLowerCase();
      const rawLabel = r.label != null && String(r.label).trim() ? String(r.label).trim() : "";
      const name = rawLabel || slug;
      const rawColor = r.color != null ? String(r.color).trim() : "";
      const color = rawColor ? normalizeHex(rawColor) : null;
      return {
        id: slug,
        slug,
        name,
        color,
      };
    });
}
