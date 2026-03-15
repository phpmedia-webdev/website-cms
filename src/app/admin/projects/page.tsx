import { listProjects } from "@/lib/supabase/projects";
import { ProjectsListClient } from "./ProjectsListClient";

export default async function AdminProjectsPage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  try {
    projects = await listProjects({ include_archived: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error loading projects:", msg);
  }

  return (
    <ProjectsListClient
      initialProjects={projects}
    />
  );
}
