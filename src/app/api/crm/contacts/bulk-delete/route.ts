import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { softDeleteContactsBulk } from "@/lib/supabase/crm";

/**
 * POST /api/crm/contacts/bulk-delete
 * Soft-delete (trash) selected contacts. Body: { contactIds: string[] }.
 * Contacts are recoverable via restore.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { contactIds } = body as { contactIds?: string[] };
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds (non-empty array) is required" },
        { status: 400 }
      );
    }
    const { success, error } = await softDeleteContactsBulk(contactIds);
    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to move contacts to trash" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error bulk soft-deleting contacts:", error);
    return NextResponse.json(
      { error: "Failed to move contacts to trash" },
      { status: 500 }
    );
  }
}
