import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import {
  getEventParticipantIds,
  ensureParticipant,
  assignParticipantToEvent,
  unassignParticipantFromEvent,
} from "@/lib/supabase/participants-resources";
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

async function getHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  const participantIds = await getEventParticipantIds(id);
  return NextResponse.json({ data: participantIds });
}

async function postHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  const body = await request.json();
  let participantId: string;
  if (typeof body?.participant_id === "string" && body.participant_id) {
    participantId = body.participant_id;
  } else if (
    (body?.source_type === "crm_contact" || body?.source_type === "team_member") &&
    typeof body?.source_id === "string"
  ) {
    const out = await ensureParticipant(body.source_type, body.source_id);
    if ("error" in out) return NextResponse.json({ error: out.error }, { status: 500 });
    participantId = out.id;
  } else {
    return NextResponse.json(
      { error: "Body must include participant_id or source_type and source_id" },
      { status: 400 }
    );
  }
  const result = await assignParticipantToEvent(id, participantId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ data: { participant_id: participantId } }, { status: 201 });
}

async function deleteHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  const body = await request.json();
  const participantId = typeof body?.participant_id === "string" ? body.participant_id : null;
  if (!participantId) return NextResponse.json({ error: "participant_id required" }, { status: 400 });
  const result = await unassignParticipantFromEvent(id, participantId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}

export const GET = withRateLimit(getHandler);
export const POST = withRateLimit(postHandler);
export const DELETE = withRateLimit(deleteHandler);
