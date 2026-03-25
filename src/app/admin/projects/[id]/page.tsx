import { notFound } from "next/navigation";
import {
  getProjectById,
  listTasks,
  listProjectMembers,
  getProjectTimeLogTotalMinutes,
  getProjectStatusTerms,
  getProjectTypeTerms,
  getProjectRoleTerms,
} from "@/lib/supabase/projects";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import { statusTermsFromCustomizerRows } from "@/lib/tasks/customizer-task-terms";
import { listOrders } from "@/lib/shop/orders";
import { listInvoices } from "@/lib/shop/invoices";
import { listEventsByProjectId } from "@/lib/supabase/events";
import { getContactById } from "@/lib/supabase/crm";
import { getOrganizationById } from "@/lib/supabase/organizations";
import { getMediaById } from "@/lib/supabase/media";
import { projectCoverImageUrlFromMedia } from "@/lib/projects/project-cover-image-url";
import { getProjectMemberDisplayLabelMap } from "@/lib/projects/resolve-project-member-labels";
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
    projectStatusTerms,
    projectTypeTerms,
    czTaskStatus,
    czTaskType,
    projectMembers,
    projectRoleTerms,
  ] = await Promise.all([
    getProjectById(id),
    listTasks({ project_ids: [id] }),
    listOrders({ project_id: id, limit: 100 }),
    listInvoices({ project_id: id, limit: 100 }),
    listEventsByProjectId(id),
    getProjectTimeLogTotalMinutes(id),
    getProjectStatusTerms(),
    getProjectTypeTerms(),
    getCustomizerOptions("task_status"),
    getCustomizerOptions("task_type"),
    listProjectMembers(id),
    getProjectRoleTerms(),
  ]);
  const taskStatusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const taskTypeTerms = statusTermsFromCustomizerRows(czTaskType);
  if (!project) notFound();

  let coverImageUrl: string | null = null;
  if (project.cover_image_id) {
    const coverMedia = await getMediaById(project.cover_image_id);
    coverImageUrl = projectCoverImageUrlFromMedia(coverMedia);
  }

  let clientDisplayName: string | null = null;
  if (project.contact_id) {
    const contact = await getContactById(project.contact_id);
    clientDisplayName = contact?.full_name ?? contact?.email ?? project.contact_id;
  } else if (project.client_organization_id) {
    const org = await getOrganizationById(project.client_organization_id);
    clientDisplayName = org?.name ?? project.client_organization_id;
  }

  const projectTotal = projectOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const projectPlannedTimeMinutes = tasks.reduce((sum, t) => sum + (t.planned_time ?? 0), 0);

  const memberLabelById = await getProjectMemberDisplayLabelMap(projectMembers);
  const membersWithLabels = projectMembers.map((m) => {
    const roleTerm = projectRoleTerms.find((t) => t.slug === m.role_slug);
    return {
      ...m,
      label: memberLabelById.get(m.id) ?? "—",
      role_label: roleTerm?.name ?? null,
    };
  });

  return (
    <ProjectDetailClient
      project={project}
      coverImageUrl={coverImageUrl}
      initialTasks={tasks}
      initialOrders={projectOrders}
      initialInvoices={projectInvoices}
      initialProjectEvents={projectEvents}
      projectTotal={projectTotal}
      projectPlannedTimeMinutes={projectPlannedTimeMinutes}
      projectTimeLogMinutes={projectTimeLogMinutes}
      clientDisplayName={clientDisplayName}
      projectStatusTerms={projectStatusTerms}
      projectTypeTerms={projectTypeTerms}
      taskStatusTerms={taskStatusTerms}
      taskTypeTerms={taskTypeTerms}
      initialProjectMembers={membersWithLabels}
      projectRoleTerms={projectRoleTerms}
    />
  );
}
