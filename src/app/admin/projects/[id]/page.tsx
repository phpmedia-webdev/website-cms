import { notFound } from "next/navigation";
import {
  getProjectById,
  listTasks,
  listProjectMembers,
  getProjectTimeLogTotalMinutes,
  getTaskPriorityTerms,
  getProjectStatusTerms,
  getProjectTypeTerms,
  getProjectRoleTerms,
  getTaskStatusTerms,
  getTaskTypeTerms,
} from "@/lib/supabase/projects";
import { getTaxonomyTermsForContentDisplay } from "@/lib/supabase/taxonomy";
import { listOrders } from "@/lib/shop/orders";
import { listInvoices } from "@/lib/shop/invoices";
import { listEventsByProjectId } from "@/lib/supabase/events";
import { getContactById } from "@/lib/supabase/crm";
import { getOrganizationById } from "@/lib/supabase/organizations";
import { getProfileByUserId } from "@/lib/supabase/profiles";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    project,
    tasks,
    projectOrders,
    projectInvoices,
    projectEvents,
    projectTimeLogMinutes,
    priorityTerms,
    projectTaxonomy,
    projectStatusTerms,
    projectTypeTerms,
    taskStatusTerms,
    taskTypeTerms,
    projectMembers,
    projectRoleTerms,
  ] = await Promise.all([
    getProjectById(id),
    listTasks({ project_id: id }),
    listOrders({ project_id: id, limit: 100 }),
    listInvoices({ project_id: id, limit: 100 }),
    listEventsByProjectId(id),
    getProjectTimeLogTotalMinutes(id),
    getTaskPriorityTerms(),
    getTaxonomyTermsForContentDisplay(id, "project"),
    getProjectStatusTerms(),
    getProjectTypeTerms(),
    getTaskStatusTerms(),
    getTaskTypeTerms(),
    listProjectMembers(id),
    getProjectRoleTerms(),
  ]);
  if (!project) notFound();

  const projectTotal = projectOrders.reduce((sum, o) => sum + Number(o.total), 0);

  let clientDisplayName: string | null = null;
  if (project.contact_id) {
    const contact = await getContactById(project.contact_id);
    clientDisplayName = contact?.full_name ?? contact?.email ?? project.contact_id;
  } else if (project.client_organization_id) {
    const org = await getOrganizationById(project.client_organization_id);
    clientDisplayName = org?.name ?? project.client_organization_id;
  }

  const membersWithLabels = await Promise.all(
    projectMembers.map(async (m) => {
      let label = "—";
      if (m.contact_id) {
        const c = await getContactById(m.contact_id);
        label = c?.full_name ?? c?.email ?? m.contact_id;
      } else if (m.user_id) {
        const p = await getProfileByUserId(m.user_id);
        label = p?.display_name ?? m.user_id;
      }
      const roleTerm = projectRoleTerms.find((t) => t.id === m.role_term_id);
      return {
        ...m,
        label,
        role_label: roleTerm?.name ?? null,
      };
    })
  );

  return (
    <ProjectDetailClient
      project={project}
      initialTasks={tasks}
      initialOrders={projectOrders}
      initialInvoices={projectInvoices}
      initialProjectEvents={projectEvents}
      projectTotal={projectTotal}
      projectTimeLogMinutes={projectTimeLogMinutes}
      priorityTerms={priorityTerms}
      projectTaxonomy={projectTaxonomy}
      projectStatusTerms={projectStatusTerms}
      projectTypeTerms={projectTypeTerms}
      taskStatusTerms={taskStatusTerms}
      taskTypeTerms={taskTypeTerms}
      clientDisplayName={clientDisplayName}
      initialProjectMembers={membersWithLabels}
      projectRoleTerms={projectRoleTerms}
    />
  );
}
