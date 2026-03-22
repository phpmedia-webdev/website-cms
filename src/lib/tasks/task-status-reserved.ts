/**
 * Reserved Customizer slugs for task_status (Settings → Customizer → Tasks).
 * Used by Time tracking "Mark complete" and similar toggles.
 */
export const TASK_STATUS_SLUG_IN_PROGRESS = "in_progress";
export const TASK_STATUS_SLUG_COMPLETED = "completed";

export function isTaskStatusCompletedSlug(slug: string | null | undefined): boolean {
  return (slug ?? "").trim().toLowerCase() === TASK_STATUS_SLUG_COMPLETED;
}
