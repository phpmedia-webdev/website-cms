import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getParticipantIdByTeamMemberUserId } from "@/lib/supabase/participants-resources";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/events/me-participant-id
 * Returns the current user's participant row id (for "My View" filter).
 * Requires admin auth. Returns { participantId: string | null }.
 */
async function getHandler() {
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
    const participantId = await getParticipantIdByTeamMemberUserId(user.id);
    return NextResponse.json({ participantId });
  } catch (error) {
    console.error("GET /api/events/me-participant-id error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getHandler);
