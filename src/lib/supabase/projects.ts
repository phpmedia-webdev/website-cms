/**
 * Projects and tasks (Phase 19 Project Management).
 * Reads via RPC; writes via .schema().from(). Auto-extends project end when task due_date > project proposed_end_date.
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";

const PROJECTS_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Format total minutes as "X h Y min" for display. Returns "—" when null or not a number. */
export function formatMinutesAsHoursMinutes(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null || typeof totalMinutes !== "number" || totalMinutes < 0)
    return "—";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status_term_id: string;
  project_type_term_id: string | null;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  /** Estimated total time in minutes (for progress vs logged time). */
  proposed_time: number | null;
  end_date_extended: boolean;
  potential_sales: number | null;
  required_mag_id: string | null;
  contact_id: string | null;
  client_organization_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status_term_id: string;
  task_type_term_id: string;
  priority_term_id: string;
  proposed_time: number | null;
  actual_time: number | null;
  due_date: string | null;
  start_date: string | null;
  creator_id: string | null;
  responsible_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListProjectsFilters {
  status_term_id?: string | null;
  required_mag_id?: string | null;
  include_archived?: boolean;
}

export interface ListTasksFilters {
  project_id?: string | null;
  status_term_id?: string | null;
  task_type_term_id?: string | null;
  /** "My tasks" for a user (team member). */
  assignee_user_id?: string | null;
  /** "My tasks" for a contact (e.g. GPUM). */
  assignee_contact_id?: string | null;
}

export interface ProjectInsert {
  name: string;
  description?: string | null;
  status_term_id?: string | null;
  project_type_term_id?: string | null;
  proposed_start_date?: string | null;
  proposed_end_date?: string | null;
  /** Estimated time in minutes. */
  proposed_time?: number | null;
  potential_sales?: number | null;
  required_mag_id?: string | null;
  contact_id?: string | null;
  client_organization_id?: string | null;
  created_by?: string | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status_term_id?: string | null;
  project_type_term_id?: string | null;
  proposed_start_date?: string | null;
  proposed_end_date?: string | null;
  proposed_time?: number | null;
  potential_sales?: number | null;
  required_mag_id?: string | null;
  contact_id?: string | null;
  client_organization_id?: string | null;
  archived_at?: string | null;
}

export interface TaskInsert {
  project_id: string;
  title: string;
  description?: string | null;
  status_term_id?: string | null;
  task_type_term_id?: string | null;
  priority_term_id?: string | null;
  proposed_time?: number | null;
  actual_time?: number | null;
  due_date?: string | null;
  start_date?: string | null;
  creator_id?: string | null;
  responsible_id?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status_term_id?: string | null;
  task_type_term_id?: string | null;
  priority_term_id?: string | null;
  proposed_time?: number | null;
  actual_time?: number | null;
  due_date?: string | null;
  start_date?: string | null;
  responsible_id?: string | null;
}

/** List projects. Taxonomy filtering can be applied in app via taxonomy_relationships. */
export async function listProjects(
  filters: ListProjectsFilters = {},
  schema?: string
): Promise<Project[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase.rpc("get_projects_dynamic", {
    schema_name: schemaName,
    status_term_id_filter: filters.status_term_id ?? null,
    required_mag_id_filter: filters.required_mag_id ?? null,
    include_archived: filters.include_archived ?? false,
  });
  if (error) {
    console.error("listProjects error:", error);
    throw error;
  }
  return (data ?? []) as Project[];
}

/** Get a single project by ID. */
export async function getProjectById(
  id: string,
  schema?: string
): Promise<Project | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase.rpc("get_project_by_id_dynamic", {
    schema_name: schemaName,
    project_id_param: id,
  });
  if (error) {
    console.error("getProjectById error:", error);
    throw error;
  }
  const rows = (data ?? []) as Project[];
  return rows[0] ?? null;
}

