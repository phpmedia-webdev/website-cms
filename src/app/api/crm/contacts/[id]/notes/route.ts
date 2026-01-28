import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createNote, getContactNotes, updateNote, deleteNote } from "@/lib/supabase/crm";

/**
 * GET /api/crm/contacts/[id]/notes
 * Get notes for a contact (authenticated).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const notes = await getContactNotes(id);
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

/**
 * POST /api/crm/contacts/[id]/notes
 * Create a note for a contact (authenticated).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { note, error } = await createNote(id, body.body, user.id, body.note_type ?? null);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to create note" }, { status: 500 });
    }
    return NextResponse.json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

/**
 * PUT /api/crm/contacts/[id]/notes
 * Update a note (authenticated).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await params; // consume params even though we use note_id from body
    const body = await request.json();
    const { note, error } = await updateNote(body.note_id, body.body, body.note_type ?? null);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to update note" }, { status: 500 });
    }
    return NextResponse.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/contacts/[id]/notes
 * Delete a note (authenticated).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await params;
    const body = await request.json();
    const { success, error } = await deleteNote(body.note_id);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to delete note" }, { status: 500 });
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
