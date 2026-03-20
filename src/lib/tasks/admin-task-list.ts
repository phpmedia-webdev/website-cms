/**
 * Admin "All tasks" list: fetch tasks + display maps (assignees, phase slug, time totals).
 * Task status / type / phase come from `tasks.task_*_slug` (Customizer); no taxonomy reads for tasks.
 */

import {
  listTasks,
  listTaskFollowersByTaskIds,
  getTaskTimeLogTotalMinutesByTaskIds,
  type ListTasksFilters,
  type Task,
  type Project,
} from "@/lib/supabase/projects";
import { getContactsByIds } from "@/lib/supabase/crm";
import { getProfilesByUserIds } from "@/lib/supabase/profiles";
import { getClientSchema } from "@/lib/supabase/schema";

export interface TaskAssigneeListItem {
  id: string;
  label: string;
  avatarUrl: string | null;
}

export interface AdminTasksListBundle {
  tasks: Task[];
  /** Per-task phase slug (same as `task.task_phase_slug`; kept for client/API shape compatibility). */
  phaseSlugByTaskId: Record<string, string | null>;
  taskAssigneesMap: Record<string, TaskAssigneeListItem[]>;
  taskTimeLogTotals: Record<string, number>;
}

const EXCLUDED_PROJECT_STATUS_SLUGS = new Set(["completed", "closed"]);

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))));
}

/** Projects eligible for default task list: not archived, status slug not completed/closed. */
export function filterActiveProjectsForTaskList(
  projects: Project[],
  termSlugById: Record<string, string>
): Project[] {
  return projects.filter((p) => {
    if (p.archived_at) return false;
    const slug = (termSlugById[p.status_term_id] ?? "").toLowerCase();
    return !EXCLUDED_PROJECT_STATUS_SLUGS.has(slug);
  });
}

export async function getAdminTasksListBundle(
  filters: ListTasksFilters,
  schema?: string
): Promise<AdminTasksListBundle> {
  const schemaName = schema ?? getClientSchema();
  const tasks = await listTasks(filters, schemaName);
  const taskIds = tasks.map((t) => t.id);
  if (taskIds.length === 0) {
    return {
      tasks: [],
      phaseSlugByTaskId: {},
      taskAssigneesMap: {},
      taskTimeLogTotals: {},
    };
  }

  const phaseSlugByTaskId: Record<string, string | null> = {};
  for (const t of tasks) {
    phaseSlugByTaskId[t.id] = t.task_phase_slug ?? null;
  }

  const [followers, taskTimeLogTotals] = await Promise.all([
    listTaskFollowersByTaskIds(taskIds),
    getTaskTimeLogTotalMinutesByTaskIds(taskIds),
  ]);

  const userIds = uniqueStrings(followers.map((f) => f.user_id));
  const contactIds = uniqueStrings(followers.map((f) => f.contact_id));
  const [profiles, contacts] = await Promise.all([
    getProfilesByUserIds(userIds),
    contactIds.length > 0 ? getContactsByIds(contactIds) : Promise.resolve([]),
  ]);
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const taskAssigneesMap: Record<string, TaskAssigneeListItem[]> = {};
  for (const f of followers) {
    const list = taskAssigneesMap[f.task_id] ?? [];
    const item: TaskAssigneeListItem = {
      id: f.id,
      label: "—",
      avatarUrl: null,
    };
    if (f.user_id) {
      const p = profileMap.get(f.user_id);
      item.label = p?.display_name ?? p?.user_id ?? f.user_id.slice(0, 8);
      item.avatarUrl = p?.avatar_url ?? null;
    } else if (f.contact_id) {
      const c = contactMap.get(f.contact_id);
      item.label = c ? c.full_name || c.email || c.id : f.contact_id.slice(0, 8);
      item.avatarUrl = c?.avatar_url ?? null;
    }
    list.push(item);
    taskAssigneesMap[f.task_id] = list;
  }

  return {
    tasks,
    phaseSlugByTaskId,
    taskAssigneesMap,
    taskTimeLogTotals,
  };
}
