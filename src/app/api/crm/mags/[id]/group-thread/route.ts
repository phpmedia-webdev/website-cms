import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole } from "@/lib/auth/resolve-role";
import { isMemberRole } from "@/lib/php-auth/role-mapping";
import { getMagById } from "@/lib/supabase/crm";
import {
  getOrCreateMagGroupThread,
  listMagGroupThreadsForMagIds,
  listThreadMessages,
  insertThreadMessage,
} from "@/lib/supabase/conversation-threads";
import { assertCanPostThreadMessage } from "@/lib/message-center/mag-thread-policy";
import { enrichThreadMessageAuthors } from "@/lib/message-center/thread-message-author-enrichment";
import { threadMessageIsAdminBroadcast } from "@/lib/message-center/thread-message-metadata";

async function requireStaff(): Promise<
  { user: { id: string }; error: null } | { user: null; error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = await getRoleForCurrentUser();
  if (role === null || !isAdminRole(role) || isMemberRole(role)) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: { id: user.id }, error: null };
}

/**
 * GET — list existing `mag_group` thread messages for this MAG (does **not** create a thread).
 * POST — get-or-create thread + staff message (first post bootstraps the room).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStaff();
    if (gate.error) return gate.error;

    const { id: magId } = await params;
    const mag = await getMagById(magId);
    if (!mag) {
      return NextResponse.json({ error: "MAG not found" }, { status: 404 });
    }

    const threads = await listMagGroupThreadsForMagIds([magId]);
    const thread = threads.find((t) => t.mag_id?.trim() === magId.trim()) ?? null;
    if (!thread) {
      return NextResponse.json({
        threadId: null,
        mag: { id: mag.id, name: mag.name, allow_conversations: mag.allow_conversations },
        data: [],
        authors: {},
        contactNames: {},
        memberContactNames: {},
      });
    }

    const raw = await listThreadMessages(thread.id, { limit: 200 });
    const data = raw.filter((m) => !threadMessageIsAdminBroadcast(m.metadata));
    const { authors, contactNames, memberContactNames } = await enrichThreadMessageAuthors(data);
    return NextResponse.json({
      threadId: thread.id,
      mag: { id: mag.id, name: mag.name, allow_conversations: mag.allow_conversations },
      data,
      authors,
      contactNames,
      memberContactNames,
    });
  } catch (e) {
    console.error("GET /api/crm/mags/[id]/group-thread:", e);
    return NextResponse.json({ error: "Failed to load group thread" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStaff();
    if (gate.error) return gate.error;

    const { id: magId } = await params;
    const mag = await getMagById(magId);
    if (!mag) {
      return NextResponse.json({ error: "MAG not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as { body?: unknown };
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const { thread, error: tErr } = await getOrCreateMagGroupThread(magId);
    if (tErr || !thread) {
      return NextResponse.json({ error: tErr?.message ?? "Thread error" }, { status: 400 });
    }

    const postGate = await assertCanPostThreadMessage({
      threadId: thread.id,
      authorUserId: gate.user.id,
      authorContactId: null,
    });
    if (!postGate.ok) {
      return NextResponse.json({ error: postGate.message }, { status: postGate.status });
    }

    const { message, error: mErr } = await insertThreadMessage({
      thread_id: thread.id,
      body: text,
      author_user_id: gate.user.id,
      author_contact_id: null,
      metadata: { source: "mag_admin_comments_tab", mag_id: magId },
    });
    if (mErr || !message) {
      return NextResponse.json({ error: mErr?.message ?? "Failed to post" }, { status: 400 });
    }

    return NextResponse.json({ message, threadId: thread.id });
  } catch (e) {
    console.error("POST /api/crm/mags/[id]/group-thread:", e);
    return NextResponse.json({ error: "Failed to post" }, { status: 500 });
  }
}
