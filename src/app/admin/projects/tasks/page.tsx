import {
  listProjects,
  listTasks,
  listTaskFollowersByTaskIds,
  getTaskTimeLogTotalMinutesByTaskIds,
  getTaskPriorityTerms,
  getTaskStatusTerms,
  getTaskTypeTerms,
} from "@/lib/supabase/projects";
import { getContactsByIds } from "@/lib/supabase/crm";
import { getProfilesByUserIds } from "@/lib/supabase/profiles";
import { getTaxonomyForContentBatch } from "@/lib/supabase/taxonomy";
import { AllTasksListClient, type TaskAssigneeItem } from "./AllTasksListClient";

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))));
}

export default async function AdminAllTasksPage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let priorityTerms: Awaited<ReturnType<typeof getTaskPriorityTerms>> = [];
  let statusTerms: Awaited<ReturnType<typeof getTaskStatusTerms>> = [];
  let taskTypeTerms: Awaited<ReturnType<typeof getTaskTypeTerms>> = [];
  try {
    [projects, tasks, priorityTerms, statusTerms, taskTypeTerms] = await Promise.all([
      listProjects({ include_archived: true }),
      listTasks({}),
      getTaskPriorityTerms(),
      getTaskStatusTerms(),
      getTaskTypeTerms(),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error loading tasks:", msg);
  }
  const taskIds = tasks.map((t) => t.id);
  const [taskTaxonomyMap, followers, taskTimeLogTotals] = await Promise.all([
    getTaxonomyForContentBatch(taskIds, "task"),
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

  const taskAssigneesMap: Record<string, TaskAssigneeItem[]> = {};
  for (const f of followers) {
    const list = taskAssigneesMap[f.task_id] ?? [];
    const item: TaskAssigneeItem = {
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
      item.label = c ? (c.full_name || c.email || c.id) : f.contact_id.slice(0, 8);
      item.avatarUrl = c?.avatar_url ?? null;
    }
    list.push(item);
    taskAssigneesMap[f.task_id] = list;
  }

  return (
    <AllTasksListClient
      initialProjects={projects}
      initialTasks={tasks}
      priorityTerms={priorityTerms}
      statusTerms={statusTerms}
      taskTypeTerms={taskTypeTerms}
      taskTaxonomyMap={taskTaxonomyMap}
      taskAssigneesMap={taskAssigneesMap}
      taskTimeLogTotals={taskTimeLogTotals}
    />
  );
}
