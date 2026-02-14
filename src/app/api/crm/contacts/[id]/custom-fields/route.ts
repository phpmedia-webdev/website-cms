import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getContactById, getContactCustomFields, upsertContactCustomFieldValue } from "@/lib/supabase/crm";

/**
 * GET /api/crm/contacts/[id]/custom-fields
 * Return custom field values for a contact (merge preview, etc.).
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
    const { id: contactId } = await params;
    const contact = await getContactById(contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    const customFields = await getContactCustomFields(contactId);
    return NextResponse.json(customFields);
  } catch (error) {
    console.error("Error fetching contact custom fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/crm/contacts/[id]/custom-fields
 * Set one or more custom field values for a contact (authenticated admin).
 *
 * Body (single): { custom_field_id: string, value: string | null }
 * Body (batch):  { values: { [custom_field_id]: string | null } }
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

    const { id: contactId } = await params;
    const contact = await getContactById(contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await request.json();

    // Single-field: { custom_field_id, value }
    if (typeof body.custom_field_id === "string") {
      const { custom_field_id, value } = body;
      const valueNorm = value === undefined || value === "" ? null : String(value);
      const { error } = await upsertContactCustomFieldValue(
        contactId,
        custom_field_id,
        valueNorm
      );
      if (error) {
        return NextResponse.json(
          { error: error.message || "Failed to update custom field value" },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    // Batch: { values: { [custom_field_id]: value } }
    if (body.values && typeof body.values === "object" && !Array.isArray(body.values)) {
      const values = body.values as Record<string, string | null | undefined>;
      for (const [customFieldId, value] of Object.entries(values)) {
        const valueNorm = value === undefined || value === "" ? null : String(value);
        const { error } = await upsertContactCustomFieldValue(
          contactId,
          customFieldId,
          valueNorm
        );
        if (error) {
          return NextResponse.json(
            { error: error.message || "Failed to update custom field value" },
            { status: 500 }
          );
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Body must be { custom_field_id, value } or { values: { [id]: value } }" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating contact custom fields:", error);
    return NextResponse.json(
      { error: "Failed to update custom fields" },
      { status: 500 }
    );
  }
}
