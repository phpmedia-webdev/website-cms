import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { updateForm, deleteForm } from "@/lib/supabase/crm";

/**
 * PATCH /api/crm/forms/[id]
 * Update a form definition (authenticated).
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
    const { form, error } = await updateForm(id, body);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to update form" }, { status: 500 });
    }
    return NextResponse.json(form);
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/forms/[id]
 * Delete a form definition (authenticated).
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
    const { success, error } = await deleteForm(id);
    if (error || !success) {
      return NextResponse.json({ error: error?.message || "Failed to delete form" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
}