/** Create a project. */
export async function createProject(
  input: ProjectInsert,
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const defaultStatusId = await getDefaultProjectStatusTermId(schemaName);
  const statusTermId = input.status_term_id ?? defaultStatusId;
  if (!statusTermId) {
    return {
      error:
        "Default project status term not found. Run migration 164_project_status_and_type_as_taxonomy.sql.",
    };
  }
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description ?? null,
    status_term_id: statusTermId,
    project_type_term_id: input.project_type_term_id ?? null,
    proposed_start_date: input.proposed_start_date ?? null,
    proposed_end_date: input.proposed_end_date ?? null,
    proposed_time: input.proposed_time ?? null,
    potential_sales: input.potential_sales ?? null,
    required_mag_id: input.required_mag_id ?? null,
    contact_id: input.contact_id ?? null,
    client_organization_id: input.client_organization_id ?? null,
    created_by: input.created_by ?? null,
  };
  const { data, error } = await supabase
    .schema(schemaName)
    .from("projects")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("createProject error:", error);
    return { error: error.message };
  }
  return { id: data.id };
}

/**
 * Get or create the perpetual Support project for a contact (GPUM).
 * One Support project per contact; all their support_ticket tasks link to it.
 */
export async function getOrCreateSupportProjectForContact(
  contactId: string,
  schema?: string
): Promise<{ id: string; created: boolean } | { error: string }> {
  const perpetualTermId = await getProjectStatusTermIdBySlug("perpetual", schema);
  if (!perpetualTermId) {
    return { error: "Project status term 'perpetual' not found. Run migration 164." };
  }
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data: existing, error: findErr } = await supabase
    .schema(schemaName)
    .from("projects")
    .select("id")
    .eq("status_term_id", perpetualTermId)
    .eq("contact_id", contactId)
    .maybeSingle();
  if (findErr) {
    console.error("getOrCreateSupportProjectForContact find error:", findErr);
    return { error: findErr.message };
  }
  if (existing?.id) {
    return { id: existing.id, created: false };
  }
  const supportTypeTermId = await getProjectTypeTermIdBySlug("support", schema);
  const created = await createProject(
    {
      name: "Support",
      description: null,
      status_term_id: perpetualTermId,
      project_type_term_id: supportTypeTermId ?? null,
      contact_id: contactId,
    },
    schemaName
  );
  if ("error" in created) return created;
  return { id: created.id, created: true };
}

