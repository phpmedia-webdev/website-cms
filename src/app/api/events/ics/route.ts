import { NextResponse } from "next/server";
import { getPublicEvents } from "@/lib/supabase/events";
import { withRateLimit } from "@/lib/api/middleware";
import type { Event } from "@/lib/supabase/events";

/** Escape text for ICS (backslash-escape special chars). */
function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Format date for ICS: DATE (all-day) or DATETIME (timed, UTC). */
function icsDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  if (allDay) return `${y}${m}${day}`;
  const h = pad(d.getUTCHours());
  const min = pad(d.getUTCMinutes());
  const sec = pad(d.getUTCSeconds());
  return `${y}${m}${day}T${h}${min}${sec}Z`;
}

/** Build one VEVENT (no folding; keep lines reasonable length or use RFC folding if needed). */
function eventToIcsVevent(ev: Event, baseUrl: string): string {
  const uid = ev.id.includes("--") ? ev.id : `${ev.id}@${new URL(baseUrl).host}`;
  const dtstamp = icsDate(new Date().toISOString(), false);
  const allDay = ev.is_all_day;
  const dtstart = icsDate(ev.start_date, allDay);
  // ICS DTEND for all-day is exclusive (day after last day)
  const endDate = allDay
    ? (() => {
        const e = new Date(ev.end_date);
        const next = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate() + 1));
        return next.toISOString();
      })()
    : ev.end_date;
  const dtend = icsDate(endDate, allDay);
  const summary = icsEscape(ev.title ?? "Event");
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`,
    allDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
  ];
  if (ev.location?.trim()) lines.push(`LOCATION:${icsEscape(ev.location.trim())}`);
  if (ev.description?.trim()) lines.push(`DESCRIPTION:${icsEscape(ev.description.trim())}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/**
 * GET /api/events/ics
 * Public ICS subscription feed. Same filter as public calendar:
 * access_level=public, visibility=public, status=published (no membership-gated or hidden).
 * Query params: start (ISO), end (ISO). Default: next 365 days from now.
 */
async function getHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const now = new Date();
    const start = startParam
      ? new Date(startParam)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = endParam
      ? new Date(endParam)
      : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 23, 59, 59);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new NextResponse("Invalid start or end date", { status: 400 });
    }

    const events = await getPublicEvents(start, end);

    const baseUrl =
      request.headers.get("x-forwarded-proto") && request.headers.get("x-forwarded-host")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`
        : process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

    const prodid = "-//Website-CMS//Public Events//EN";
    const calLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:" + prodid,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events.map((ev) => eventToIcsVevent(ev, baseUrl)),
      "END:VCALENDAR",
    ];
    const body = calLines.join("\r\n");

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="events.ics"',
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("GET /api/events/ics error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export const GET = withRateLimit(getHandler);
