import {
  listProjects,
  listTasks,
  getTaskPriorityTerms,
  getTaskStatusTerms,
  getTaskTypeTerms,
} from "@/lib/supabase/projects";
import { getTaxonomyForContentBatch } from "@/lib/supabase/taxonomy";
import { AllTasksListClient } from "./AllTasksListClient";

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
  const taskTaxonomyMap = await getTaxonomyForContentBatch(taskIds, "task");

  return (
    <AllTasksListClient
      initialProjects={projects}
      initialTasks={tasks}
      priorityTerms={priorityTerms}
      statusTerms={statusTerms}
      taskTypeTerms={taskTypeTerms}
      taskTaxonomyMap={taskTaxonomyMap}
    />
  );
}
