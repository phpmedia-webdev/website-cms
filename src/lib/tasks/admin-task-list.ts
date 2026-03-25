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
import { getDisplayLabelForUser } from "@/lib/blog-comments/author-name";
import { getContactsByIds } from "@/lib/supabase/crm";
import { getProfilesByUserIds } from "@/lib/supabase/profiles";
import { getTenantUsersByAuthUserIds } from "@/lib/supabase/tenant-users";
import { getClientSchema } from "@/lib/supabase/schema";
import type { Profile } from "@/types/profiles";
import type { TenantUser } from "@/types/tenant-users";

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

const EXCLUDED_PROJECT_STATUS_SLUGS = new Set(["completed", "complete", "closed"]);

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))));
}

/**
 * Same priority as `getDisplayLabelForUser`, but batched (profiles + tenant_users).
 * Remaining ids fall back to per-user resolution (Auth metadata / email).
 */
/** Display names for task assignee chips / filters; matches task detail (`getDisplayLabelForUser`) priority. */
export async function resolveAssigneeLabelsForUserIds(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (userIds.length === 0) return out;

  const [profiles, tenantUsers] = await Promise.all([
    getProfilesByUserIds(userIds),
    getTenantUsersByAuthUserIds(userIds),
  ]);
  const profileByUserId = new Map(profiles.map((p) => [p.user_id, p]));
  const tenantByAuthId = new Map<string, TenantUser>();
  for (const tu of tenantUsers) {
    if (tu.user_id) tenantByAuthId.set(tu.user_id, tu);
  }

  const needFallback: string[] = [];

  for (const uid of userIds) {
    const p: Profile | undefined = profileByUserId.get(uid);
    const tu: TenantUser | undefined = tenantByAuthId.get(uid);
    const handle = p?.handle?.trim();
    const tuName = tu?.display_name?.trim();
    const tuEmail = tu?.email?.trim();
    const displayName = p?.display_name?.trim();
    const label = handle || tuName || tuEmail || displayName || "";
    if (label) out.set(uid, label);
    else needFallback.push(uid);
  }

  if (needFallback.length > 0) {
    await Promise.all(
      needFallback.map(async (uid) => {
        const resolved = (await getDisplayLabelForUser(uid)).trim();
        out.set(uid, resolved || "User");
      })
    );
  }

  return out;
}

/** Projects eligible for default task list: not archived, status slug not completed/closed. */
export function filterActiveProjectsForTaskList(projects: Project[]): Project[] {
  return projects.filter((p) => {
    if (p.archived_at) return false;
    const slug = (p.project_status_slug ?? "").toLowerCase();
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
  const [profiles, contacts, userLabelById] = await Promise.all([
    getProfilesByUserIds(userIds),
    contactIds.length > 0 ? getContactsByIds(contactIds) : Promise.resolve([]),
    resolveAssigneeLabelsForUserIds(userIds),
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
      item.label = userLabelById.get(f.user_id) ?? "User";
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
