import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getCrmNoteTypes, setCrmNoteTypes } from "@/lib/supabase/settings";

/**
 * GET /api/settings/crm/note-types
 * Get CRM note types (authenticated).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const types = await getCrmNoteTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("Error fetching note types:", error);
    return NextResponse.json({ error: "Failed to fetch note types" }, { status: 500 });
  }
}

/**
 * PUT /api/settings/crm/note-types
 * Update CRM note types (authenticated).
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    if (!Array.isArray(body.types)) {
      return NextResponse.json({ error: "types must be an array" }, { status: 400 });
    }
    const success = await setCrmNoteTypes(body.types);
    if (!success) {
      return NextResponse.json({ error: "Failed to save note types" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating note types:", error);
    return NextResponse.json({ error: "Failed to update note types" }, { status: 500 });
  }
}
