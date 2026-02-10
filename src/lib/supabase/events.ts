/**
 * Events/calendar utilities.
 * Per prd-technical: read operations use RPC; writes use .schema().from().
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";

const EVENTS_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface EventInsert {
  title: string;
  start_date: string;
  end_date: string;
  timezone?: string;
  location?: string | null;
  link_url?: string | null;
  description?: string | null;
  recurrence_rule?: string | null;
  is_all_day?: boolean;
  access_level?: string;
  required_mag_id?: string | null;
  visibility?: string;
  event_type?: string | null;
  status?: string;
  cover_image_id?: string | null;
}

export interface EventUpdate {
  title?: string;
  start_date?: string;
  end_date?: string;
  timezone?: string;
  location?: string | null;
  link_url?: string | null;
  description?: string | null;
  recurrence_rule?: string | null;
  is_all_day?: boolean;
  access_level?: string;
  required_mag_id?: string | null;
  visibility?: string;
  event_type?: string | null;
  status?: string;
  cover_image_id?: string | null;
}

export interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  timezone: string;
  location: string | null;
  link_url?: string | null;
  description: string | null;
  recurrence_rule: string | null;
  is_all_day: boolean;
  access_level: string;
  required_mag_id: string | null;
  visibility: string;
  event_type: string | null;
  status: string;
  cover_image_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * List events in a date range. Uses RPC get_events_dynamic.
 * Recurring events are returned as template rows; expansion happens in API layer.
 */
export async function getEvents(
  startDate: Date,
  endDate: Date,
  schema?: string
): Promise<Event[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? EVENTS_SCHEMA;

  const { data, error } = await supabase.rpc("get_events_dynamic", {
    schema_name: schemaName,
    start_date_param: startDate.toISOString(),
    end_date_param: endDate.toISOString(),
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? (error as { code?: string }).code ?? JSON.stringify(error);
    console.error("getEvents error:", msg, error);
    throw error;
  }

  return (data ?? []) as Event[];
}

/**
 * Get a single event by ID. Uses RPC get_event_by_id_dynamic.
 */
export async function getEventById(
  id: string,
  schema?: string
): Promise<Event | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? EVENTS_SCHEMA;

  const { data, error } = await supabase.rpc("get_event_by_id_dynamic", {
    schema_name: schemaName,
    event_id_param: id,
  });

  if (error) {
    console.error("getEventById error:", error);
    throw error;
  }

  const rows = (data ?? []) as Event[];
  return rows[0] ?? null;
}

/**
 * Create an event. Uses .schema().from() for writes.
 */
export async function createEvent(
  input: EventInsert,
  schema?: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    start_date: input.start_date,
    end_date: input.end_date,
    timezone: input.timezone ?? "UTC",
    location: input.location ?? null,
    link_url: input.link_url ?? null,
    description: input.description ?? null,
    recurrence_rule: input.recurrence_rule ?? null,
    is_all_day: input.is_all_day ?? false,
    access_level: input.access_level ?? "public",
    required_mag_id: input.required_mag_id ?? null,
    visibility: input.visibility ?? "public",
    event_type: input.event_type ?? null,
    status: input.status ?? "published",
    cover_image_id: input.cover_image_id ?? null,
  };

  const { data, error } = await supabase
    .schema(schemaName)
    .from("events")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("createEvent error:", error);
    return { error: error.message };
  }
  return { id: data.id };
}

/**
 * Update an event by ID. Uses .schema().from() for writes.
 */
export async function updateEvent(
  id: string,
  input: EventUpdate,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();

  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.start_date !== undefined) payload.start_date = input.start_date;
  if (input.end_date !== undefined) payload.end_date = input.end_date;
  if (input.timezone !== undefined) payload.timezone = input.timezone;
  if (input.location !== undefined) payload.location = input.location;
  if (input.link_url !== undefined) payload.link_url = input.link_url;
  if (input.description !== undefined) payload.description = input.description;
  if (input.recurrence_rule !== undefined)
    payload.recurrence_rule = input.recurrence_rule;
  if (input.is_all_day !== undefined) payload.is_all_day = input.is_all_day;
  if (input.access_level !== undefined) payload.access_level = input.access_level;
  if (input.required_mag_id !== undefined)
    payload.required_mag_id = input.required_mag_id;
  if (input.visibility !== undefined) payload.visibility = input.visibility;
  if (input.event_type !== undefined) payload.event_type = input.event_type;
  if (input.status !== undefined) payload.status = input.status;
  if (input.cover_image_id !== undefined) payload.cover_image_id = input.cover_image_id;
  payload.updated_at = new Date().toISOString();

  if (Object.keys(payload).length <= 1) {
    return { ok: true };
  }

  const { error } = await supabase
    .schema(schemaName)
    .from("events")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("updateEvent error:", error);
    return { error: error.message };
  }
  return { ok: true };
}

/**
 * Delete an event by ID. Uses .schema().from() for writes.
 */
export async function deleteEvent(
  id: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? getClientSchema();

  const { error } = await supabase
    .schema(schemaName)
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteEvent error:", error);
    return { error: error.message };
  }
  return { ok: true };
}
