/**
 * Participants and resources for events. Read via RPC; writes via .schema().from().
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";

const DEFAULT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface Resource {
  id: string;
  name: string;
  resource_type: string;
  metadata: Record<string, unknown> | null;
  is_exclusive: boolean;
  created_at: string;
  updated_at: string;
  /** Present on rows from getResourcesAdmin / tenant table (migration 183). */
  is_schedulable_calendar?: boolean;
  is_schedulable_tasks?: boolean;
  asset_status?: string;
  archived_at?: string | null;
}

/** Full registry row for Resource manager + APIs (migration 183 fields). */
export type ResourceAdmin = Resource & {
  is_schedulable_calendar: boolean;
  is_schedulable_tasks: boolean;
  asset_status: string;
  archived_at: string | null;
};

/** Picker scope: calendar/events vs tasks (migration 183 scheduling flags). */
export type ResourcePickerContext = "calendar" | "task";

/**
 * Whether a registry row may appear in event vs task resource pickers.
 * - Not archived; not asset_status retired.
 * - calendar: schedulable on calendar unless explicitly false (matches event participant tab).
 * - task: **calendar OR task** — `is_schedulable_calendar` not false, or `is_schedulable_tasks`
 *   true (matches `TaskResourcesSection` / DB defaults where calendar is on and task off).
 */
export function resourcePassesPickerContext(
  row: ResourceAdmin,
  context: ResourcePickerContext
): boolean {
  if (row.archived_at) return false;
  const status = (row.asset_status ?? "active").trim().toLowerCase();
  if (status === "retired") return false;
  if (context === "calendar") {
    return row.is_schedulable_calendar !== false;
  }
  const forCalendar = row.is_schedulable_calendar !== false;
  const forTasks = row.is_schedulable_tasks === true;
  return forCalendar || forTasks;
}

/** Resources eligible for AutoSuggest / event or task pickers (server-filtered). */
export async function getResourcesAdminForPicker(
  context: ResourcePickerContext,
  schema?: string
): Promise<ResourceAdmin[]> {
  const all = await getResourcesAdmin(schema);
  return all.filter((r) => resourcePassesPickerContext(r, context));
}

export interface Participant {
  id: string;
  source_type: string;
  source_id: string;
  display_name: string | null;
}

/**
 * Full resource registry for the tenant (same row set as GET /api/events/resources with no `context`).
 * Uses the tenant `resources` table — not the public RPC — so rows always include migration **183** fields
 * and stay aligned with {@link getResourcesAdminForPicker} rules when you filter in app code.
 * For picker lists, use {@link getResourcesAdminForPicker} or REST `?context=calendar|task`.
 */
export async function getResources(schema?: string): Promise<Resource[]> {
  return getResourcesAdmin(schema);
}

const RESOURCE_ADMIN_COLUMNS =
  "id, name, resource_type, metadata, is_exclusive, created_at, updated_at, is_schedulable_calendar, is_schedulable_tasks, asset_status, archived_at";

/** List resources from the tenant table (includes scheduling + asset fields). Use for admin UI and enriched APIs. */
export async function getResourcesAdmin(schema?: string): Promise<ResourceAdmin[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase
    .schema(schemaName)
    .from("resources")
    .select(RESOURCE_ADMIN_COLUMNS)
    .order("name", { ascending: true });
  if (error) {
    console.error("getResourcesAdmin error:", error);
    throw error;
  }
  return (data ?? []) as ResourceAdmin[];
}

export async function getParticipants(
  schema?: string
): Promise<Participant[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_participants_dynamic", {
    schema_name: schemaName,
  });
  if (error) {
    console.error("getParticipants error:", error);
    throw error;
  }
  return (data ?? []) as Participant[];
}

export async function getEventParticipantIds(
  eventId: string,
  schema?: string
): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_event_participants_dynamic", {
    schema_name: schemaName,
    event_id_param: eventId,
  });
  if (error) {
    console.error("getEventParticipantIds error:", error);
    throw error;
  }
  const rows = (data ?? []) as { participant_id: string }[];
  return rows.map((r) => r.participant_id);
}

