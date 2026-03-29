import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole } from "@/lib/auth/resolve-role";
import { isMemberRole } from "@/lib/php-auth/role-mapping";
import {
  getConversationThreadById,
  insertThreadMessage,
  listThreadMessages,
} from "@/lib/supabase/conversation-threads";
import { enrichThreadMessageAuthors } from "@/lib/message-center/thread-message-author-enrichment";
import {
  assertCanPostThreadMessage,
  assertMemberCanReadThread,
} from "@/lib/message-center/mag-thread-policy";
import { threadMessageIsAdminBroadcast } from "@/lib/message-center/thread-message-metadata";

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
    const readGate = await assertMemberCanReadThread(threadId, user.id);
    if (!readGate.ok) {
      return NextResponse.json({ error: readGate.message }, { status: readGate.status });
    }
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    let data = await listThreadMessages(threadId, {
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    /** GPUM / members: broadcast posts are notifications, not part of the COMMENT:GROUP transcript. */
    const thread = await getConversationThreadById(threadId);
    if (thread?.thread_type === "mag_group") {
      const role = await getRoleForCurrentUser();
      const isStaffReader =
        role !== null && isAdminRole(role) && !isMemberRole(role);
      if (!isStaffReader) {
        data = data.filter((m) => !threadMessageIsAdminBroadcast(m.metadata));
      }
    }
    const enrichAuthors = searchParams.get("enrichAuthors") === "1";
    if (enrichAuthors && data.length > 0) {
      const { authors, contactNames, memberContactNames } = await enrichThreadMessageAuthors(data);
      return NextResponse.json({ data, authors, contactNames, memberContactNames });
    }
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
    const authorContactId =
      typeof body.author_contact_id === "string" ? body.author_contact_id : null;
    const gate = await assertCanPostThreadMessage({
      threadId,
      authorUserId: user.id,
      authorContactId,
    });
    if (!gate.ok) {
      return NextResponse.json({ error: gate.message }, { status: gate.status });
    }
    const { message, error } = await insertThreadMessage({
      thread_id: threadId,
      body: text,
      author_user_id: user.id,
      author_contact_id: authorContactId,
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
