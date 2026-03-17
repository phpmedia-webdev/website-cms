/**
 * GET /api/tasks/[id]/notes — Get conversation (thread) notes for a task.
 * POST /api/tasks/[id]/notes — Add a note to the task thread (conversation_uid = task:id).
 * Admin only. Task visibility enforced via getTaskById.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getTaskById, getFirstTaskFollowerContactId } from "@/lib/supabase/projects";
import {
  getNotesByConversationUid,
  taskConversationUid,
  createNote,
} from "@/lib/supabase/crm";

async function requireAdmin(): Promise<{ error: string; status: number } | null> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required", status: 403 };
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const { id: taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const task = await getTaskById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const conversationUid = taskConversationUid(taskId);
    const notes = await getNotesByConversationUid(conversationUid);
    return NextResponse.json(notes);
  } catch (error) {
    console.error("GET /api/tasks/[id]/notes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const task = await getTaskById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await request.json();
    const noteBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!noteBody) return NextResponse.json({ error: "Body required" }, { status: 400 });

    const parentNoteId =
      typeof body.parent_note_id === "string" && body.parent_note_id
        ? body.parent_note_id
        : undefined;
    let contactId: string | null =
      typeof body.contact_id === "string" && body.contact_id ? body.contact_id : null;
    if (!contactId) contactId = await getFirstTaskFollowerContactId(taskId);
    if (!contactId) {
      return NextResponse.json(
        { error: "No contact linked to this task. Add a contact as follower or provide contact_id." },
        { status: 400 }
      );
    }

    const conversationUid = taskConversationUid(taskId);
    const { note, error } = await createNote(
      contactId,
      noteBody,
      user.id,
      body.note_type ?? "task",
      undefined,
      parentNoteId ?? undefined,
      taskId,
      conversationUid
    );
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to create note" }, { status: 500 });
    }
    return NextResponse.json(note);
  } catch (error) {
    console.error("POST /api/tasks/[id]/notes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
