/**
 * DELETE /api/admin/message-center/notes/[id]
 * Remove a global NOTE:SELF scratch row only (author-only; audit timeline rows are not deletable here).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { deleteGlobalSelfNoteForAuthor } from "@/lib/supabase/contact-notifications-timeline";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const timelineId = typeof id === "string" ? id.trim() : "";
    if (!timelineId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const result = await deleteGlobalSelfNoteForAuthor(timelineId, user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/message-center/notes/[id]:", e);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
