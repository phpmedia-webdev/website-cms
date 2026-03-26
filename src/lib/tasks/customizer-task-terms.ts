/**
 * Build task status / type / phase select options from Customizer rows only (no taxonomy).
 * Select values use slug as `id` so they match `tasks.task_*_slug` columns.
 *
 * Scopes match the tenant `customizer` table (`scope` column) for Settings → Customizer → Tasks.
 */

import { normalizeHex } from "@/lib/event-type-colors";
import type { CustomizerOptionRowServer } from "@/lib/supabase/settings";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import { taskTermForSlug } from "@/lib/tasks/merge-task-customizer-colors";

/** `customizer.scope` for task type (`tasks.task_type_slug`). */
export const CUSTOMIZER_SCOPE_TASK_TYPE = "task_type";
/** `customizer.scope` for task status (`tasks.task_status_slug`). */
export const CUSTOMIZER_SCOPE_TASK_STATUS = "task_status";
/** `customizer.scope` for task phase (`tasks.task_phase_slug`). */
export const CUSTOMIZER_SCOPE_TASK_PHASE = "task_phase";

/**
 * Map a stored task slug to its Customizer-driven term (label/color from `statusTermsFromCustomizerRows`).
 * Case-insensitive; aligns with normalized `tasks.task_*_slug` values.
 */
export function resolveTaskCustomizerTerm(
  terms: StatusOrTypeTerm[],
  slug: string | null | undefined
): StatusOrTypeTerm | null {
  return taskTermForSlug(terms, slug);
}

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
