import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getContactOrganizations,
  setContactOrganizations,
} from "@/lib/supabase/organizations";

/**
 * GET /api/crm/contacts/[id]/organizations
 * List organizations linked to this contact (ordered; first = primary).
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
    const links = await getContactOrganizations(id);
    return NextResponse.json({
      organizations: links.map((l) => ({
        id: l.organization_id,
        organization_id: l.organization_id,
        role: l.role,
        sort_order: l.sort_order,
        organization: l.organization,
      })),
    });
  } catch (error) {
    console.error("Error fetching contact organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/contacts/[id]/organizations
 * Set contact's organizations. Body: { organization_ids: string[] }. Order = primary first.
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
    const { id } = await params;
    const body = await request.json();
    const organization_ids = Array.isArray(body.organization_ids)
      ? body.organization_ids.filter((x: unknown) => typeof x === "string")
      : [];
    const { error } = await setContactOrganizations(id, organization_ids);
    if (error) {
      return NextResponse.json(
        { error: (error as Error).message ?? "Failed to update organizations" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating contact organizations:", error);
    return NextResponse.json(
      { error: "Failed to update organizations" },
      { status: 500 }
    );
  }
}
