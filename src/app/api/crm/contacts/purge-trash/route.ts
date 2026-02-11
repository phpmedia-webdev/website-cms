import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { purgeAllTrashedContacts } from "@/lib/supabase/crm";

/**
 * POST /api/crm/contacts/purge-trash
 * Permanently delete all trashed contacts. Cannot be undone.
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { success, count, error } = await purgeAllTrashedContacts();
    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to empty trash" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success, count: count ?? 0 });
  } catch (error) {
    console.error("Error purging trash:", error);
    return NextResponse.json(
      { error: "Failed to empty trash" },
      { status: 500 }
    );
  }
}
