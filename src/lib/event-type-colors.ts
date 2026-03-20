/**
 * Event type display colors (Customizer scope `event_type`). Safe for client + server.
 */

export const DEFAULT_EVENT_TYPE_COLOR = "#3b82f6";

/** Resolve hex color for an event's `event_type` slug using the customizer map. */
export function resolveEventTypeColor(
  slug: string | null | undefined,
  map: Record<string, string>
): string {
  if (slug && map[slug]) return normalizeHex(map[slug]);
  if (map.meeting) return normalizeHex(map.meeting);
  return DEFAULT_EVENT_TYPE_COLOR;
}

export function normalizeHex(color: string): string {
  const t = color.trim();
  if (!t) return DEFAULT_EVENT_TYPE_COLOR;
  if (t.startsWith("#")) {
    return t.length === 7 || t.length === 4 ? t : DEFAULT_EVENT_TYPE_COLOR;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
  return DEFAULT_EVENT_TYPE_COLOR;
}

/** Pick white or near-black text for text on a solid hex background. */
export function contrastTextOnHex(bgHex: string): "#ffffff" | "#111827" {
  const hex = normalizeHex(bgHex).replace(/^#/, "");
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#ffffff";
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#111827" : "#ffffff";
}
