import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { addContactToMarketingList, removeContactFromMarketingList, getContactMarketingLists } from "@/lib/supabase/crm";

/**
 * GET /api/crm/contacts/[id]/lists
 * Get marketing lists for a contact (authenticated).
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
    const lists = await getContactMarketingLists(id);
    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching contact lists:", error);
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
  }
}

/**
 * POST /api/crm/contacts/[id]/lists
 * Add contact to a marketing list (authenticated).
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
    const { success, error } = await addContactToMarketingList(id, body.list_id);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to add to list" }, { status: 500 });
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error adding contact to list:", error);
    return NextResponse.json({ error: "Failed to add to list" }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/contacts/[id]/lists
 * Remove contact from a marketing list (authenticated).
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
    const { id } = await params;
    const body = await request.json();
    const { success, error } = await removeContactFromMarketingList(id, body.list_id);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to remove from list" }, { status: 500 });
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error removing contact from list:", error);
    return NextResponse.json({ error: "Failed to remove from list" }, { status: 500 });
  }
}