/** Update a project. */
export async function updateProject(
  id: string,
  input: ProjectUpdate,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description;
  if (input.status_term_id !== undefined) payload.status_term_id = input.status_term_id;
  if (input.project_type_term_id !== undefined)
    payload.project_type_term_id = input.project_type_term_id;
  if (input.proposed_start_date !== undefined)
    payload.proposed_start_date = input.proposed_start_date;
  if (input.proposed_end_date !== undefined)
    payload.proposed_end_date = input.proposed_end_date;
  if (input.proposed_time !== undefined) payload.proposed_time = input.proposed_time;
  if (input.potential_sales !== undefined)
    payload.potential_sales = input.potential_sales;
  if (input.required_mag_id !== undefined)
    payload.required_mag_id = input.required_mag_id;
  if (input.contact_id !== undefined) payload.contact_id = input.contact_id;
  if (input.client_organization_id !== undefined)
    payload.client_organization_id = input.client_organization_id;
  if (input.archived_at !== undefined) payload.archived_at = input.archived_at;

  const { error } = await supabase
    .schema(schemaName)
    .from("projects")
    .update(payload)
    .eq("id", id);
  if (error) {
    console.error("updateProject error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** Delete a project (cascades to tasks and task_followers). */
export async function deleteProject(
  id: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("projects")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("deleteProject error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** Project member (team user or CRM contact) with optional role from Project Roles taxonomy. */
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  contact_id: string | null;
  role_term_id: string | null;
  created_at: string;
}

/** List members for a project. Returns raw rows; caller can join role term label and user/contact display names. */
export async function listProjectMembers(
  projectId: string,
  schema?: string
): Promise<ProjectMember[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("project_members")
    .select("id, project_id, user_id, contact_id, role_term_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listProjectMembers error:", error);
    return [];
  }
  return (data ?? []) as ProjectMember[];
}

/** Add a member to a project. Exactly one of user_id or contact_id must be set. */
export async function addProjectMember(
  projectId: string,
  payload: { user_id?: string | null; contact_id?: string | null; role_term_id?: string | null },
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const hasUser = payload.user_id != null && payload.user_id !== "";
  const hasContact = payload.contact_id != null && payload.contact_id !== "";
  if (hasUser === hasContact) {
    return { error: "Exactly one of user_id or contact_id must be set." };
  }
  const row = {
    project_id: projectId,
    user_id: hasUser ? payload.user_id : null,
    contact_id: hasContact ? payload.contact_id : null,
    role_term_id: payload.role_term_id ?? null,
  };
  const { data, error } = await supabase
    .schema(schemaName)
    .from("project_members")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    console.error("addProjectMember error:", error);
    return { error: error.message };
  }
  return { id: data.id };
}

/** Remove a project member by row id. */
export async function removeProjectMember(
  memberId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("project_members")
    .delete()
    .eq("id", memberId);
  if (error) {
    console.error("removeProjectMember error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** List tasks (by project, or "my tasks" when assignee_user_id/assignee_contact_id set). */
export async function listTasks(
  filters: ListTasksFilters = {},
  schema?: string
): Promise<Task[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase.rpc("get_tasks_dynamic", {
    schema_name: schemaName,
    project_id_param: filters.project_id ?? null,
    status_term_id_filter: filters.status_term_id ?? null,
    task_type_term_id_filter: filters.task_type_term_id ?? null,
    assignee_user_id: filters.assignee_user_id ?? null,
    assignee_contact_id: filters.assignee_contact_id ?? null,
  });
  if (error) {
    console.error("listTasks error:", error);
    throw error;
  }
  return (data ?? []) as Task[];
}

/** Get a single task by ID. */
export async function getTaskById(
  id: string,
  schema?: string
): Promise<Task | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase.rpc("get_task_by_id_dynamic", {
    schema_name: schemaName,
    task_id_param: id,
  });
  if (error) {
    console.error("getTaskById error:", error);
    throw error;
  }
  const rows = (data ?? []) as Task[];
  return rows[0] ?? null;
}

/** Task follower (creator, responsible, or follower). Exactly one of user_id or contact_id. */
export interface TaskFollower {
  id: string;
  task_id: string;
  role: "creator" | "responsible" | "follower";
  user_id: string | null;
  contact_id: string | null;
  created_at: string;
}

/** List followers for a task. */
export async function getTaskFollowers(
  taskId: string,
  schema?: string
): Promise<TaskFollower[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_followers")
    .select("id, task_id, role, user_id, contact_id, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getTaskFollowers error:", error);
    return [];
  }
  return (data as TaskFollower[]) ?? [];
}

/** Add a follower to a task. Exactly one of user_id or contact_id must be set. */
export async function addTaskFollower(
  taskId: string,
  payload: { role: "creator" | "responsible" | "follower"; user_id?: string | null; contact_id?: string | null },
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const hasUser = payload.user_id != null && payload.user_id !== "";
  const hasContact = payload.contact_id != null && payload.contact_id !== "";
  if (hasUser === hasContact) {
    return { error: "Exactly one of user_id or contact_id must be set." };
  }
  const row = {
    task_id: taskId,
    role: payload.role,
    user_id: hasUser ? payload.user_id : null,
    contact_id: hasContact ? payload.contact_id : null,
  };
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_followers")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    console.error("addTaskFollower error:", error);
    return { error: error.message };
  }
  return { id: data.id };
}

/** Remove a follower by row id. */
export async function deleteTaskFollower(
  followerId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { error } = await supabase
    .schema(schemaName)
    .from("task_followers")
    .delete()
    .eq("id", followerId);
  if (error) {
    console.error("deleteTaskFollower error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** Get task IDs where this contact is a follower (creator, responsible, or follower). For member activity stream. */
export async function getTaskIdsForContact(
  contactId: string,
  schema?: string
): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_followers")
    .select("task_id")
    .eq("contact_id", contactId);
  if (error) {
    console.error("getTaskIdsForContact error:", error);
    return [];
  }
  const rows = (data ?? []) as { task_id: string }[];
  return [...new Set(rows.map((r) => r.task_id))];
}

/** Get one contact_id for a task from task_followers (for task thread note ownership). Returns null if none. */
export async function getFirstTaskFollowerContactId(
  taskId: string,
  schema?: string
): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_followers")
    .select("contact_id")
    .eq("task_id", taskId)
    .not("contact_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("getFirstTaskFollowerContactId error:", error);
    return null;
  }
  const row = data as { contact_id: string } | null;
  return row?.contact_id ?? null;
}

/** Task priority term (from taxonomy, section task_priority). */
export interface TaskPriorityTerm {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

/** Get task priority terms for the task_priority section (Settings → Taxonomy). */
export async function getTaskPriorityTerms(
  schema?: string
): Promise<TaskPriorityTerm[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("taxonomy_terms")
    .select("id, name, slug, color")
    .eq("type", "tag")
    .contains("suggested_sections", ["task_priority"])
    .order("slug", { ascending: true });
  if (error) {
    console.error("getTaskPriorityTerms error:", error);
    return [];
  }
  return (data ?? []) as TaskPriorityTerm[];
}

/** Default priority term id (slug 'medium') for task create when not provided. */
export async function getDefaultTaskPriorityTermId(
  schema?: string
): Promise<string | null> {
  const terms = await getTaskPriorityTerms(schema);
  const medium = terms.find((t) => t.slug === "medium");
  return medium?.id ?? null;
}

/** Term with id, name, slug, color for status/type dropdowns (category terms from taxonomy). */
export interface StatusOrTypeTerm {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

/** Get category terms for a section (task_status, task_type, project_status, project_type). */
export async function getTermsForSection(
  sectionName: string,
  schema?: string
): Promise<StatusOrTypeTerm[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("taxonomy_terms")
    .select("id, name, slug, color")
    .eq("type", "category")
    .contains("suggested_sections", [sectionName])
    .order("slug", { ascending: true });
  if (error) {
    console.error("getTermsForSection error:", error);
    return [];
  }
  return (data ?? []) as StatusOrTypeTerm[];
}

export const getTaskStatusTerms = (schema?: string) =>
  getTermsForSection("task_status", schema);
export const getTaskTypeTerms = (schema?: string) =>
  getTermsForSection("task_type", schema);
export const getProjectStatusTerms = (schema?: string) =>
  getTermsForSection("project_status", schema);
export const getProjectTypeTerms = (schema?: string) =>
  getTermsForSection("project_type", schema);
export const getProjectRoleTerms = (schema?: string) =>
  getTermsForSection("project_roles", schema);

export async function getDefaultTaskStatusTermId(
  schema?: string
): Promise<string | null> {
  const terms = await getTaskStatusTerms(schema);
  return terms.find((t) => t.slug === "open")?.id ?? null;
}
export async function getDefaultTaskTypeTermId(
  schema?: string
): Promise<string | null> {
  const terms = await getTaskTypeTerms(schema);
  return terms.find((t) => t.slug === "default")?.id ?? null;
}
export async function getDefaultProjectStatusTermId(
  schema?: string
): Promise<string | null> {
  const terms = await getProjectStatusTerms(schema);
  return terms.find((t) => t.slug === "new")?.id ?? null;
}
export async function getProjectStatusTermIdBySlug(
  slug: string,
  schema?: string
): Promise<string | null> {
  const terms = await getProjectStatusTerms(schema);
  return terms.find((t) => t.slug === slug)?.id ?? null;
}
export async function getTaskTypeTermIdBySlug(
  slug: string,
  schema?: string
): Promise<string | null> {
  const terms = await getTaskTypeTerms(schema);
  return terms.find((t) => t.slug === slug)?.id ?? null;
}
export async function getProjectTypeTermIdBySlug(
  slug: string,
  schema?: string
): Promise<string | null> {
  const terms = await getProjectTypeTerms(schema);
  return terms.find((t) => t.slug === slug)?.id ?? null;
}

/** Resolve a taxonomy term id to its display name (e.g. for activity log). */
export async function getTermNameById(
  termId: string,
  schema?: string
): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("taxonomy_terms")
    .select("name")
    .eq("id", termId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { name: string }).name ?? null;
}

/**
 * If task due_date > project proposed_end_date, set project end_date_extended = true
 * and optionally update project proposed_end_date to the task due_date.
 */
async function maybeExtendProjectEndDate(
  projectId: string,
  dueDate: string | null,
  schemaName: string
): Promise<void> {
  if (!dueDate) return;
  const project = await getProjectById(projectId, schemaName);
  if (!project?.proposed_end_date) return;
  const due = new Date(dueDate);
  const end = new Date(project.proposed_end_date);
  if (due <= end) return;
  const supabase = createServerSupabaseClient();
  await supabase
    .schema(schemaName)
    .from("projects")
    .update({
      end_date_extended: true,
      proposed_end_date: dueDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}

/** Create a task. Auto-extends project proposed_end_date when task due_date > project proposed_end_date. */
export async function createTask(
  input: TaskInsert,
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const [defaultPriorityId, defaultStatusId, defaultTypeId] = await Promise.all([
    getDefaultTaskPriorityTermId(schemaName),
    getDefaultTaskStatusTermId(schemaName),
    getDefaultTaskTypeTermId(schemaName),
  ]);
  const priorityTermId = input.priority_term_id ?? defaultPriorityId;
  const statusTermId = input.status_term_id ?? defaultStatusId;
  const taskTypeTermId = input.task_type_term_id ?? defaultTypeId;
  if (!priorityTermId) {
    return {
      error:
        "Default task priority term not found. Run migration 161_task_priority_as_taxonomy.sql.",
    };
  }
  if (!statusTermId) {
    return {
      error:
        "Default task status term not found. Run migration 163_task_status_and_type_as_taxonomy.sql.",
    };
  }
  if (!taskTypeTermId) {
    return {
      error:
        "Default task type term not found. Run migration 163_task_status_and_type_as_taxonomy.sql.",
    };
  }
  const payload: Record<string, unknown> = {
    project_id: input.project_id,
    title: input.title.trim(),
    description: input.description ?? null,
    status_term_id: statusTermId,
    task_type_term_id: taskTypeTermId,
    priority_term_id: priorityTermId,
    proposed_time: input.proposed_time ?? null,
    actual_time: input.actual_time ?? null,
    due_date: input.due_date ?? null,
    start_date: input.start_date ?? null,
    creator_id: input.creator_id ?? null,
    responsible_id: input.responsible_id ?? null,
  };
  const { data, error } = await supabase
    .schema(schemaName)
    .from("tasks")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("createTask error:", error);
    return { error: error.message };
  }
  await maybeExtendProjectEndDate(
    input.project_id,
    input.due_date ?? null,
    schemaName
  );
  return { id: data.id };
}

/** Update a task. Auto-extends project when due_date is extended past project proposed_end_date. */
export async function updateTask(
  id: string,
  input: TaskUpdate,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const existing = await getTaskById(id, schemaName);
  if (!existing) return { error: "Task not found" };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description;
  if (input.status_term_id !== undefined) payload.status_term_id = input.status_term_id;
  if (input.task_type_term_id !== undefined)
    payload.task_type_term_id = input.task_type_term_id;
  if (input.priority_term_id !== undefined)
    payload.priority_term_id = input.priority_term_id;
  if (input.proposed_time !== undefined)
    payload.proposed_time = input.proposed_time;
  if (input.actual_time !== undefined) payload.actual_time = input.actual_time;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.start_date !== undefined) payload.start_date = input.start_date;
  if (input.responsible_id !== undefined)
    payload.responsible_id = input.responsible_id;

  const { error } = await supabase
    .schema(schemaName)
    .from("tasks")
    .update(payload)
    .eq("id", id);
  if (error) {
    console.error("updateTask error:", error);
    return { error: error.message };
  }
  const newDue = input.due_date !== undefined ? input.due_date : existing.due_date;
  await maybeExtendProjectEndDate(existing.project_id, newDue ?? null, schemaName);
  return { ok: true };
}

/** Delete a task. */
export async function deleteTask(
  id: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("tasks")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("deleteTask error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Task time logs (Phase 19 expansion). Not in activity stream.
// ---------------------------------------------------------------------------

export interface TaskTimeLog {
  id: string;
  task_id: string;
  user_id: string | null;
  contact_id: string | null;
  log_date: string;
  minutes: number;
  note: string | null;
  created_at: string;
}

export interface TaskTimeLogInsert {
  log_date: string;
  minutes: number;
  note?: string | null;
  user_id?: string | null;
  contact_id?: string | null;
}

export interface TaskTimeLogUpdate {
  log_date?: string;
  minutes?: number;
  note?: string | null;
}

/** Get a single time log by id (for API auth: verify task_id matches). */
export async function getTaskTimeLogById(
  logId: string,
  schema?: string
): Promise<TaskTimeLog | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_time_logs")
    .select("id, task_id, user_id, contact_id, log_date, minutes, note, created_at")
    .eq("id", logId)
    .maybeSingle();
  if (error) {
    console.error("getTaskTimeLogById error:", error);
    return null;
  }
  return data as TaskTimeLog | null;
}

/** List time log entries for a task, newest first. */
export async function listTaskTimeLogs(
  taskId: string,
  schema?: string
): Promise<TaskTimeLog[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_time_logs")
    .select("id, task_id, user_id, contact_id, log_date, minutes, note, created_at")
    .eq("task_id", taskId)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listTaskTimeLogs error:", error);
    return [];
  }
  return (data ?? []) as TaskTimeLog[];
}

/** Create a time log entry for a task. */
export async function createTaskTimeLog(
  taskId: string,
  input: TaskTimeLogInsert,
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  if (input.minutes < 0) return { error: "Minutes must be >= 0" };
  const payload = {
    task_id: taskId,
    log_date: input.log_date,
    minutes: input.minutes,
    note: input.note ?? null,
    user_id: input.user_id ?? null,
    contact_id: input.contact_id ?? null,
  };
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_time_logs")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("createTaskTimeLog error:", error);
    return { error: error.message };
  }
  return { id: data.id };
}

/** Update a time log entry. */
export async function updateTaskTimeLog(
  logId: string,
  input: TaskTimeLogUpdate,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const payload: Record<string, unknown> = {};
  if (input.log_date !== undefined) payload.log_date = input.log_date;
  if (input.minutes !== undefined) {
    if (input.minutes < 0) return { error: "Minutes must be >= 0" };
    payload.minutes = input.minutes;
  }
  if (input.note !== undefined) payload.note = input.note;
  if (Object.keys(payload).length === 0) return { ok: true };
  const { error } = await supabase
    .schema(schemaName)
    .from("task_time_logs")
    .update(payload)
    .eq("id", logId);
  if (error) {
    console.error("updateTaskTimeLog error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** Delete a time log entry. */
export async function deleteTaskTimeLog(
  logId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("task_time_logs")
    .delete()
    .eq("id", logId);
  if (error) {
    console.error("deleteTaskTimeLog error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** Total logged minutes for a single task. */
export async function getTaskTimeLogTotalMinutes(
  taskId: string,
  schema?: string
): Promise<number> {
  const logs = await listTaskTimeLogs(taskId, schema);
  return logs.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
}

/** Total logged minutes for all tasks in a project (rolled-up project total). */
export async function getProjectTimeLogTotalMinutes(
  projectId: string,
  schema?: string
): Promise<number> {
  const tasks = await listTasks({ project_id: projectId }, schema);
  const taskIds = tasks.map((t) => t.id);
  if (taskIds.length === 0) return 0;
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_time_logs")
    .select("minutes")
    .in("task_id", taskIds);
  if (error) {
    console.error("getProjectTimeLogTotalMinutes error:", error);
    return 0;
  }
  const rows = (data ?? []) as { minutes: number }[];
  return rows.reduce((sum, r) => sum + (r.minutes ?? 0), 0);
}
