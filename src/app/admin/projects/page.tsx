import { listProjects, getProjectStatusTerms, getProjectTypeTerms, listProjectMembersByProjectIds, listTasksByProjectIds } from "@/lib/supabase/projects";
import { getContactsByIds } from "@/lib/supabase/crm";
import { getOrganizationsByIds } from "@/lib/supabase/organizations";
import { getProfilesByUserIds } from "@/lib/supabase/profiles";
import { ProjectsListClient } from "./ProjectsListClient";
import type { ProjectListRow, ProjectListTerm } from "@/components/projects/ProjectListTable";

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function toTerm(term: { id: string; name: string; slug: string; color: string | null } | undefined): ProjectListTerm | null {
  if (!term) return null;
  return { id: term.id, name: term.name, slug: term.slug, color: term.color };
}

export default async function AdminProjectsPage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let statusTerms: Awaited<ReturnType<typeof getProjectStatusTerms>> = [];
  let typeTerms: Awaited<ReturnType<typeof getProjectTypeTerms>> = [];
  try {
    [projects, statusTerms, typeTerms] = await Promise.all([
      listProjects({ include_archived: true }),
      getProjectStatusTerms(),
      getProjectTypeTerms(),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error loading projects:", msg);
  }

  const projectIds = projects.map((project) => project.id);
  const [projectMembers, tasks] = await Promise.all([
    listProjectMembersByProjectIds(projectIds),
    listTasksByProjectIds(projectIds),
  ]);

  const clientContactIds = uniqueStrings(projects.map((project) => project.contact_id));
  const memberContactIds = uniqueStrings(projectMembers.map((member) => member.contact_id));
  const memberUserIds = uniqueStrings(projectMembers.map((member) => member.user_id));
  const [contacts, organizations, profiles] = await Promise.all([
    getContactsByIds(uniqueStrings([...clientContactIds, ...memberContactIds])),
    getOrganizationsByIds(uniqueStrings(projects.map((project) => project.client_organization_id))),
    getProfilesByUserIds(memberUserIds),
  ]);

  const contactMap = new Map<string, (typeof contacts)[number]>(contacts.map((contact) => [contact.id, contact]));
  const organizationMap = new Map(organizations.map((org) => [org.id, org]));
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const statusMap = new Map(statusTerms.map((term) => [term.id, term]));
  const typeMap = new Map(typeTerms.map((term) => [term.id, term]));
  const tasksByProject = new Map<string, Awaited<ReturnType<typeof listTasksByProjectIds>>>();
  for (const task of tasks) {
    const current = tasksByProject.get(task.project_id) ?? [];
    current.push(task);
    tasksByProject.set(task.project_id, current);
  }
  const membersByProject = new Map<string, typeof projectMembers>();
  for (const member of projectMembers) {
    const current = membersByProject.get(member.project_id) ?? [];
    current.push(member);
    membersByProject.set(member.project_id, current);
  }

  const now = Date.now();

  const rows: ProjectListRow[] = projects.map((project) => {
    const statusTerm = toTerm(statusMap.get(project.status_term_id));
    const typeTerm = project.project_type_term_id ? toTerm(typeMap.get(project.project_type_term_id)) : null;
    const contact = project.contact_id ? contactMap.get(project.contact_id) ?? null : null;
    const organization = project.client_organization_id ? organizationMap.get(project.client_organization_id) ?? null : null;
    const client = contact
      ? {
          label: contact.full_name ?? contact.email ?? contact.id,
          href: `/admin/crm/contacts/${contact.id}`,
          avatarUrl: contact.avatar_url ?? null,
        }
      : organization
        ? {
            label: organization.name,
            href: `/admin/crm/organizations/${organization.id}`,
            avatarUrl: organization.avatar_url ?? null,
          }
        : null;

    const members = (membersByProject.get(project.id) ?? []).map((member) => {
      if (member.contact_id) {
        const contactMember = contactMap.get(member.contact_id);
        return {
          id: member.id,
          label: contactMember?.full_name ?? contactMember?.email ?? member.contact_id,
          avatarUrl: contactMember?.avatar_url ?? null,
        };
      }
      if (member.user_id) {
        const profile = profileMap.get(member.user_id);
        return {
          id: member.id,
          label: profile?.display_name ?? member.user_id,
          avatarUrl: profile?.avatar_url ?? null,
        };
      }
      return {
        id: member.id,
        label: "?",
        avatarUrl: null,
      };
    });

    const progressSegments = (tasksByProject.get(project.id) ?? []).map((task) => {
      const slug = (task.task_status_slug ?? "").trim().toLowerCase();
      const isDone = slug === "done";
      const isCancelled = slug === "cancelled";
      const overdue = !isDone && !isCancelled && !!task.due_date && new Date(task.due_date).getTime() < now;
      return {
        id: task.id,
        state: isDone ? "done" : overdue ? "overdue" : isCancelled ? "cancelled" : "todo",
      } as const;
    });

    return {
      id: project.id,
      name: project.name,
      archivedAt: project.archived_at,
      proposedEndDate: project.proposed_end_date,
      statusTerm,
      projectTypeTerm: typeTerm,
      client,
      members,
      progressSegments,
    } satisfies ProjectListRow;
  });

  return <ProjectsListClient initialRows={rows} statusTerms={statusTerms.map((term) => toTerm(term)).filter((term): term is ProjectListTerm => term != null)} />;
}