/** One row from event_resources / task_resources (includes optional bundle apply grouping). */
export interface ResourceAssignmentRow {
  resource_id: string;
  bundle_instance_id: string | null;
}

export async function getEventResourceIds(
  eventId: string,
  schema?: string
): Promise<string[]> {
  const rows = await getEventResourceRows(eventId, schema);
  return rows.map((r) => r.resource_id);
}

export async function getEventResourceRows(
  eventId: string,
  schema?: string
): Promise<ResourceAssignmentRow[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_event_resources_dynamic", {
    schema_name: schemaName,
    event_id_param: eventId,
  });
  if (error) {
    console.error("getEventResourceRows error:", error);
    throw error;
  }
  const rows = (data ?? []) as ResourceAssignmentRow[];
  return rows;
}

export async function getTaskResourceIds(
  taskId: string,
  schema?: string
): Promise<string[]> {
  const rows = await getTaskResourceRows(taskId, schema);
  return rows.map((r) => r.resource_id);
}

export async function getTaskResourceRows(
  taskId: string,
  schema?: string
): Promise<ResourceAssignmentRow[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_task_resources_dynamic", {
    schema_name: schemaName,
    task_id_param: taskId,
  });
  if (error) {
    console.error("getTaskResourceRows error:", error);
    throw error;
  }
  return (data ?? []) as ResourceAssignmentRow[];
}

export interface ResourceBundleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function getResourceBundles(
  schema?: string
): Promise<ResourceBundleRow[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_resource_bundles_dynamic", {
    schema_name: schemaName,
  });
  if (error) {
    console.error("getResourceBundles error:", error);
    throw error;
  }
  return (data ?? []) as ResourceBundleRow[];
}

export interface ResourceBundleItemRow {
  bundle_id: string;
  resource_id: string;
  sort_order: number;
}

export async function getResourceBundleItems(
  bundleId: string,
  schema?: string
): Promise<ResourceBundleItemRow[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_resource_bundle_items_dynamic", {
    schema_name: schemaName,
    bundle_id_param: bundleId,
  });
  if (error) {
    console.error("getResourceBundleItems error:", error);
    throw error;
  }
  return (data ?? []) as ResourceBundleItemRow[];
}

export async function getEventsParticipantAssignments(
  eventIds: string[],
  schema?: string
): Promise<Map<string, Set<string>>> {
  if (eventIds.length === 0) return new Map();
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_events_participants_bulk", {
    schema_name: schemaName,
    event_ids_param: eventIds,
  });
  if (error) {
    console.error("getEventsParticipantAssignments error:", error);
    throw error;
  }
  const rows = (data ?? []) as { event_id: string; participant_id: string }[];
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = map.get(r.event_id) ?? new Set();
    set.add(r.participant_id);
    map.set(r.event_id, set);
  }
  return map;
}

export async function getEventsResourceAssignments(
  eventIds: string[],
  schema?: string
): Promise<Map<string, Set<string>>> {
  if (eventIds.length === 0) return new Map();
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_events_resources_bulk", {
    schema_name: schemaName,
    event_ids_param: eventIds,
  });
  if (error) {
    console.error("getEventsResourceAssignments error:", error);
    throw error;
  }
  const rows = (data ?? []) as { event_id: string; resource_id: string }[];
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = map.get(r.event_id) ?? new Set();
    set.add(r.resource_id);
    map.set(r.event_id, set);
  }
  return map;
}

