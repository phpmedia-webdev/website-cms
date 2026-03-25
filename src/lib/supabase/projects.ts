/**
 * Projects and tasks (Phase 19 Project Management).
 * Reads via RPC; writes via .schema().from(). Auto-extends project due_date when task due_date > project due_date.
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";
import { shouldIncludeProjectForEventLink } from "@/lib/projects/project-status-for-event-link";
import { getCustomizerOptions, type CustomizerOptionRowServer } from "@/lib/supabase/settings";
import { normalizeHex } from "@/lib/event-type-colors";

const PROJECTS_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Customizer defaults (migration 179 / Settings → Customizer) when slugs are omitted on create. */
export const DEFAULT_TASK_STATUS_SLUG = "to_do";
export const DEFAULT_TASK_TYPE_SLUG = "task";
export const DEFAULT_TASK_PHASE_SLUG = "backlog";

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
  /**
   * Human-readable reference (PROJ-YYYY-NNNNN; NNNNN resets each UTC calendar year — migration **200**).
   * Until migration 200 is applied, RPC rows may omit this; use `projectDisplayRef` for UI.
   */
  project_number?: string | null;
  name: string;
  description: string | null;
  status_term_id: string;
  project_type_term_id: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  /** Planned time in minutes (DB column; UI may show task rollup instead). */
  planned_time: number | null;
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

/**
 * Value for the admin projects list “Due date” column: **`projects.due_date`** (migration **199**).
 * If the tenant RPC still returns the legacy column, falls back to **`proposed_end_date`** until SQL is applied.
 */
/** Shown in admin UI when `project_number` is not yet backfilled (pre–migration 200). */
export function projectDisplayRef(project: Pick<Project, "id" | "project_number">): string {
  const n = project.project_number?.trim();
  if (n) return n;
  return `${project.id.slice(0, 8)}…`;
}

export function projectDueDateForAdminList(project: unknown): string | null {
  if (!project || typeof project !== "object") return null;
  const p = project as Record<string, unknown>;
  const pick = (key: string): string | null => {
    const v = p[key];
    if (v == null) return null;
    const s = String(v).trim();
    return s.length > 0 ? s : null;
  };
  return pick("due_date") ?? pick("proposed_end_date");
}

export interface Task {
  id: string;
  project_id: string;
  /** Human-readable reference (TASK-YYYY-NNNNN; NNNNN resets each UTC calendar year — migration 194). Immutable; use `id` for FKs. */
  task_number: string;
  title: string;
  description: string | null;
  /** Settings → Customizer scope `task_status`. */
  task_status_slug: string;
  /** Settings → Customizer scope `task_type`. */
  task_type_slug: string;
  /** Settings → Customizer scope `task_phase`. */
  task_phase_slug: string;
  priority_term_id: string;
  planned_time: number | null;
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
  /** When set and non-empty, restrict to these projects. Null/omit = no project constraint (caller should scope). */
  project_ids?: string[] | null;
  /** Lowercased Customizer slugs (task_status). */
  status_slugs?: string[] | null;
  /** Lowercased Customizer slugs (task_type). */
  type_slugs?: string[] | null;
  /** Lowercased Customizer slugs (task_phase). */
  phase_slugs?: string[] | null;
  assignee_user_ids?: string[] | null;
  assignee_contact_ids?: string[] | null;
  /**
   * Lowercased task_status slugs to **exclude** (AND NOT IN). All Tasks presets: hide `completed`.
   * Requires migration `198_get_tasks_dynamic_preset_filters.sql`.
   */
  exclude_status_slugs?: string[] | null;
  /**
   * Keep tasks with `due_date IS NOT NULL` and `due_date < due_before` (date only, exclusive).
   * Use client **local calendar** `YYYY-MM-DD` for “today” when implementing overdue lists.
   */
  due_before?: string | null;
}

