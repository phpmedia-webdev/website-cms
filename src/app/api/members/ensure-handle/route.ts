/**
 * POST /api/members/ensure-handle — Ensure current member has a handle (auto-generate if missing).
 * Does NOT enable communicate_in_messages. Used before creating a support ticket so the ticket can be created.
 * When a handle is auto-generated, adds an activity stream entry (visible to user and admin).
 * Returns { handle, created }.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getOrCreateMemberHandle } from "@/lib/supabase/profiles";
import { getMemberByUserId } from "@/lib/supabase/members";
import { createNote } from "@/lib/supabase/crm";

const HANDLE_AUTO_GENERATED_MESSAGE =
  "A handle was auto-generated for your account. You can change it in Profile.";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { handle, created } = await getOrCreateMemberHandle(user.id);
    if (created) {
      const member = await getMemberByUserId(user.id);
      if (member) {
        const { error } = await createNote(
          member.contact_id,
          HANDLE_AUTO_GENERATED_MESSAGE,
          null,
          "system"
        );
        if (error) {
          console.error("ensure-handle: failed to create activity entry", error);
        }
      }
    }
    return NextResponse.json({ handle, created });
  } catch (e) {
    console.error("ensure-handle:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to ensure handle" },
      { status: 500 }
    );
  }
}
