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
}

export interface Participant {
  id: string;
  source_type: string;
  source_id: string;
  display_name: string | null;
}

export async function getResources(
  schema?: string
): Promise<Resource[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_resources_dynamic", {
    schema_name: schemaName,
  });
  if (error) {
    console.error("getResources error:", error);
    throw error;
  }
  return (data ?? []) as Resource[];
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

export async function getEventResourceIds(
  eventId: string,
  schema?: string
): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? DEFAULT_SCHEMA;
  const { data, error } = await supabase.rpc("get_event_resources_dynamic", {
    schema_name: schemaName,
    event_id_param: eventId,
  });
  if (error) {
    console.error("getEventResourceIds error:", error);
    throw error;
  }
  const rows = (data ?? []) as { resource_id: string }[];
  return rows.map((r) => r.resource_id);
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
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const { error } = await supabase
    .schema(schemaName)
    .from("event_resources")
    .insert({ event_id: eventId, resource_id: resourceId });
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

export interface ResourceInsert {
  name: string;
  resource_type: "room" | "equipment" | "video";
  metadata?: Record<string, unknown> | null;
  is_exclusive?: boolean;
}

export interface ResourceUpdate {
  name?: string;
  resource_type?: "room" | "equipment" | "video";
  metadata?: Record<string, unknown> | null;
  is_exclusive?: boolean;
}

export async function createResource(
  input: ResourceInsert,
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();
  const payload = {
    name: input.name.trim(),
    resource_type: input.resource_type,
    metadata: input.metadata ?? null,
    is_exclusive: input.is_exclusive ?? true,
  };
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
