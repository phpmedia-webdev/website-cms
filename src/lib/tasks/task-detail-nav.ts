/**
 * Task detail / edit "back" behavior: opened from All Tasks vs from a project page.
 * Use query `?from=tasks` (default) or `?from=project` on task detail and edit URLs.
 */

export const ADMIN_TASKS_LIST_PATH = "/admin/projects/tasks";

/** Task detail/edit when `task.project_id` is null (no project in URL). */
export const ADMIN_TASK_UNASSIGNED_BASE = `${ADMIN_TASKS_LIST_PATH}`;

export type TaskDetailFrom = "tasks" | "project";

/** Parse Next.js `searchParams` for `from`. Defaults to `tasks` (back → all tasks list). */
export function parseTaskDetailFrom(
  sp: Record<string, string | string[] | undefined> | undefined
): TaskDetailFrom {
  const raw = sp?.from;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "project" ? "project" : "tasks";
}

/** Append to task detail or edit URLs, e.g. `/admin/projects/x/tasks/y?from=project` */
export function taskDetailQuery(from: TaskDetailFrom): string {
  return `?from=${from}`;
}

function normalizedProjectId(projectId: string | null | undefined): string {
  return projectId?.trim() ?? "";
}

/** Canonical task detail URL (project-scoped or `/admin/projects/tasks/[taskId]`). */
export function taskDetailPath(
  taskId: string,
  projectId: string | null | undefined,
  from: TaskDetailFrom
): string {
  const q = taskDetailQuery(from);
  const pid = normalizedProjectId(projectId);
  if (!pid) return `${ADMIN_TASK_UNASSIGNED_BASE}/${taskId}${q}`;
  return `/admin/projects/${pid}/tasks/${taskId}${q}`;
}

/** Canonical task edit URL. */
export function taskEditPath(
  taskId: string,
  projectId: string | null | undefined,
  from: TaskDetailFrom
): string {
  const q = taskDetailQuery(from);
  const pid = normalizedProjectId(projectId);
  if (!pid) return `${ADMIN_TASK_UNASSIGNED_BASE}/${taskId}/edit${q}`;
  return `/admin/projects/${pid}/tasks/${taskId}/edit${q}`;
}
