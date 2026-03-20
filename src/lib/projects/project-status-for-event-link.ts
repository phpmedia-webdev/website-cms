/**
 * Which project statuses may be linked from calendar events (New/Edit Event form).
 * Status is the taxonomy term slug on the project's `status_term_id` (Projects section).
 *
 * When project statuses are fully driven by Customizer, extend exclusion via
 * `registerCustomizerExcludedStatusSlugsForEventLink` (stub below) or by reading
 * a dedicated flag from customizer rows — see TODO in register function.
 */

/** Slugs excluded from the event-link project picker (case-insensitive). */
export const PROJECT_STATUS_SLUGS_EXCLUDED_FROM_EVENT_LINK = [
  "complete",
  "archived",
] as const;

/** Future: additional slugs from customizer or tenant rules (stub). */
let customizerExcludedSlugs: string[] = [];

/**
 * Stub for when Customizer is the source of truth for project status metadata.
 * Call from a future settings/bootstrap path with slugs that should not appear
 * in the event project picker (e.g. cancelled, lost).
 *
 * TODO: Replace with reading optional `config` JSON on customizer rows or a
 * dedicated column when project_status scope supports "excluded_from_event_link".
 */
export function registerCustomizerExcludedStatusSlugsForEventLink(slugs: string[]): void {
  customizerExcludedSlugs = slugs.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function getExcludedProjectStatusSlugsForEventLink(): string[] {
  return [
    ...PROJECT_STATUS_SLUGS_EXCLUDED_FROM_EVENT_LINK,
    ...customizerExcludedSlugs,
  ];
}

export function shouldIncludeProjectForEventLink(
  statusSlug: string | null | undefined
): boolean {
  const s = (statusSlug ?? "").trim().toLowerCase();
  if (!s) return true;
  return !getExcludedProjectStatusSlugsForEventLink().includes(s);
}
