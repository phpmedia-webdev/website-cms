import { notFound } from "next/navigation";
import {
  getProjectById,
  listProjectMembers,
  getProjectStatusTerms,
  getProjectTypeTerms,
  getProjectRoleTerms,
} from "@/lib/supabase/projects";
import { getContactById } from "@/lib/supabase/crm";
import { getOrganizationById } from "@/lib/supabase/organizations";
import { getMediaById } from "@/lib/supabase/media";
import { projectCoverImageUrlFromMedia } from "@/lib/projects/project-cover-image-url";
import { getProjectMemberDisplayLabelMap } from "@/lib/projects/resolve-project-member-labels";
import { ProjectEditClient } from "./ProjectEditClient";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    project,
    statusTerms,
    typeTerms,
    projectRoleTerms,
    projectMembers,
  ] = await Promise.all([
    getProjectById(id),
    getProjectStatusTerms(),
    getProjectTypeTerms(),
    getProjectRoleTerms(),
    listProjectMembers(id),
  ]);
  if (!project) notFound();

  let initialCoverImageUrl: string | null = null;
  if (project.cover_image_id) {
    const coverMedia = await getMediaById(project.cover_image_id);
    initialCoverImageUrl = projectCoverImageUrlFromMedia(coverMedia);
  }

  let clientDisplayName: string | null = null;
  if (project.contact_id) {
    const contact = await getContactById(project.contact_id);
    clientDisplayName = contact?.full_name ?? contact?.email ?? project.contact_id;
  } else if (project.client_organization_id) {
    const org = await getOrganizationById(project.client_organization_id);
    clientDisplayName = org?.name ?? project.client_organization_id;
  }

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
    <ProjectEditClient
      project={project}
      statusTerms={statusTerms}
      typeTerms={typeTerms}
      projectRoleTerms={projectRoleTerms}
      clientDisplayName={clientDisplayName}
      initialProjectMembers={membersWithLabels}
      initialCoverImageUrl={initialCoverImageUrl}
    />
  );
}