export interface ProjectInsert {
  name: string;
  /** Optional import; normally assigned by DB trigger (PROJ-YYYY-NNNNN). */
  project_number?: string | null;
  description?: string | null;
  status_term_id?: string | null;
  project_type_term_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  /** Planned time in minutes. */
  planned_time?: number | null;
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
  start_date?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  planned_time?: number | null;
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
  task_status_slug?: string | null;
  task_type_slug?: string | null;
  task_phase_slug?: string | null;
  priority_term_id?: string | null;
  planned_time?: number | null;
  actual_time?: number | null;
  due_date?: string | null;
  start_date?: string | null;
  creator_id?: string | null;
  responsible_id?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  task_status_slug?: string | null;
  task_type_slug?: string | null;
  task_phase_slug?: string | null;
  priority_term_id?: string | null;
  planned_time?: number | null;
  actual_time?: number | null;
  due_date?: string | null;
  start_date?: string | null;
  responsible_id?: string | null;
}

/** Until `202_rpc_planned_time_column.sql`, RPC rows may still use `proposed_time`. */
function rpcPlannedMinutes(row: Record<string, unknown>): number | null {
  if (typeof row.planned_time === "number") return row.planned_time;
  if (typeof row.proposed_time === "number") return row.proposed_time;
  return null;
}

function normalizeTaskFromRpc(row: unknown): Task {
  const r = row as Record<string, unknown>;
  const normalized = { ...r, planned_time: rpcPlannedMinutes(r) } as Record<string, unknown>;
  delete normalized.proposed_time;
  return normalized as unknown as Task;
}

function normalizeProjectFromRpc(row: unknown): Project {
  const r = row as Record<string, unknown>;
  const normalized = { ...r, planned_time: rpcPlannedMinutes(r) } as Record<string, unknown>;
  delete normalized.proposed_time;
  return normalized as unknown as Project;
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
  return (data ?? []).map(normalizeProjectFromRpc);
}

/** Minimal project row for linking an event (excludes complete/archived status slugs; see project-status-for-event-link). */
export interface ProjectForEventLink {
  id: string;
  name: string;
  status_slug: string | null;
}

/**
 * Projects eligible to attach to a calendar event: not soft-deleted by archived_at,
 * and status taxonomy slug not in excluded list (e.g. complete, archived).
 */
