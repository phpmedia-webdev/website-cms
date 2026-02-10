import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import {
  getEventsParticipantAssignments,
  getEventsResourceAssignments,
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

/**
 * GET /api/events/assignments?ids=uuid1,uuid2,...
 * Return participant and resource assignments for the given event IDs (for calendar filter).
 */
async function getHandler(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const eventIds = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (eventIds.length === 0) {
      return NextResponse.json({
        data: { participantAssignments: {}, resourceAssignments: {} },
      });
    }
    const [participantMap, resourceMap] = await Promise.all([
      getEventsParticipantAssignments(eventIds),
      getEventsResourceAssignments(eventIds),
    ]);
    const participantAssignments: Record<string, string[]> = {};
    const resourceAssignments: Record<string, string[]> = {};
    for (const eid of eventIds) {
      participantAssignments[eid] = Array.from(participantMap.get(eid) ?? []);
      resourceAssignments[eid] = Array.from(resourceMap.get(eid) ?? []);
    }
    return NextResponse.json({
      data: { participantAssignments, resourceAssignments },
    });
  } catch (error) {
    console.error("GET /api/events/assignments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(getHandler);
