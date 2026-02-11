import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getParticipantConflicts } from "@/lib/supabase/events";
import { ensureParticipant } from "@/lib/supabase/participants-resources";
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
 * POST /api/events/check-conflicts
 * Body: { start_date, end_date, participants: [{ source_type, source_id }], exclude_event_id? }
 * Returns { conflicts: { eventId, title, start_date, end_date }[] }
 */
async function postHandler(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const body = await request.json();
    const start_date = typeof body?.start_date === "string" ? body.start_date : "";
    const end_date = typeof body?.end_date === "string" ? body.end_date : "";
    const rawParticipants = Array.isArray(body?.participants) ? body.participants : [];
    const exclude_event_id =
      typeof body?.exclude_event_id === "string" && body.exclude_event_id
        ? body.exclude_event_id
        : undefined;

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

    const participantIds: string[] = [];
    for (const p of rawParticipants) {
      if (
        (p?.source_type === "team_member" || p?.source_type === "crm_contact") &&
        typeof p?.source_id === "string"
      ) {
        const out = await ensureParticipant(p.source_type, p.source_id);
        if ("id" in out) participantIds.push(out.id);
      }
    }

    const conflicts = await getParticipantConflicts(
      start,
      end,
      participantIds,
      exclude_event_id
    );
    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error("POST /api/events/check-conflicts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(postHandler);
