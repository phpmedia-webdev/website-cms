/**
 * Recurring events: expand RRULE into occurrences within a date range.
 * Uses rrule library; event_exceptions (deleted/modified) can be applied in a later iteration.
 */

import { rrulestr } from "rrule";
import type { Event } from "@/lib/supabase/events";

/** Prefix for synthetic ids of expanded occurrences (realId--timestamp). */
export const RECURRENCE_ID_SEP = "--";

/**
 * Expand recurring events into individual occurrences for the given range.
 * One-off events (recurrence_rule null) are returned as-is. Recurring events
 * are expanded; each occurrence gets a synthetic id (eventId--occurrenceTime)
 * so the calendar can show multiple instances and we can still resolve the
 * series for edit.
 */
export function expandRecurringEvents(
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date
): Event[] {
  const result: Event[] = [];

  for (const ev of events) {
    if (!ev.recurrence_rule?.trim()) {
      result.push(ev);
      continue;
    }

    const dtstart = new Date(ev.start_date);
    const durationMs =
      new Date(ev.end_date).getTime() - new Date(ev.start_date).getTime();

    try {
      const rule = rrulestr(ev.recurrence_rule.trim(), {
        dtstart,
        unfold: true,
      });
      const occurrences = rule.between(rangeStart, rangeEnd, true);

      for (const occ of occurrences) {
        const startDate = occ.toISOString();
        const endDate = new Date(occ.getTime() + durationMs).toISOString();
        const syntheticId = `${ev.id}${RECURRENCE_ID_SEP}${occ.getTime()}`;
        result.push({
          ...ev,
          id: syntheticId,
          start_date: startDate,
          end_date: endDate,
        });
      }
    } catch {
      // Invalid or unsupported RRULE: treat as one-off
      result.push(ev);
    }
  }

  return result;
}

/** Get the real event id from a possibly synthetic id (for edit link). */
export function eventIdForEdit(id: string): string {
  const i = id.indexOf(RECURRENCE_ID_SEP);
  return i > 0 ? id.slice(0, i) : id;
}

/**
 * Return start/end for each occurrence of a recurring event in the given range.
 * Used when deleting a series: create one-off events for past occurrences so they remain on the calendar.
 * Returns [] if event has no recurrence_rule or rule is invalid.
 */
export function getOccurrencesInRange(
  ev: Event,
  rangeStart: Date,
  rangeEnd: Date
): { start_date: string; end_date: string }[] {
  if (!ev.recurrence_rule?.trim()) return [];

  const dtstart = new Date(ev.start_date);
  const durationMs =
    new Date(ev.end_date).getTime() - new Date(ev.start_date).getTime();

  try {
    const rule = rrulestr(ev.recurrence_rule.trim(), {
      dtstart,
      unfold: true,
    });
    const occurrences = rule.between(rangeStart, rangeEnd, true);
    return occurrences.map((occ) => {
      const startDate = occ.toISOString();
      const endDate = new Date(occ.getTime() + durationMs).toISOString();
      return { start_date: startDate, end_date: endDate };
    });
  } catch {
    return [];
  }
}
