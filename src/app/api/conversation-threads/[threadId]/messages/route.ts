import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { insertThreadMessage, listThreadMessages } from "@/lib/supabase/conversation-threads";

/**
 * GET /api/conversation-threads/[threadId]/messages?limit=200
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { threadId } = await params;
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    const data = await listThreadMessages(threadId, {
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET thread messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

/**
 * POST /api/conversation-threads/[threadId]/messages
 * Body: { body, parent_message_id?, author_contact_id? } — author_user_id = current user when staff.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { threadId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const text = typeof body.body === "string" ? body.body : "";
    const { message, error } = await insertThreadMessage({
      thread_id: threadId,
      body: text,
      author_user_id: user.id,
      author_contact_id:
        typeof body.author_contact_id === "string" ? body.author_contact_id : null,
      parent_message_id:
        typeof body.parent_message_id === "string" ? body.parent_message_id : null,
      metadata:
        body.metadata && typeof body.metadata === "object" && body.metadata !== null
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data: message });
  } catch (error) {
    console.error("POST thread message:", error);
    return NextResponse.json({ error: "Failed to add message" }, { status: 500 });
  }
}
