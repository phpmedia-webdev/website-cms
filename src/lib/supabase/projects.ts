/**
 * Projects and tasks (Phase 19 Project Management).
 * Reads via RPC; writes via .schema().from(). Auto-extends project end when task due_date > project proposed_end_date.
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";

const PROJECTS_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export type ProjectStatus = "new" | "active" | "closed" | "perpetual";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskType = "default" | "support_ticket";
export type TaskPriority = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  end_date_extended: boolean;
  potential_sales: number | null;
  required_mag_id: string | null;
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
  status: TaskStatus;
  task_type: TaskType;
  priority: TaskPriority;
  proposed_time: number | null;
  actual_time: number | null;
  due_date: string | null;
  creator_id: string | null;
  responsible_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListProjectsFilters {
  status?: ProjectStatus;
  required_mag_id?: string | null;
  include_archived?: boolean;
}

export interface ListTasksFilters {
  project_id?: string | null;
  status?: TaskStatus;
  task_type?: TaskType;
  /** "My tasks" for a user (team member). */
  assignee_user_id?: string | null;
  /** "My tasks" for a contact (e.g. GPUM). */
  assignee_contact_id?: string | null;
}

export interface ProjectInsert {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  proposed_start_date?: string | null;
  proposed_end_date?: string | null;
  potential_sales?: number | null;
  required_mag_id?: string | null;
  created_by?: string | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  proposed_start_date?: string | null;
  proposed_end_date?: string | null;
  potential_sales?: number | null;
  required_mag_id?: string | null;
  archived_at?: string | null;
}

export interface TaskInsert {
  project_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  task_type?: TaskType;
  priority?: TaskPriority;
  proposed_time?: number | null;
  actual_time?: number | null;
  due_date?: string | null;
  creator_id?: string | null;
  responsible_id?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  task_type?: TaskType;
  priority?: TaskPriority;
  proposed_time?: number | null;
  actual_time?: number | null;
  due_date?: string | null;
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
    status_filter: filters.status ?? null,
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
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description ?? null,
    status: input.status ?? "new",
    proposed_start_date: input.proposed_start_date ?? null,
    proposed_end_date: input.proposed_end_date ?? null,
    potential_sales: input.potential_sales ?? null,
    required_mag_id: input.required_mag_id ?? null,
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
  if (input.status !== undefined) payload.status = input.status;
  if (input.proposed_start_date !== undefined)
    payload.proposed_start_date = input.proposed_start_date;
  if (input.proposed_end_date !== undefined)
    payload.proposed_end_date = input.proposed_end_date;
  if (input.potential_sales !== undefined)
    payload.potential_sales = input.potential_sales;
  if (input.required_mag_id !== undefined)
    payload.required_mag_id = input.required_mag_id;
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
    status_filter: filters.status ?? null,
    task_type_filter: filters.task_type ?? null,
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
  const payload: Record<string, unknown> = {
    project_id: input.project_id,
    title: input.title.trim(),
    description: input.description ?? null,
    status: input.status ?? "open",
    task_type: input.task_type ?? "default",
    priority: input.priority ?? "medium",
    proposed_time: input.proposed_time ?? null,
    actual_time: input.actual_time ?? null,
    due_date: input.due_date ?? null,
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
  if (input.status !== undefined) payload.status = input.status;
  if (input.task_type !== undefined) payload.task_type = input.task_type;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.proposed_time !== undefined)
    payload.proposed_time = input.proposed_time;
  if (input.actual_time !== undefined) payload.actual_time = input.actual_time;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
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
