import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from "@/lib/supabase/organizations";

/**
 * GET /api/crm/organizations/[id]
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
    const org = await getOrganizationById(id);
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(org);
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/organizations/[id]
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
    const { name, email, phone, type, industry } = body;
    const { organization, error } = await updateOrganization(
      id,
      {
        name,
        email,
        phone,
        type,
        industry,
      }
    );
    if (error) {
      return NextResponse.json(
        { error: (error as Error).message ?? "Failed to update organization" },
        { status: 500 }
      );
    }
    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/organizations/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const { error } = await deleteOrganization(id);
    if (error) {
      return NextResponse.json(
        { error: (error as Error).message ?? "Failed to delete organization" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
