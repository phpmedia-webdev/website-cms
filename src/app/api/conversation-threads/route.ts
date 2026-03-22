import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  addThreadParticipant,
  createConversationThread,
  insertThreadMessage,
  isValidThreadType,
} from "@/lib/supabase/conversation-threads";

/**
 * POST /api/conversation-threads
 * Phase 18C: create a thread; optional `first_message` and `participant` for bootstrap.
 * Body: { thread_type, mag_id?, subject_type?, subject_id?, first_message?: { body }, participant?: { user_id?, contact_id? } }
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const threadType = typeof body.thread_type === "string" ? body.thread_type : "";
    if (!isValidThreadType(threadType)) {
      return NextResponse.json({ error: "invalid thread_type" }, { status: 400 });
    }
    const { thread, error } = await createConversationThread({
      thread_type: threadType,
      mag_id: typeof body.mag_id === "string" ? body.mag_id : null,
      subject_type: typeof body.subject_type === "string" ? body.subject_type : undefined,
      subject_id: typeof body.subject_id === "string" ? body.subject_id : undefined,
    });
    if (error || !thread) {
      return NextResponse.json({ error: error?.message ?? "Failed to create thread" }, { status: 400 });
    }

    let firstMessage = null;
    const fm = body.first_message;
    if (fm && typeof fm === "object" && fm !== null && "body" in fm) {
      const text = typeof (fm as { body?: unknown }).body === "string" ? (fm as { body: string }).body : "";
      const { message, error: msgErr } = await insertThreadMessage({
        thread_id: thread.id,
        body: text,
        author_user_id: user.id,
      });
      if (msgErr) {
        return NextResponse.json({ error: msgErr.message, thread }, { status: 400 });
      }
      firstMessage = message;
    }

    const p = body.participant;
    if (p && typeof p === "object" && p !== null) {
      const userId = "user_id" in p && typeof (p as { user_id?: unknown }).user_id === "string"
        ? (p as { user_id: string }).user_id
        : null;
      const contactId =
        "contact_id" in p && typeof (p as { contact_id?: unknown }).contact_id === "string"
          ? (p as { contact_id: string }).contact_id
          : null;
      if (userId || contactId) {
        const { error: partErr } = await addThreadParticipant({
          thread_id: thread.id,
          user_id: userId,
          contact_id: contactId,
        });
        if (partErr) {
          return NextResponse.json(
            { error: partErr.message, thread, firstMessage },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({ data: { thread, firstMessage } });
  } catch (error) {
    console.error("POST /api/conversation-threads:", error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
