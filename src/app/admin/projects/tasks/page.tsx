import { listProjects } from "@/lib/supabase/projects";
import { listTasks } from "@/lib/supabase/projects";
import { AllTasksListClient } from "./AllTasksListClient";

export default async function AdminAllTasksPage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  try {
    [projects, tasks] = await Promise.all([
      listProjects({ include_archived: true }),
      listTasks({}),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error loading tasks:", msg);
  }

  return (
    <AllTasksListClient
      initialProjects={projects}
      initialTasks={tasks}
    />
  );
}
