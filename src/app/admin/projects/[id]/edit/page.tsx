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
import { getProfileByUserId } from "@/lib/supabase/profiles";
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
    <ProjectEditClient
      project={project}
      statusTerms={statusTerms}
      typeTerms={typeTerms}
      projectRoleTerms={projectRoleTerms}
      clientDisplayName={clientDisplayName}
      initialProjectMembers={membersWithLabels}
    />
  );
}
