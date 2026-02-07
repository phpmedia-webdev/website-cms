import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { addContactToMag, removeContactFromMag, getContactMags } from "@/lib/supabase/crm";
import { createMemberForContact } from "@/lib/supabase/members";

/**
 * GET /api/crm/contacts/[id]/mags
 * Get MAGs for a contact (authenticated).
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
    const mags = await getContactMags(id);
    return NextResponse.json(mags);
  } catch (error) {
    console.error("Error fetching contact MAGs:", error);
    return NextResponse.json({ error: "Failed to fetch MAGs" }, { status: 500 });
  }
}

/**
 * POST /api/crm/contacts/[id]/mags
 * Add contact to a MAG (authenticated).
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
    const { success, error } = await addContactToMag(id, body.mag_id, body.assigned_via);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to add MAG" }, { status: 500 });
    }
    // Elevate contact to member when admin assigns MAG (Phase 9C): idempotent members row for redeem/Apply code.
    const { error: memberErr } = await createMemberForContact(id);
    if (memberErr) {
      console.error("createMemberForContact after admin assign MAG:", memberErr);
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error adding contact to MAG:", error);
    return NextResponse.json({ error: "Failed to add MAG" }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/contacts/[id]/mags
 * Remove contact from a MAG (authenticated).
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
    const { success, error } = await removeContactFromMag(id, body.mag_id);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to remove MAG" }, { status: 500 });
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error removing contact from MAG:", error);
    return NextResponse.json({ error: "Failed to remove MAG" }, { status: 500 });
  }
}
