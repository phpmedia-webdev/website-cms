/**
 * Native `title` / hover text for calendar event blocks (admin tooltips with time, location, resources).
 */

import { format } from "date-fns";
import type { Event } from "@/lib/supabase/events";

export type CalendarEventHoverSource = Pick<
  Event,
  "title" | "start_date" | "end_date" | "is_all_day" | "location"
>;

function formatTimeRange(ev: CalendarEventHoverSource): string {
  if (ev.is_all_day) {
    const s = new Date(ev.start_date);
    const e = new Date(ev.end_date);
    const sameDay = s.toDateString() === e.toDateString();
    if (sameDay) return `All day · ${format(s, "EEEE, MMM d, yyyy")}`;
    return `All day · ${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
  }
  const s = new Date(ev.start_date);
  const e = new Date(ev.end_date);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${format(s, "EEE, MMM d, yyyy")} · ${format(s, "h:mm a")} – ${format(e, "h:mm a")}`;
  }
  return `${format(s, "MMM d, h:mm a")} – ${format(e, "MMM d, h:mm a")}`;
}

/** Separator for native `title` tooltips (Windows often shows only the first line for `\n`). */
const TIP_SEP = " · ";

/**
 * Single-line hover string for HTML `title` (month/week/day via react-big-calendar `tooltipAccessor`).
 */
export function buildCalendarEventHoverText(
  ev: CalendarEventHoverSource,
  resourceNames: string[]
): string {
  const parts: string[] = [ev.title.trim() || "Untitled", formatTimeRange(ev)];
  const loc = ev.location?.trim();
  if (loc) parts.push(`Location: ${loc}`);
  if (resourceNames.length > 0) {
    parts.push(`Resources: ${resourceNames.join(", ")}`);
  }
  return parts.join(TIP_SEP);
}
