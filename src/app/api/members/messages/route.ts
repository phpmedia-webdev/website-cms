/**
 * POST /api/members/messages
 * Step 39: Client sends message to support. Creates note with note_type=message, contact_id=member's contact, recipient_contact_id=null.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMemberByUserId } from "@/lib/supabase/members";
import { createNote } from "@/lib/supabase/crm";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await getMemberByUserId(user.id);
    if (!member) {
      return NextResponse.json({ error: "Members only" }, { status: 403 });
    }

    const body = await request.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Message body required" }, { status: 400 });
    }
    const parentNoteId = typeof body.parent_note_id === "string" ? body.parent_note_id : null;

    const { note, error } = await createNote(
      member.contact_id,
      text,
      user.id,
      "message",
      null,
      parentNoteId ?? undefined
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(note);
  } catch (error) {
    console.error("POST /api/members/messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
