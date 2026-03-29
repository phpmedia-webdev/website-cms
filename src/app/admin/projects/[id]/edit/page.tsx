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
import {
  getProjectMemberDisplayLabelMap,
  getProjectMemberAvatarInitialsMap,
} from "@/lib/projects/resolve-project-member-labels";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";
import { initialsFromLabel } from "@/lib/tasks/display-helpers";
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
    <ProjectEditClient
      project={project}
      statusTerms={statusTerms}
      typeTerms={typeTerms}
      projectRoleTerms={projectRoleTerms}
      clientDisplayName={clientDisplayName}
      clientAvatarInitials={clientAvatarInitials}
      initialProjectMembers={membersWithLabels}
      initialCoverImageUrl={initialCoverImageUrl}
    />
  );
}
