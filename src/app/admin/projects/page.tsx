import {
  listProjects,
  getProjectStatusTerms,
  getProjectTypeTerms,
} from "@/lib/supabase/projects";
import { getTaxonomyForContentBatch } from "@/lib/supabase/taxonomy";
import { ProjectsListClient } from "./ProjectsListClient";

export default async function AdminProjectsPage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let statusTerms: Awaited<ReturnType<typeof getProjectStatusTerms>> = [];
  let typeTerms: Awaited<ReturnType<typeof getProjectTypeTerms>> = [];
  try {
    [projects, statusTerms, typeTerms] = await Promise.all([
      listProjects({ include_archived: false }),
      getProjectStatusTerms(),
      getProjectTypeTerms(),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error loading projects:", msg);
  }
  const projectIds = projects.map((p) => p.id);
  const projectTaxonomyMap = await getTaxonomyForContentBatch(projectIds, "project");

  return (
    <ProjectsListClient
      initialProjects={projects}
      projectTaxonomyMap={projectTaxonomyMap}
      statusTerms={statusTerms}
      typeTerms={typeTerms}
    />
  );
}
