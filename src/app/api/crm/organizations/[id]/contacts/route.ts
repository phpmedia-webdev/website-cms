import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getContactsByOrganizationId } from "@/lib/supabase/organizations";

/**
 * GET /api/crm/organizations/[id]/contacts
 * List contacts linked to this organization (for org detail "related contacts").
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
    const contacts = await getContactsByOrganizationId(id);
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Error fetching organization contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}
