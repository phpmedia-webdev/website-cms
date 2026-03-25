/**
 * Rough calendar-hours estimate for project metrics (not labor / not billing).
 * All-day and multi-day spans cap at 8 hours per UTC calendar day.
 */

const MS_DAY = 86_400_000;
const MS_CAP = 8 * 60 * 60 * 1000;

export const EVENT_ESTIMATE_HOURS_PER_DAY_CAP = 8;

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function allDayEstimatedMinutes(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  if (endMs <= startMs) return EVENT_ESTIMATE_HOURS_PER_DAY_CAP * 60;
  const startDay = startOfUtcDay(startMs);
  const endDay = startOfUtcDay(endMs);
  let days = Math.round((endDay - startDay) / MS_DAY);
  if (days < 1) days = 1;
  return days * EVENT_ESTIMATE_HOURS_PER_DAY_CAP * 60;
}

function timedEstimatedMinutesCapped(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  let totalMs = 0;
  let day = startOfUtcDay(startMs);
  const end = endMs;
  while (day < end) {
    const segStart = Math.max(startMs, day);
    const segEnd = Math.min(end, day + MS_DAY);
    if (segEnd > segStart) {
      totalMs += Math.min(segEnd - segStart, MS_CAP);
    }
    day += MS_DAY;
  }
  return Math.round(totalMs / 60_000);
}

export interface EventLikeForTimeEstimate {
  start_date: string;
  end_date: string;
  is_all_day: boolean;
}

/** One event’s capped estimate in minutes. */
export function eventEstimatedMinutesForMetric(ev: EventLikeForTimeEstimate): number {
  const startMs = new Date(ev.start_date).getTime();
  const endMs = new Date(ev.end_date).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
  return ev.is_all_day
    ? allDayEstimatedMinutes(startMs, endMs)
    : timedEstimatedMinutesCapped(startMs, endMs);
}

/** Sum of capped estimates for all linked project events (DB rows; recurring = template span only). */
export function sumProjectEventsEstimatedMinutes(events: EventLikeForTimeEstimate[]): number {
  return events.reduce((sum, e) => sum + eventEstimatedMinutesForMetric(e), 0);
}
