import { NextResponse } from "next/server";
import { getPublicEvents } from "@/lib/supabase/events";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/events/public
 * List events for the public calendar. Only events that are:
 * - access_level = 'public' (not members-only, MAG-gated, or private)
 * - visibility = 'public' (not hidden)
 * - status = 'published' (no draft or cancelled)
 * Query params: start (ISO), end (ISO).
 */
async function getHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const now = new Date();
    const start = startParam
      ? new Date(startParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endParam
      ? new Date(endParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid start or end date" },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const events = await getPublicEvents(start, end);

    return NextResponse.json(
      { data: events },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/events/public error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getHandler);