/** Get participant id for a team member (auth user id). Returns null if no row exists. */
export async function getParticipantIdByTeamMemberUserId(
  userId: string,
  schema?: string
): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data } = await supabase
    .schema(schemaName)
    .from("participants")
    .select("id")
    .eq("source_type", "team_member")
    .eq("source_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Ensure a participant row exists; return participant id. Creates from source_type/source_id if not exists. */
export async function ensureParticipant(
  sourceType: "crm_contact" | "team_member",
  sourceId: string,
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { data: existing } = await supabase
    .schema(schemaName)
    .from("participants")
    .select("id")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { id: existing.id };
  const { data: inserted, error } = await supabase
    .schema(schemaName)
    .from("participants")
    .insert({ source_type: sourceType, source_id: sourceId })
    .select("id")
    .single();
  if (error) {
    console.error("ensureParticipant error:", error);
    return { error: error.message };
  }
  return { id: inserted.id };
}

export async function assignParticipantToEvent(
  eventId: string,
  participantId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("event_participants")
    .insert({ event_id: eventId, participant_id: participantId });
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: true };
    }
    console.error("assignParticipantToEvent error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function unassignParticipantFromEvent(
  eventId: string,
  participantId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("participant_id", participantId);
  if (error) {
    console.error("unassignParticipantFromEvent error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function assignResourceToEvent(
  eventId: string,
  resourceId: string,
  schema?: string,
  options?: { bundleInstanceId?: string | null }
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const payload: Record<string, unknown> = {
    event_id: eventId,
    resource_id: resourceId,
  };
  if (options?.bundleInstanceId !== undefined) {
    payload.bundle_instance_id = options.bundleInstanceId;
  }
  const { error } = await supabase
    .schema(schemaName)
    .from("event_resources")
    .insert(payload);
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: true };
    }
    console.error("assignResourceToEvent error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function unassignResourceFromEvent(
  eventId: string,
  resourceId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("event_resources")
    .delete()
    .eq("event_id", eventId)
    .eq("resource_id", resourceId);
  if (error) {
    console.error("unassignResourceFromEvent error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** Remove every resource row for this event that shares the bundle apply instance. */
export async function unassignBundleInstanceFromEvent(
  eventId: string,
  bundleInstanceId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("event_resources")
    .delete()
    .eq("event_id", eventId)
    .eq("bundle_instance_id", bundleInstanceId);
  if (error) {
    console.error("unassignBundleInstanceFromEvent error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** Replace all resource rows for an event (save draft in one shot). */
export async function replaceEventResourceAssignments(
  eventId: string,
  assignments: Array<{ resource_id: string; bundle_instance_id: string | null }>,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error: delErr } = await supabase
    .schema(schemaName)
    .from("event_resources")
    .delete()
    .eq("event_id", eventId);
  if (delErr) {
    console.error("replaceEventResourceAssignments delete error:", delErr);
    return { error: delErr.message };
  }
  const seen = new Set<string>();
  const rows: Array<{
    event_id: string;
    resource_id: string;
    bundle_instance_id: string | null;
  }> = [];
  for (const a of assignments) {
    const rid = a.resource_id?.trim();
    if (!rid || seen.has(rid)) continue;
    seen.add(rid);
    rows.push({
      event_id: eventId,
      resource_id: rid,
      bundle_instance_id: a.bundle_instance_id ?? null,
    });
  }
  if (rows.length === 0) return { ok: true };
  const { error: insErr } = await supabase.schema(schemaName).from("event_resources").insert(rows);
  if (insErr) {
    console.error("replaceEventResourceAssignments insert error:", insErr);
    return { error: insErr.message };
  }
  return { ok: true };
}

export async function assignResourceToTask(
  taskId: string,
  resourceId: string,
  schema?: string,
  options?: { bundleInstanceId?: string | null }
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const payload: Record<string, unknown> = {
    task_id: taskId,
    resource_id: resourceId,
  };
  if (options?.bundleInstanceId !== undefined) {
    payload.bundle_instance_id = options.bundleInstanceId;
  }
  const { error } = await supabase
    .schema(schemaName)
    .from("task_resources")
    .insert(payload);
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: true };
    }
    console.error("assignResourceToTask error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function unassignResourceFromTask(
  taskId: string,
  resourceId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("task_resources")
    .delete()
    .eq("task_id", taskId)
    .eq("resource_id", resourceId);
  if (error) {
    console.error("unassignResourceFromTask error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function unassignBundleInstanceFromTask(
  taskId: string,
  bundleInstanceId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("task_resources")
    .delete()
    .eq("task_id", taskId)
    .eq("bundle_instance_id", bundleInstanceId);
  if (error) {
    console.error("unassignBundleInstanceFromTask error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/** Replace all resource rows for a task (save draft in one shot). */
export async function replaceTaskResourceAssignments(
  taskId: string,
  assignments: Array<{ resource_id: string; bundle_instance_id: string | null }>,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error: delErr } = await supabase
    .schema(schemaName)
    .from("task_resources")
    .delete()
    .eq("task_id", taskId);
  if (delErr) {
    console.error("replaceTaskResourceAssignments delete error:", delErr);
    return { error: delErr.message };
  }
  const seen = new Set<string>();
  const rows: Array<{
    task_id: string;
    resource_id: string;
    bundle_instance_id: string | null;
  }> = [];
  for (const a of assignments) {
    const rid = a.resource_id?.trim();
    if (!rid || seen.has(rid)) continue;
    seen.add(rid);
    rows.push({
      task_id: taskId,
      resource_id: rid,
      bundle_instance_id: a.bundle_instance_id ?? null,
    });
  }
  if (rows.length === 0) return { ok: true };
  const { error: insErr } = await supabase.schema(schemaName).from("task_resources").insert(rows);
  if (insErr) {
    console.error("replaceTaskResourceAssignments insert error:", insErr);
    return { error: insErr.message };
  }
  return { ok: true };
}

export interface ResourceInsert {
  name: string;
  /** Customizer calendar resource type slug. */
  resource_type: string;
  metadata?: Record<string, unknown> | null;
  is_exclusive?: boolean;
  is_schedulable_calendar?: boolean;
  is_schedulable_tasks?: boolean;
  asset_status?: string;
}

export interface ResourceUpdate {
  name?: string;
  resource_type?: string;
  metadata?: Record<string, unknown> | null;
  is_exclusive?: boolean;
  is_schedulable_calendar?: boolean;
  is_schedulable_tasks?: boolean;
  asset_status?: string;
  /** ISO timestamp or null to clear. */
  archived_at?: string | null;
}

export async function createResource(
  input: ResourceInsert,
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    resource_type: input.resource_type,
    metadata: input.metadata ?? null,
    is_exclusive: input.is_exclusive ?? true,
  };
  if (input.is_schedulable_calendar !== undefined) {
    payload.is_schedulable_calendar = input.is_schedulable_calendar;
  }
  if (input.is_schedulable_tasks !== undefined) {
    payload.is_schedulable_tasks = input.is_schedulable_tasks;
  }
  if (input.asset_status !== undefined) {
    payload.asset_status = input.asset_status;
  }
  const { data, error } = await supabase
    .schema(schemaName)
    .from("resources")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("createResource error:", error);
    return { error: error.message };
  }
  return { id: data.id };
}

export async function updateResource(
  id: string,
  input: ResourceUpdate,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.resource_type !== undefined) payload.resource_type = input.resource_type;
  if (input.metadata !== undefined) payload.metadata = input.metadata;
  if (input.is_exclusive !== undefined) payload.is_exclusive = input.is_exclusive;
  if (input.is_schedulable_calendar !== undefined) {
    payload.is_schedulable_calendar = input.is_schedulable_calendar;
  }
  if (input.is_schedulable_tasks !== undefined) {
    payload.is_schedulable_tasks = input.is_schedulable_tasks;
  }
  if (input.asset_status !== undefined) payload.asset_status = input.asset_status;
  if (input.archived_at !== undefined) payload.archived_at = input.archived_at;
  payload.updated_at = new Date().toISOString();
  if (Object.keys(payload).length <= 1) return { ok: true };
  const { error } = await supabase
    .schema(schemaName)
    .from("resources")
    .update(payload)
    .eq("id", id);
  if (error) {
    console.error("updateResource error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function deleteResource(
  id: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("resources")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("deleteResource error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

// --- Resource bundles (definitions; migration 195) ---

export interface ResourceBundleWithItems {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    resource_id: string;
    sort_order: number;
    resource_name: string;
    resource_type: string;
  }>;
}

export async function listResourceBundlesWithItems(
  schema?: string
): Promise<ResourceBundleWithItems[]> {
  const bundles = await getResourceBundles(schema);
  if (bundles.length === 0) return [];
  const catalog = await getResources(schema);
  const nameById = new Map(catalog.map((r) => [r.id, r]));
  const out: ResourceBundleWithItems[] = [];
  for (const b of bundles) {
    const rawItems = await getResourceBundleItems(b.id, schema);
    out.push({
      id: b.id,
      name: b.name,
      description: b.description,
      created_at: b.created_at,
      updated_at: b.updated_at,
      items: rawItems.map((row) => {
        const r = nameById.get(row.resource_id);
        return {
          resource_id: row.resource_id,
          sort_order: row.sort_order,
          resource_name: r?.name?.trim() ? r.name.trim() : "Unknown resource",
          resource_type: r?.resource_type ?? "",
        };
      }),
    });
  }
  return out;
}

/**
 * Bundles for event/task pickers: only members that pass `context` scheduling + archive/asset rules.
 * Bundles with zero eligible members are omitted.
 */
export async function listResourceBundlesWithItemsForPicker(
  context: ResourcePickerContext,
  schema?: string
): Promise<ResourceBundleWithItems[]> {
  const pickable = await getResourcesAdminForPicker(context, schema);
  if (pickable.length === 0) return [];
  const pickableIds = new Set(pickable.map((r) => r.id));
  const metaById = new Map(pickable.map((r) => [r.id, r]));
  const bundles = await getResourceBundles(schema);
  if (bundles.length === 0) return [];
  const out: ResourceBundleWithItems[] = [];
  for (const b of bundles) {
    const rawItems = await getResourceBundleItems(b.id, schema);
    const items = rawItems
      .filter((row) => pickableIds.has(row.resource_id))
      .map((row) => {
        const r = metaById.get(row.resource_id);
        return {
          resource_id: row.resource_id,
          sort_order: row.sort_order,
          resource_name: r?.name?.trim() ? r.name.trim() : "Unknown resource",
          resource_type: r?.resource_type ?? "",
        };
      });
    if (items.length === 0) continue;
    out.push({
      id: b.id,
      name: b.name,
      description: b.description,
      created_at: b.created_at,
      updated_at: b.updated_at,
      items,
    });
  }
  return out;
}

export async function createResourceBundle(
  input: { name: string; description?: string | null },
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const name = input.name.trim();
  if (!name) return { error: "Name is required" };
  const { data, error } = await supabase
    .schema(schemaName)
    .from("resource_bundles")
    .insert({
      name,
      description:
        input.description === undefined || input.description === null
          ? null
          : String(input.description).trim() || null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("createResourceBundle error:", error);
    return { error: error.message };
  }
  return { id: data.id };
}

export async function updateResourceBundle(
  id: string,
  input: { name?: string; description?: string | null },
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) {
    payload.description =
      input.description === null ? null : String(input.description).trim() || null;
  }
  if (Object.keys(payload).length <= 1) return { ok: true };
  const { error } = await supabase
    .schema(schemaName)
    .from("resource_bundles")
    .update(payload)
    .eq("id", id);
  if (error) {
    console.error("updateResourceBundle error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function deleteResourceBundle(
  id: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase.schema(schemaName).from("resource_bundles").delete().eq("id", id);
  if (error) {
    console.error("deleteResourceBundle error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function addResourceBundleItem(
  bundleId: string,
  resourceId: string,
  sortOrder?: number,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("resource_bundle_items")
    .insert({
      bundle_id: bundleId,
      resource_id: resourceId,
      sort_order: sortOrder ?? 0,
    });
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: true };
    }
    console.error("addResourceBundleItem error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function removeResourceBundleItem(
  bundleId: string,
  resourceId: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("resource_bundle_items")
    .delete()
    .eq("bundle_id", bundleId)
    .eq("resource_id", resourceId);
  if (error) {
    console.error("removeResourceBundleItem error:", error);
    return { error: error.message };
  }
  return { ok: true };
}
