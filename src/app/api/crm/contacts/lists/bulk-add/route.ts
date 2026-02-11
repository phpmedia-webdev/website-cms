import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { addContactsToMarketingListBulk } from "@/lib/supabase/crm";

/**
 * POST /api/crm/contacts/lists/bulk-add
 * Add selected contacts to a marketing list. Body: { contactIds: string[], listId: string }.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { contactIds, listId } = body as { contactIds?: string[]; listId?: string };
    if (!Array.isArray(contactIds) || contactIds.length === 0 || typeof listId !== "string" || !listId) {
      return NextResponse.json(
        { error: "contactIds (non-empty array) and listId (string) are required" },
        { status: 400 }
      );
    }
    const { success, error } = await addContactsToMarketingListBulk(contactIds, listId);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to add contacts to list" }, { status: 500 });
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error bulk adding contacts to list:", error);
    return NextResponse.json({ error: "Failed to add contacts to list" }, { status: 500 });
  }
}
