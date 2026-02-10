import { NextResponse } from "next/server";
import { getEventById, isPublicEvent } from "@/lib/supabase/events";
import { eventIdForEdit } from "@/lib/recurrence";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/events/public/[id]
 * Get a single event for the public calendar. Returns 404 if the event is not
 * public (access_level=public, visibility=public, status=published).
 * [id] can be real event id or synthetic occurrence id (realId--timestamp).
 */
async function getHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });

    const realId = eventIdForEdit(id);
    const event = await getEventById(realId);
    if (!event || !isPublicEvent(event)) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // If id was synthetic (occurrence), override start/end for this occurrence
    const isOccurrence = id.includes("--");
    let payload: typeof event = event;
    if (isOccurrence) {
      const ts = id.slice(id.indexOf("--") + 2);
      const occurrenceStart = new Date(parseInt(ts, 10));
      const durationMs =
        new Date(event.end_date).getTime() - new Date(event.start_date).getTime();
      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
      payload = {
        ...event,
        id,
        start_date: occurrenceStart.toISOString(),
        end_date: occurrenceEnd.toISOString(),
      };
    }

    return NextResponse.json(
      { data: payload },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/events/public/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(getHandler);
