import type { TaskInsert } from "@/lib/supabase/projects";

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Build a normalized TaskInsert payload from request JSON.
 * `forcedProjectId` is used by project-scoped create routes.
 */
export function buildTaskInsertFromBody(
  body: unknown,
  forcedProjectId?: string
): { input: TaskInsert } | { error: string } {
  const source = (body ?? {}) as Record<string, unknown>;
  const title = normalizeOptionalString(source.title);
  if (!title) return { error: "title is required" };

  const projectIdFromBody = normalizeOptionalNullableString(source.project_id);
  const forced = forcedProjectId?.trim();

  const input: TaskInsert = {
    project_id: forced && forced.length > 0 ? forced : projectIdFromBody,
    title,
    description: normalizeOptionalString(source.description),
    task_status_slug: normalizeOptionalString(source.task_status_slug),
    task_type_slug: normalizeOptionalString(source.task_type_slug),
    task_phase_slug: normalizeOptionalString(source.task_phase_slug),
    priority_term_id: normalizeOptionalString(source.priority_term_id),
    planned_time:
      typeof source.planned_time === "number"
        ? source.planned_time
        : typeof source.proposed_time === "number"
          ? source.proposed_time
          : undefined,
    actual_time: typeof source.actual_time === "number" ? source.actual_time : undefined,
    due_date: source.due_date != null ? String(source.due_date) : undefined,
    start_date: source.start_date != null ? String(source.start_date) : undefined,
    creator_id: normalizeOptionalNullableString(source.creator_id),
    responsible_id: normalizeOptionalNullableString(source.responsible_id),
    contact_id: normalizeOptionalNullableString(source.contact_id),
  };

  return { input };
}
