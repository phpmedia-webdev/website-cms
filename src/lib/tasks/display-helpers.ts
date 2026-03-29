/**
 * Pure display helpers for task UI (safe for client components).
 */

const AVATAR_BG = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-cyan-500",
] as const;

/**
 * Two-letter initials from a **display string** (name line, email, or phrase).
 * Prefer for non-avatar text chips only. **User avatars** should use
 * `initialsFromFirstLast` (`@/lib/ui/avatar-initials`) from structured first/last (+ email),
 * not marketing display names.
 */
export function initialsFromLabel(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  const firstAlpha = (s: string): string => {
    for (const ch of s) {
      if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) return ch;
    }
    return "";
  };
  if (parts.length >= 2) {
    const a = firstAlpha(parts[0] ?? "");
    const b = firstAlpha(parts[parts.length - 1] ?? "");
    const combined = (a + b).toUpperCase();
    if (combined) return combined;
  }
  const alphaChars = [...t].filter(
    (ch) => (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")
  );
  if (alphaChars.length >= 2) return (alphaChars[0] + alphaChars[1]).toUpperCase();
  if (alphaChars.length === 1) return alphaChars[0]!.toUpperCase();
  return "?";
}

/** Stable accent class from a string id (for avatar circles). */
export function avatarBgClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 997;
  return AVATAR_BG[h % AVATAR_BG.length]!;
}

/** e.g. 125 → "2h 5m", 45 → "45m" */
export function formatMinutesCompact(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h 0m`;
  return `${m}m`;
}

/**
 * Task time tracking display: always `Hhrs Mmin` (e.g. 125 → "2hrs 5min", 0 → "0hrs 0min").
 */
export function formatMinutesAsHrsMin(totalMinutes: number): string {
  const safe =
    Number.isFinite(totalMinutes) && totalMinutes >= 0 ? Math.round(totalMinutes) : 0;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}hrs ${m}min`;
}

/** e.g. "Mar 20" */
export function formatShortMonthDay(isoDate: string): string {
  try {
    return new Date(isoDate + (isoDate.length <= 10 ? "T12:00:00" : "")).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Compare due date (YYYY-MM-DD or ISO string) to **local** calendar today.
 * @returns `null` if no valid due date — UI should hide schedule hint.
 */
export function dueDateScheduleHint(
  isoDue: string | null | undefined
): "on_schedule" | "overdue" | null {
  const raw = typeof isoDue === "string" ? isoDue.trim() : "";
  if (!raw) return null;
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const parts = ymd.split("-").map((p) => parseInt(p, 10));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const due = new Date(y!, m! - 1, d!);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  return "on_schedule";
}