export async function listProjectsForEventLinking(
  schema?: string
): Promise<ProjectForEventLink[]> {
  const all = await listProjects({ include_archived: true }, schema);
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const statusIds = [...new Set(all.map((p) => p.status_term_id).filter(Boolean))];

  let idToSlug = new Map<string, string>();
  if (statusIds.length > 0) {
    const { data: terms, error } = await supabase
      .schema(schemaName)
      .from("taxonomy_terms")
      .select("id, slug")
      .in("id", statusIds);
    if (error) {
      console.error("listProjectsForEventLinking taxonomy_terms:", error);
    } else {
      idToSlug = new Map(
        (terms ?? []).map((t: { id: string; slug: string }) => [t.id, t.slug])
      );
    }
  }

  return all
    .filter((p) => {
      if (p.archived_at) return false;
      const slug = idToSlug.get(p.status_term_id) ?? null;
      return shouldIncludeProjectForEventLink(slug);
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      status_slug: idToSlug.get(p.status_term_id) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
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
  const rows = (data ?? []) as unknown[];
  const first = rows[0];
  return first != null ? normalizeProjectFromRpc(first) : null;
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
    ...(input.project_number != null && String(input.project_number).trim() !== ""
      ? { project_number: String(input.project_number).trim() }
      : {}),
    description: input.description ?? null,
    status_term_id: statusTermId,
    project_type_term_id: input.project_type_term_id ?? null,
    start_date: input.start_date ?? null,
    due_date: input.due_date ?? null,
    completed_date: input.completed_date ?? null,
    planned_time: input.planned_time ?? null,
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
  if (input.start_date !== undefined) payload.start_date = input.start_date;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.completed_date !== undefined) payload.completed_date = input.completed_date;
  if (input.planned_time !== undefined) payload.planned_time = input.planned_time;
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

/** List members for many projects in one query. */
export async function listProjectMembersByProjectIds(
  projectIds: string[],
  schema?: string
): Promise<ProjectMember[]> {
  if (projectIds.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("project_members")
    .select("id, project_id, user_id, contact_id, role_term_id, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listProjectMembersByProjectIds error:", error);
    return [];
  }
  return (data ?? []) as ProjectMember[];
}

/** List tasks for many projects in one query, limited to fields used by list views. */
export async function listTasksByProjectIds(
  projectIds: string[],
  schema?: string
): Promise<Pick<Task, "id" | "project_id" | "task_status_slug" | "due_date">[]> {
  if (projectIds.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase
    .schema(schemaName)
    .from("tasks")
    .select("id, project_id, task_status_slug, due_date")
    .in("project_id", projectIds)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) {
    console.error("listTasksByProjectIds error:", error);
    return [];
  }
  return (data ?? []) as Pick<Task, "id" | "project_id" | "task_number" | "task_status_slug" | "due_date">[];
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

/**
 * List tasks via public.get_tasks_dynamic (Customizer slug filters).
 * Requires migration `187_tasks_customizer_slugs.sql` (replaces term-id filters from 185/186).
 * Excludes tasks on archived projects (`197_get_tasks_dynamic_exclude_archived_projects.sql`).
 * Optional exclude / due-before filters: `198_get_tasks_dynamic_preset_filters.sql`.
 */
export async function listTasks(
  filters: ListTasksFilters = {},
  schema?: string
): Promise<Task[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const pack = (ids: string[] | null | undefined) =>
    ids != null && ids.length > 0 ? ids : null;
  const packSlugs = (slugs: string[] | null | undefined) => {
    if (slugs == null || slugs.length === 0) return null;
    const norm = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
    return norm.length > 0 ? norm : null;
  };

  const dueBefore =
    filters.due_before != null && String(filters.due_before).trim() !== ""
      ? String(filters.due_before).trim().slice(0, 10)
      : null;

  const { data, error } = await supabase.rpc("get_tasks_dynamic", {
    schema_name: schemaName,
    project_ids: pack(filters.project_ids ?? null),
    status_slugs: packSlugs(filters.status_slugs ?? null),
    type_slugs: packSlugs(filters.type_slugs ?? null),
    phase_slugs: packSlugs(filters.phase_slugs ?? null),
    assignee_user_ids: pack(filters.assignee_user_ids ?? null),
    assignee_contact_ids: pack(filters.assignee_contact_ids ?? null),
    exclude_status_slugs: packSlugs(filters.exclude_status_slugs ?? null),
    due_before: dueBefore,
  });
  if (error) {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    console.error(
      "listTasks error:",
      e.message ?? error,
      e.details ?? "",
      e.hint ?? "",
      e.code ?? ""
    );
    throw error;
  }
  return (data ?? []).map(normalizeTaskFromRpc);
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
  const rows = (data ?? []) as unknown[];
  const first = rows[0];
  return first != null ? normalizeTaskFromRpc(first) : null;
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

/** List followers for multiple tasks in one query (e.g. for All Tasks list assignee column). */
export async function listTaskFollowersByTaskIds(
  taskIds: string[],
  schema?: string
): Promise<TaskFollower[]> {
  if (taskIds.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? PROJECTS_SCHEMA;
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_followers")
    .select("id, task_id, role, user_id, contact_id, created_at")
    .in("task_id", taskIds)
    .order("task_id")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listTaskFollowersByTaskIds error:", error);
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
/** Category terms in the Tasks taxonomy section (phases / milestones on tasks). */
export const getTaskPhaseTerms = (schema?: string) => getTermsForSection("task", schema);
export const getProjectStatusTerms = (schema?: string) =>
  getTermsForSection("project_status", schema);
export const getProjectTypeTerms = (schema?: string) =>
  getTermsForSection("project_type", schema);

/**
 * Overlay Customizer (scope `project_status`) labels and colors onto taxonomy terms by slug.
 */
function applyCustomizerLabelsToProjectStatusTerms(
  taxonomyTerms: StatusOrTypeTerm[],
  czRows: CustomizerOptionRowServer[]
): StatusOrTypeTerm[] {
  const czBySlug = new Map<string, CustomizerOptionRowServer>();
  for (const r of czRows) {
    const s = String(r.slug ?? "").trim().toLowerCase();
    if (s) czBySlug.set(s, r);
  }
  return taxonomyTerms.map((term) => {
    const cz = czBySlug.get(term.slug.trim().toLowerCase());
    if (!cz) return term;
    const name =
      cz.label != null && String(cz.label).trim() ? String(cz.label).trim() : term.name;
    const rawColor = cz.color != null ? String(cz.color).trim() : "";
    const color = rawColor ? normalizeHex(rawColor) : term.color;
    return { ...term, name, color };
  });
}

/** One row for the admin projects list status filter (Customizer scope `project_status`, ordered by `display_order`). */
export interface ProjectStatusFilterOption {
  slug: string;
  label: string;
  color: string | null;
}

/**
 * Build status filter dropdown options from Customizer only (all rows, in list order).
 * Filtering compares `projects.status_term_id` → taxonomy term slug to `slug` (so customizer and taxonomy can diverge;
 * unmapped slugs still appear and match projects only when taxonomy has the same slug).
 */
export function projectStatusFilterOptionsFromCustomizerRows(
  czRows: CustomizerOptionRowServer[]
): ProjectStatusFilterOption[] {
  const seen = new Set<string>();
  const out: ProjectStatusFilterOption[] = [];
  for (const row of czRows) {
    const slug = String(row.slug ?? "").trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const label =
      row.label != null && String(row.label).trim() ? String(row.label).trim() : slug;
    const rawColor = row.color != null ? String(row.color).trim() : "";
    const color = rawColor ? normalizeHex(rawColor) : null;
    out.push({ slug, label, color });
  }
  return out;
}

/** Load project status for admin projects list: filter options = Customizer rows; row badges = taxonomy + customizer overlay. */
export async function getAdminProjectStatusTermsForList(schema?: string): Promise<{
  statusFilterOptions: ProjectStatusFilterOption[];
  displayById: Map<string, StatusOrTypeTerm>;
}> {
  const schemaName = schema ?? getClientSchema();
  const [czRows, taxonomyTerms] = await Promise.all([
    getCustomizerOptions("project_status", schemaName),
    getProjectStatusTerms(schemaName),
  ]);
  const displayTerms = applyCustomizerLabelsToProjectStatusTerms(taxonomyTerms, czRows);
  const displayById = new Map(displayTerms.map((t) => [t.id, t]));
  let statusFilterOptions = projectStatusFilterOptionsFromCustomizerRows(czRows);
  if (statusFilterOptions.length === 0 && taxonomyTerms.length > 0) {
    statusFilterOptions = [...taxonomyTerms]
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((t) => ({
        slug: t.slug.trim().toLowerCase(),
        label: t.name,
        color: t.color,
      }));
  }
  return { statusFilterOptions, displayById };
}
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
 * If task due_date > project due_date, set project end_date_extended = true
 * and optionally update project due_date to the task due_date.
 */
async function maybeExtendProjectEndDate(
  projectId: string,
  dueDate: string | null,
  schemaName: string
): Promise<void> {
  if (!dueDate) return;
  const project = await getProjectById(projectId, schemaName);
  if (!project?.due_date) return;
  const due = new Date(dueDate);
  const end = new Date(project.due_date);
  if (due <= end) return;
  const supabase = createServerSupabaseClient();
  await supabase
    .schema(schemaName)
    .from("projects")
    .update({
      end_date_extended: true,
      due_date: dueDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}

/** Create a task. Auto-extends project due_date when task due_date > project due_date. */
export async function createTask(
  input: TaskInsert,
  schema?: string
): Promise<{ id: string; task_number: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const defaultPriorityId = await getDefaultTaskPriorityTermId(schemaName);
  const priorityTermId = input.priority_term_id ?? defaultPriorityId;
  const taskStatusSlug =
    (input.task_status_slug != null && String(input.task_status_slug).trim()
      ? String(input.task_status_slug).trim().toLowerCase()
      : null) ?? DEFAULT_TASK_STATUS_SLUG;
  const taskTypeSlug =
    (input.task_type_slug != null && String(input.task_type_slug).trim()
      ? String(input.task_type_slug).trim().toLowerCase()
      : null) ?? DEFAULT_TASK_TYPE_SLUG;
  const taskPhaseSlug =
    (input.task_phase_slug != null && String(input.task_phase_slug).trim()
      ? String(input.task_phase_slug).trim().toLowerCase()
      : null) ?? DEFAULT_TASK_PHASE_SLUG;
  if (!priorityTermId) {
    return {
      error:
        "Default task priority term not found. Run migration 161_task_priority_as_taxonomy.sql.",
    };
  }
  const payload: Record<string, unknown> = {
    project_id: input.project_id,
    title: input.title.trim(),
    description: input.description ?? null,
    task_status_slug: taskStatusSlug,
    task_type_slug: taskTypeSlug,
    task_phase_slug: taskPhaseSlug,
    priority_term_id: priorityTermId,
    planned_time: input.planned_time ?? null,
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
    .select("id, task_number")
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
  return { id: data.id, task_number: data.task_number as string };
}

/** Update a task. Auto-extends project when due_date is extended past project due_date. */
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
  if (input.task_status_slug !== undefined)
    payload.task_status_slug =
      input.task_status_slug != null && String(input.task_status_slug).trim()
        ? String(input.task_status_slug).trim().toLowerCase()
        : DEFAULT_TASK_STATUS_SLUG;
  if (input.task_type_slug !== undefined)
    payload.task_type_slug =
      input.task_type_slug != null && String(input.task_type_slug).trim()
        ? String(input.task_type_slug).trim().toLowerCase()
        : DEFAULT_TASK_TYPE_SLUG;
  if (input.task_phase_slug !== undefined)
    payload.task_phase_slug =
      input.task_phase_slug != null && String(input.task_phase_slug).trim()
        ? String(input.task_phase_slug).trim().toLowerCase()
        : DEFAULT_TASK_PHASE_SLUG;
  if (input.priority_term_id !== undefined)
    payload.priority_term_id = input.priority_term_id;
  if (input.planned_time !== undefined) payload.planned_time = input.planned_time;
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

/** Total logged minutes per task for many tasks (e.g. for All Tasks list Progress column). */
export async function getTaskTimeLogTotalMinutesByTaskIds(
  taskIds: string[],
  schema?: string
): Promise<Record<string, number>> {
  if (taskIds.length === 0) return {};
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("task_time_logs")
    .select("task_id, minutes")
    .in("task_id", taskIds);
  if (error) {
    console.error("getTaskTimeLogTotalMinutesByTaskIds error:", error);
    return {};
  }
  const rows = (data ?? []) as { task_id: string; minutes: number | null }[];
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.task_id] = (out[r.task_id] ?? 0) + (r.minutes ?? 0);
  }
  return out;
}

/** Total logged minutes for all tasks in a project (rolled-up project total). */
export async function getProjectTimeLogTotalMinutes(
  projectId: string,
  schema?: string
): Promise<number> {
  const tasks = await listTasks({ project_ids: [projectId] }, schema);
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
