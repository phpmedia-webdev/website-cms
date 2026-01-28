import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { updateCrmCustomField, deleteCrmCustomField } from "@/lib/supabase/crm";

/**
 * PATCH /api/crm/custom-fields/[id]
 * Update a CRM custom field definition (authenticated).
 */
export async function PATCH(
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
    const { field, error } = await updateCrmCustomField(id, body);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to update custom field" }, { status: 500 });
    }
    return NextResponse.json(field);
  } catch (error) {
    console.error("Error updating CRM custom field:", error);
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/custom-fields/[id]
 * Delete a CRM custom field definition (authenticated).
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
    const { success, error } = await deleteCrmCustomField(id);
    if (error || !success) {
      return NextResponse.json({ error: error?.message || "Failed to delete custom field" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting CRM custom field:", error);
    return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 });
  }
}
