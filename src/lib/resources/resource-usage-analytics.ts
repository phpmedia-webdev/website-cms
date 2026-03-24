/**
 * Dynamic resource usage estimates for admin analytics (no persisted usage table).
 * Events: expanded occurrences in range × duration ÷ count(assigned resources).
 * Tasks: sum(task_time_logs.minutes) per task in log_date range ÷ count(assigned resources).
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { getEvents } from "@/lib/supabase/events";
import { eventIdForEdit } from "@/lib/recurrence";
type ResourceCatalogRow = {
  id: string;
  name: string;
  resource_type: string;
};

export interface ResourceUsageRow {
  resource_id: string;
  name: string;
  resource_type: string;
  minutes_from_events: number;
  minutes_from_tasks: number;
  minutes_total: number;
}

export interface ResourceUsageAnalyticsResult {
  range: { from: string; to: string };
  rows: ResourceUsageRow[];
  methodology: string;
  /** When task_time_logs could not be read (e.g. RLS), task minutes are 0. */
  tasks_attribution_available: boolean;
}

function addMinutes(map: Map<string, number>, resourceId: string, minutes: number) {
  if (minutes <= 0 || !resourceId) return;
  map.set(resourceId, (map.get(resourceId) ?? 0) + minutes);
}

/**
 * @param fromInclusive YYYY-MM-DD (UTC calendar day start)
 * @param toInclusive YYYY-MM-DD (UTC calendar day end)
 */
export async function computeResourceUsageAnalytics(params: {
  fromInclusive: string;
  toInclusive: string;
  /** Filter registry rows by Customizer slug; omit or empty = all types */
  resourceTypeSlug?: string | null;
  /** Focus one resource; omit = all */
  resourceId?: string | null;
  /** Max rows returned after sort (default 100) */
  limit?: number;
}): Promise<ResourceUsageAnalyticsResult> {
  const schema = getClientSchema();
  const supabase = createServerSupabaseClient();
  const from = params.fromInclusive.trim();
  const to = params.toInclusive.trim();
  const limit = params.limit ?? 100;

  const rangeStart = new Date(`${from}T00:00:00.000Z`);
  const rangeEnd = new Date(`${to}T23:59:59.999Z`);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeStart > rangeEnd) {
    return {
      range: { from, to },
      rows: [],
      methodology: "Invalid date range.",
      tasks_attribution_available: false,
    };
  }

  const eventMinutes = new Map<string, number>();
  const taskMinutes = new Map<string, number>();

  const events = await getEvents(rangeStart, rangeEnd, schema);
  const masterIds = [...new Set(events.map((e) => eventIdForEdit(e.id)))].filter(Boolean);

  if (masterIds.length > 0) {
    const { data: erRows, error: erErr } = await supabase
      .schema(schema)
      .from("event_resources")
      .select("event_id, resource_id")
      .in("event_id", masterIds);
    if (erErr) {
      console.error("resource usage: event_resources", erErr);
    }
    const byEvent = new Map<string, string[]>();
    for (const row of erRows ?? []) {
      const eid = row.event_id as string;
      const rid = row.resource_id as string;
      const list = byEvent.get(eid) ?? [];
      list.push(rid);
      byEvent.set(eid, list);
    }

    for (const ev of events) {
      const masterId = eventIdForEdit(ev.id);
      const rids = byEvent.get(masterId) ?? [];
      if (rids.length === 0) continue;
      const start = new Date(ev.start_date).getTime();
      const end = new Date(ev.end_date).getTime();
      const mins = Math.max(0, (end - start) / 60_000);
      if (mins <= 0) continue;
      const share = mins / rids.length;
      for (const rid of rids) {
        addMinutes(eventMinutes, rid, share);
      }
    }
  }

  let tasksAttributionAvailable = true;
  const { data: logs, error: logErr } = await supabase
    .schema(schema)
    .from("task_time_logs")
    .select("task_id, minutes, log_date")
    .gte("log_date", from)
    .lte("log_date", to);

  if (logErr) {
    console.error("resource usage: task_time_logs", logErr);
    tasksAttributionAvailable = false;
  } else {
    const minutesByTask = new Map<string, number>();
    for (const row of logs ?? []) {
      const tid = row.task_id as string;
      const m = Number(row.minutes) || 0;
      if (m <= 0) continue;
      minutesByTask.set(tid, (minutesByTask.get(tid) ?? 0) + m);
    }

    const taskIds = [...minutesByTask.keys()];
    if (taskIds.length > 0) {
      const { data: trRows, error: trErr } = await supabase
        .schema(schema)
        .from("task_resources")
        .select("task_id, resource_id")
        .in("task_id", taskIds);
      if (trErr) {
        console.error("resource usage: task_resources", trErr);
        tasksAttributionAvailable = false;
      } else {
        const byTask = new Map<string, string[]>();
        for (const row of trRows ?? []) {
          const tid = row.task_id as string;
          const rid = row.resource_id as string;
          const list = byTask.get(tid) ?? [];
          list.push(rid);
          byTask.set(tid, list);
        }
        for (const [taskId, totalMins] of minutesByTask) {
          const rids = byTask.get(taskId) ?? [];
          if (rids.length === 0) continue;
          const share = totalMins / rids.length;
          for (const rid of rids) {
            addMinutes(taskMinutes, rid, share);
          }
        }
      }
    }
  }

  const { data: resourceRows, error: resErr } = await supabase
    .schema(schema)
    .from("resources")
    .select(
      "id, name, resource_type, is_schedulable_calendar, is_schedulable_tasks, asset_status, archived_at"
    );
  if (resErr) {
    console.error("resource usage: resources", resErr);
    return {
      range: { from, to },
      rows: [],
      methodology: "Could not load resources registry.",
      tasks_attribution_available: tasksAttributionAvailable,
    };
  }

  const catalog = (resourceRows ?? []) as ResourceCatalogRow[];
  const catalogById = new Map(catalog.map((r) => [r.id, r]));

  const allIds = new Set<string>([
    ...eventMinutes.keys(),
    ...taskMinutes.keys(),
  ]);

  const typeFilter = params.resourceTypeSlug?.trim() || null;
  const idFilter = params.resourceId?.trim() || null;

  const rows: ResourceUsageRow[] = [];
  for (const id of allIds) {
    if (idFilter && id !== idFilter) continue;
    const meta = catalogById.get(id);
    if (!meta) continue;
    if (typeFilter && meta.resource_type !== typeFilter) continue;
    const me = eventMinutes.get(id) ?? 0;
    const mt = taskMinutes.get(id) ?? 0;
    if (me <= 0 && mt <= 0) continue;
    rows.push({
      resource_id: id,
      name: meta.name?.trim() || "Unknown",
      resource_type: meta.resource_type ?? "",
      minutes_from_events: Math.round(me * 100) / 100,
      minutes_from_tasks: Math.round(mt * 100) / 100,
      minutes_total: Math.round((me + mt) * 100) / 100,
    });
  }

  rows.sort((a, b) => b.minutes_total - a.minutes_total);
  const limited = rows.slice(0, limit);

  const methodology =
    "Estimates only. Events: each occurrence in range contributes (end − start) divided equally among resources on the parent event. " +
    "Recurring series are expanded in the selected range. Tasks: sum of time logs with log_date in range, divided equally among resources " +
    "currently assigned to that task. Edits to events, recurrence, assignments, or logs change these numbers.";

  return {
    range: { from, to },
    rows: limited,
    methodology,
    tasks_attribution_available: tasksAttributionAvailable,
  };
}
