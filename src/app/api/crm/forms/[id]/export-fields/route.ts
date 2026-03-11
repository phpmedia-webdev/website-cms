import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getFormFields,
  getCrmCustomFields,
  CORE_FORM_FIELDS,
  type FormFieldAssignment,
} from "@/lib/supabase/crm";

/**
 * GET /api/crm/forms/[id]/export-fields
 * Returns available CSV export columns for a form: system columns (Submitted, Contact ID) plus form fields with labels.
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
    const { id: formId } = await params;
    if (!formId) {
      return NextResponse.json({ error: "Form ID required" }, { status: 400 });
    }

    const [assignments, customFields] = await Promise.all([
      getFormFields(formId),
      getCrmCustomFields(),
    ]);

    const customById = new Map(customFields.map((c) => [c.id, c.label]));

    const columns: { key: string; label: string }[] = [
      { key: "submitted_at", label: "Submitted" },
      { key: "contact_id", label: "Contact ID" },
    ];

    for (const a of assignments as FormFieldAssignment[]) {
      if (a.field_source === "core" && a.core_field_key) {
        const core = CORE_FORM_FIELDS.find((f) => f.key === a.core_field_key);
        columns.push({
          key: a.core_field_key,
          label: core?.label ?? a.core_field_key,
        });
      } else if (a.field_source === "custom" && a.custom_field_id) {
        const label = customById.get(a.custom_field_id) ?? `Custom ${a.custom_field_id}`;
        columns.push({
          key: `custom_${a.custom_field_id}`,
          label,
        });
      }
    }

    return NextResponse.json({ columns });
  } catch (error) {
    console.error("Error fetching export fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch export fields" },
      { status: 500 }
    );
  }
}
