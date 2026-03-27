/**
 * POST /api/admin/message-center/mark-read
 * Body: { threadIds: string[] } — mark conversation threads read for current user.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { updateThreadParticipantLastRead } from "@/lib/supabase/conversation-threads";

const MAX_BATCH = 40;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await request.json().catch(() => ({}))) as { threadIds?: unknown };
    const raw = Array.isArray(body.threadIds) ? body.threadIds : [];
    const threadIds = raw
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim())
      .slice(0, MAX_BATCH);

    if (threadIds.length === 0) {
      return NextResponse.json({ error: "threadIds required" }, { status: 400 });
    }

    let okCount = 0;
    const errors: string[] = [];
    for (const threadId of threadIds) {
      const { ok, error } = await updateThreadParticipantLastRead({
        thread_id: threadId,
        user_id: user.id,
      });
      if (ok) okCount++;
      else if (error?.message) errors.push(`${threadId}: ${error.message}`);
    }

    return NextResponse.json({
      ok: true,
      marked: okCount,
      requested: threadIds.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    console.error("POST /api/admin/message-center/mark-read:", e);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}
