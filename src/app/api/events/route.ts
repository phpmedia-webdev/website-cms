import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getEvents, createEvent } from "@/lib/supabase/events";
import type { EventInsert } from "@/lib/supabase/events";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/events
 * List events in date range.
 * Query params: start (ISO), end (ISO). Default: current month.
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

    const events = await getEvents(start, end);

    return NextResponse.json(
      { data: events },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create an event. Requires authenticated admin.
 */
async function postHandler(request: Request) {
  try {
    const supabase = await createServerSupabaseClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const metadata = user.user_metadata as { type?: string } | undefined;
    const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    const start_date = typeof body?.start_date === "string" ? body.start_date : "";
    const end_date = typeof body?.end_date === "string" ? body.end_date : "";
    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "start_date and end_date are required (ISO strings)" },
        { status: 400 }
      );
    }
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid start_date or end_date" },
        { status: 400 }
      );
    }
    if (start > end) {
      return NextResponse.json(
        { error: "start_date must be before end_date" },
        { status: 400 }
      );
    }

    const input: EventInsert = {
      title,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      timezone: typeof body?.timezone === "string" ? body.timezone : undefined,
      location: typeof body?.location === "string" ? body.location : undefined,
      link_url: typeof body?.link_url === "string" ? body.link_url : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      recurrence_rule: typeof body?.recurrence_rule === "string" ? body.recurrence_rule : undefined,
      is_all_day: typeof body?.is_all_day === "boolean" ? body.is_all_day : undefined,
      access_level: typeof body?.access_level === "string" ? body.access_level : undefined,
      required_mag_id: typeof body?.required_mag_id === "string" && body.required_mag_id ? body.required_mag_id : undefined,
      visibility: typeof body?.visibility === "string" ? body.visibility : undefined,
      event_type: typeof body?.event_type === "string" ? body.event_type : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      cover_image_id: typeof body?.cover_image_id === "string" && body.cover_image_id ? body.cover_image_id : undefined,
    };

    const result = await createEvent(input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: { id: result.id } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getHandler);
export const POST = withRateLimit(postHandler);
