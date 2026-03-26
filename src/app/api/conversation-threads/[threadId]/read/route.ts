/**
 * PATCH /api/conversation-threads/[threadId]/read — mark thread read for current user (Message Center).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { updateThreadParticipantLastRead } from "@/lib/supabase/conversation-threads";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { threadId } = await params;
    const { ok, error } = await updateThreadParticipantLastRead({
      thread_id: threadId,
      user_id: user.id,
    });
    if (!ok) {
      return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH thread read:", e);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}
