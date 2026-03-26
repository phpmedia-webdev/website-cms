/**
 * GET /api/admin/message-center/unread — unread thread count for current admin (participant vs last message).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { countUnreadThreadsForUser } from "@/lib/supabase/conversation-threads";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const unreadThreads = await countUnreadThreadsForUser(user.id);
    return NextResponse.json({ unreadThreads });
  } catch (e) {
    console.error("GET /api/admin/message-center/unread:", e);
    return NextResponse.json({ error: "Failed to count unread" }, { status: 500 });
  }
}
