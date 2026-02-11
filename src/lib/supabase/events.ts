/**
 * Events/calendar utilities.
 * Per prd-technical: read operations use RPC; writes use .schema().from().
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";
import { expandRecurringEvents, getOccurrencesInRange, eventIdForEdit } from "@/lib/recurrence";
import { getEventsParticipantAssignments } from "./participants-resources";

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
 * List events in a date range. Uses RPC get_events_dynamic, then expands
 * recurring events (RRULE) into individual occurrences so the calendar shows each instance.
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

  const raw = (data ?? []) as Event[];
  return expandRecurringEvents(raw, startDate, endDate);
}

/** Public-only filter: not hidden, not membership-protected, published. */
export function isPublicEvent(e: Event): boolean {
  return (
    e.access_level === "public" &&
    e.visibility === "public" &&
    e.status === "published"
  );
}

/**
 * List events visible on the public calendar and ICS feed.
 * Same as getEvents then filtered to access_level=public, visibility=public, status=published
 * (no members-only, no MAG-gated, no private/hidden, no draft/cancelled).
 */
export async function getPublicEvents(
  startDate: Date,
  endDate: Date,
  schema?: string
): Promise<Event[]> {
  const events = await getEvents(startDate, endDate, schema);
  return events.filter(isPublicEvent);
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
 * For recurring events: creates one-off events for each past occurrence (so they remain on the calendar), then deletes the series.
 */
export async function deleteEvent(
  id: string,
  schema?: string
): Promise<{ ok: true } | { error: string }> {
  const schemaName = schema ?? getClientSchema();
  const event = await getEventById(id, schemaName);
  if (!event) {
    return { error: "Event not found" };
  }

  if (event.recurrence_rule?.trim()) {
    const rangeStart = new Date(event.start_date);
    const now = new Date();
    const occurrences = getOccurrencesInRange(event, rangeStart, now);
    // Only preserve occurrences that have already ended (fully in the past)
    const pastOccurrences = occurrences.filter(
      (occ) => new Date(occ.end_date).getTime() <= now.getTime()
    );
    for (const occ of pastOccurrences) {
      const insert: EventInsert = {
        title: event.title,
        start_date: occ.start_date,
        end_date: occ.end_date,
        timezone: event.timezone,
        location: event.location,
        link_url: event.link_url ?? null,
        description: event.description,
        recurrence_rule: null,
        is_all_day: event.is_all_day,
        access_level: event.access_level,
        required_mag_id: event.required_mag_id,
        visibility: event.visibility,
        event_type: event.event_type,
        status: event.status,
        cover_image_id: event.cover_image_id ?? null,
      };
      const result = await createEvent(insert, schemaName);
      if ("error" in result) {
        console.error("deleteEvent: failed to create past occurrence:", result.error);
        return { error: result.error };
      }
    }
  }

  const supabase = createServerSupabaseClient();
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

/** Conflict check: events (or occurrences) that overlap [startDate, endDate] and have any of the given participant ids. */
export interface ParticipantConflict {
  eventId: string;
  title: string;
  start_date: string;
  end_date: string;
}

export async function getParticipantConflicts(
  startDate: Date,
  endDate: Date,
  participantIds: string[],
  excludeEventId?: string | null,
  schema?: string
): Promise<ParticipantConflict[]> {
  if (participantIds.length === 0) return [];
  const schemaName = schema ?? EVENTS_SCHEMA;
  const events = await getEvents(startDate, endDate, schemaName);
  const realIds = [...new Set(events.map((e) => eventIdForEdit(e.id)))].filter(
    (id) => id !== excludeEventId
  );
  if (realIds.length === 0) return [];
  const participantMap = await getEventsParticipantAssignments(realIds, schemaName);
  const participantSet = new Set(participantIds);
  const conflicts: ParticipantConflict[] = [];
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  for (const ev of events) {
    const realId = eventIdForEdit(ev.id);
    if (realId === excludeEventId) continue;
    const pSet = participantMap.get(realId);
    if (!pSet) continue;
    const hasParticipant = [...participantSet].some((id) => pSet.has(id));
    if (!hasParticipant) continue;
    const evStart = new Date(ev.start_date).getTime();
    const evEnd = new Date(ev.end_date).getTime();
    if (evStart < endMs && evEnd > startMs) {
      conflicts.push({
        eventId: realId,
        title: ev.title,
        start_date: ev.start_date,
        end_date: ev.end_date,
      });
    }
  }
  return conflicts;
}
