/**
 * POST /api/admin/message-center/notes
 * Create an admin scratch note for Message Center (global, not tied to one contact).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { insertContactNotificationsTimeline } from "@/lib/supabase/contact-notifications-timeline";

function titleFromBody(body: string): string {
  const line = body.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return "Note";
  if (line.length > 200) return `${line.slice(0, 197)}…`;
  return line;
}

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
    const body = (await request.json().catch(() => ({}))) as { body?: unknown };
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }
    const { row, error } = await insertContactNotificationsTimeline({
      contact_id: null,
      kind: "staff_note",
      visibility: "admin_only",
      title: titleFromBody(text),
      body: text,
      metadata: { note_type: "staff_note", scope: "note_to_self" },
      author_user_id: user.id,
      recipient_user_id: user.id,
      source_event: null,
    });
    if (error || !row) {
      return NextResponse.json({ error: error?.message ?? "Failed to create note" }, { status: 500 });
    }
    return NextResponse.json({ data: row });
  } catch (e) {
    console.error("POST /api/admin/message-center/notes:", e);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
