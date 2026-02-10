/**
 * Build and parse RRULE for the event form: presets + optional end date (UNTIL).
 * Used only in the UI; expansion is in recurrence.ts.
 */

export type RecurrencePreset =
  | "none"
  | "daily"
  | "weekly"
  | "weekly2"
  | "monthly"
  | "monthly_1mo"
  | "monthly_-1fr";

export const RECURRENCE_PRESETS: { value: RecurrencePreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "weekly2", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "monthly_1mo", label: "Monthly (1st Monday)" },
  { value: "monthly_-1fr", label: "Monthly (last Friday)" },
];

const BASE_RULES: Record<RecurrencePreset, string | null> = {
  none: null,
  daily: "FREQ=DAILY",
  weekly: "FREQ=WEEKLY",
  weekly2: "FREQ=WEEKLY;INTERVAL=2",
  monthly: "FREQ=MONTHLY",
  monthly_1mo: "FREQ=MONTHLY;BYDAY=1MO",
  "monthly_-1fr": "FREQ=MONTHLY;BYDAY=-1FR",
};

/** Format a YYYY-MM-DD date as RRULE UNTIL (end of that day, UTC). */
function formatUntil(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const endOfDay = new Date(y, m - 1, d, 23, 59, 59);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    endOfDay.getUTCFullYear() +
    pad(endOfDay.getUTCMonth() + 1) +
    pad(endOfDay.getUTCDate()) +
    "T" +
    pad(endOfDay.getUTCHours()) +
    pad(endOfDay.getUTCMinutes()) +
    pad(endOfDay.getUTCSeconds()) +
    "Z"
  );
}

/** Build full RRULE from preset and optional end date. Returns null for "none". */
export function buildRecurrenceRule(
  preset: RecurrencePreset,
  endDate: string | null
): string | null {
  const base = BASE_RULES[preset];
  if (!base) return null;
  const until =
    endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ? `;UNTIL=${formatUntil(endDate)}`
      : "";
  return base + until;
}

export type ParsedRecurrence = {
  preset: RecurrencePreset;
  endDate: string | null;
  /** When rule doesn't match a preset, keep raw so we don't overwrite on save */
  rawRule: string | null;
};

/** Parse existing RRULE into preset and end date for the form. */
export function parseRecurrenceRule(rule: string | null): ParsedRecurrence {
  if (!rule || !rule.trim()) {
    return { preset: "none", endDate: null, rawRule: null };
  }
  const raw = rule.trim();
  const r = raw.toUpperCase();

  // Extract UNTIL for end date (YYYYMMDD or YYYYMMDDTHHMMSSZ)
  let endDate: string | null = null;
  const untilMatch = r.match(/UNTIL=(\d{8})(?:T\d{6}Z?)?/);
  if (untilMatch) {
    const s = untilMatch[1];
    endDate = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  // Match preset by content (order matters for more specific first)
  if (r.includes("BYDAY=-1FR")) return { preset: "monthly_-1fr", endDate, rawRule: null };
  if (r.includes("BYDAY=1MO")) return { preset: "monthly_1mo", endDate, rawRule: null };
  if (r.includes("INTERVAL=2") && r.includes("WEEKLY")) return { preset: "weekly2", endDate, rawRule: null };
  if (r === "FREQ=DAILY" || r.startsWith("FREQ=DAILY;")) return { preset: "daily", endDate, rawRule: null };
  if ((r === "FREQ=WEEKLY" || r.startsWith("FREQ=WEEKLY;")) && !r.includes("INTERVAL=2"))
    return { preset: "weekly", endDate, rawRule: null };
  if (r === "FREQ=MONTHLY" || r.startsWith("FREQ=MONTHLY;")) return { preset: "monthly", endDate, rawRule: null };

  return { preset: "none", endDate: null, rawRule: raw };
}
