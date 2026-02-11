import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getCrmCustomFields, upsertContactCustomFieldValueBulk } from "@/lib/supabase/crm";

/**
 * POST /api/crm/contacts/custom-fields/bulk
 * Set or clear one custom field value for selected contacts.
 * Body: { contactIds: string[], custom_field_id: string, value: string | null }.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { contactIds, custom_field_id, value } = body as {
      contactIds?: unknown;
      custom_field_id?: string;
      value?: string | null;
    };
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds must be a non-empty array" },
        { status: 400 }
      );
    }
    const ids = contactIds.filter((id): id is string => typeof id === "string");
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "contactIds must contain at least one valid string id" },
        { status: 400 }
      );
    }
    if (typeof custom_field_id !== "string" || !custom_field_id.trim()) {
      return NextResponse.json(
        { error: "custom_field_id (string) is required" },
        { status: 400 }
      );
    }
    const definitions = await getCrmCustomFields();
    if (!definitions.some((f) => f.id === custom_field_id)) {
      return NextResponse.json(
        { error: "Invalid custom_field_id. No such custom field." },
        { status: 400 }
      );
    }
    const valueNorm = value === undefined || value === "" ? null : String(value);
    const { success, error } = await upsertContactCustomFieldValueBulk(
      ids,
      custom_field_id.trim(),
      valueNorm
    );
    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update custom field values" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error bulk updating contact custom fields:", error);
    return NextResponse.json(
      { error: "Failed to update custom field values" },
      { status: 500 }
    );
  }
}
