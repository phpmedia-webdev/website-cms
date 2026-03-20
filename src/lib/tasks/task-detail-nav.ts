/**
 * Task detail / edit "back" behavior: opened from All Tasks vs from a project page.
 * Use query `?from=tasks` (default) or `?from=project` on task detail and edit URLs.
 */

export const ADMIN_TASKS_LIST_PATH = "/admin/projects/tasks";

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
