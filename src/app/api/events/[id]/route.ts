import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getEventById, updateEvent, deleteEvent } from "@/lib/supabase/events";
import type { EventUpdate } from "@/lib/supabase/events";
import { withRateLimit } from "@/lib/api/middleware";

async function requireAdmin() {
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const metadata = user.user_metadata as { type?: string } | undefined;
  const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";
  if (!isAdmin) return { error: "Forbidden" as const, status: 403 as const };
  return null;
}

/**
 * GET /api/events/[id]
 * Get a single event by ID.
 */
async function getHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const event = await getEventById(id);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(
      { data: event },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/events/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[id]
 * Update an event. Requires authenticated admin.
 */
async function putHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const body = await request.json();
    const input: EventUpdate = {};
    if (typeof body?.title === "string") input.title = body.title.trim();
    if (typeof body?.start_date === "string") input.start_date = body.start_date;
    if (typeof body?.end_date === "string") input.end_date = body.end_date;
    if (typeof body?.timezone === "string") input.timezone = body.timezone;
    if (body?.location !== undefined) input.location = typeof body.location === "string" ? body.location : null;
    if (body?.link_url !== undefined) input.link_url = typeof body.link_url === "string" ? body.link_url : null;
    if (body?.description !== undefined) input.description = typeof body.description === "string" ? body.description : null;
    if (body?.recurrence_rule !== undefined) input.recurrence_rule = typeof body.recurrence_rule === "string" ? body.recurrence_rule : null;
    if (typeof body?.is_all_day === "boolean") input.is_all_day = body.is_all_day;
    if (typeof body?.access_level === "string") input.access_level = body.access_level;
    if (body?.required_mag_id !== undefined) input.required_mag_id = typeof body.required_mag_id === "string" && body.required_mag_id ? body.required_mag_id : null;
    if (typeof body?.visibility === "string") input.visibility = body.visibility;
    if (body?.event_type !== undefined) input.event_type = typeof body.event_type === "string" ? body.event_type : null;
    if (typeof body?.status === "string") input.status = body.status;
    if (body?.cover_image_id !== undefined) input.cover_image_id = typeof body.cover_image_id === "string" && body.cover_image_id ? body.cover_image_id : null;

    if (Object.keys(input).length === 0) {
      return NextResponse.json({ data: { ok: true } });
    }

    const result = await updateEvent(id, input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("PUT /api/events/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event. Requires authenticated admin.
 */
async function deleteHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const result = await deleteEvent(id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: { ok: true } }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getHandler);
export const PUT = withRateLimit(putHandler);
export const DELETE = withRateLimit(deleteHandler);
