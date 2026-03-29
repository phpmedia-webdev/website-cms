import { notFound } from "next/navigation";
import {
  getProjectById,
  listTasks,
  listProjectMembers,
  getProjectTimeLogTotalMinutes,
  getTaskTimeLogTotalMinutesByTaskIds,
  getProjectStatusTerms,
  getProjectTypeTerms,
  getProjectRoleTerms,
} from "@/lib/supabase/projects";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import {
  CUSTOMIZER_SCOPE_TASK_STATUS,
  CUSTOMIZER_SCOPE_TASK_TYPE,
  statusTermsFromCustomizerRows,
} from "@/lib/tasks/customizer-task-terms";
import { listOrders } from "@/lib/shop/orders";
import { listInvoices } from "@/lib/shop/invoices";
import { listEventsByProjectId } from "@/lib/supabase/events";
import { getContactById } from "@/lib/supabase/crm";
import { getOrganizationById } from "@/lib/supabase/organizations";
import { getMediaById } from "@/lib/supabase/media";
import { projectCoverImageUrlFromMedia } from "@/lib/projects/project-cover-image-url";
import {
  getProjectMemberDisplayLabelMap,
  getProjectMemberAvatarInitialsMap,
} from "@/lib/projects/resolve-project-member-labels";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";
import { initialsFromLabel } from "@/lib/tasks/display-helpers";
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
    getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_STATUS),
    getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_TYPE),
    listProjectMembers(id),
    getProjectRoleTerms(),
  ]);
  const taskStatusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const taskTypeTerms = statusTermsFromCustomizerRows(czTaskType);
  if (!project) notFound();

  const taskTimeLogTotals =
    tasks.length > 0
      ? await getTaskTimeLogTotalMinutesByTaskIds(tasks.map((t) => t.id))
      : {};

  let coverImageUrl: string | null = null;
  if (project.cover_image_id) {
    const coverMedia = await getMediaById(project.cover_image_id);
    coverImageUrl = projectCoverImageUrlFromMedia(coverMedia);
  }

  let clientDisplayName: string | null = null;
  let clientAvatarInitials: string | null = null;
  if (project.contact_id) {
    const contact = await getContactById(project.contact_id);
    if (contact) {
      clientDisplayName = contact.full_name ?? contact.email ?? project.contact_id;
      clientAvatarInitials = initialsFromFirstLast(contact.first_name, contact.last_name, contact.email);
    }
  } else if (project.client_organization_id) {
    const org = await getOrganizationById(project.client_organization_id);
    if (org) {
      clientDisplayName = org.name ?? project.client_organization_id;
      clientAvatarInitials = initialsFromLabel(org.name);
    }
  }

  const projectTotal = projectOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const projectPlannedTimeMinutes = tasks.reduce((sum, t) => sum + (t.planned_time ?? 0), 0);

  const [memberLabelById, memberAvatarInitialsById] = await Promise.all([
    getProjectMemberDisplayLabelMap(projectMembers),
    getProjectMemberAvatarInitialsMap(projectMembers),
  ]);
  const membersWithLabels = projectMembers.map((m) => {
    const roleTerm = projectRoleTerms.find((t) => t.slug === m.role_slug);
    return {
      ...m,
      label: memberLabelById.get(m.id) ?? "—",
      role_label: roleTerm?.name ?? null,
      avatar_initials: memberAvatarInitialsById.get(m.id) ?? "?",
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
      clientAvatarInitials={clientAvatarInitials}
      projectStatusTerms={projectStatusTerms}
      projectTypeTerms={projectTypeTerms}
      taskStatusTerms={taskStatusTerms}
      taskTypeTerms={taskTypeTerms}
      initialTaskTimeLogTotals={taskTimeLogTotals}
      initialProjectMembers={membersWithLabels}
      projectRoleTerms={projectRoleTerms}
    />
  );
}
