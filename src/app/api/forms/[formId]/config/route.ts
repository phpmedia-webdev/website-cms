/**
 * GET /api/forms/[formId]/config — public form config for embedding (shortcode, iframe).
 * Returns { slug, name, successMessage, fields }.
 * No auth required; form is public.
 */

import { NextResponse } from "next/server";
import {
  getFormByIdOrSlug,
  getFormFields,
  getCrmCustomFields,
  CORE_FORM_FIELDS,
} from "@/lib/supabase/crm";

export interface PublicFormFieldConfig {
  submitKey: string;
  label: string;
  required: boolean;
  type: "email" | "text" | "textarea" | "tel";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    if (!formId?.trim()) {
      return NextResponse.json({ error: "Form ID or slug required" }, { status: 400 });
    }
    const form = await getFormByIdOrSlug(formId.trim());
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    const [formFields, customFields] = await Promise.all([
      getFormFields(form.id),
      getCrmCustomFields(),
    ]);

    const fields: PublicFormFieldConfig[] = formFields.map((f) => {
      if (f.field_source === "core" && f.core_field_key) {
        const core = CORE_FORM_FIELDS.find((c) => c.key === f.core_field_key);
        const label = core?.label ?? f.core_field_key;
        const type: PublicFormFieldConfig["type"] =
          f.core_field_key === "email"
            ? "email"
            : f.core_field_key === "phone"
              ? "tel"
              : f.core_field_key === "message"
                ? "textarea"
                : "text";
        return {
          submitKey: f.core_field_key,
          label,
          required: f.required ?? false,
          type,
        };
      }
      if (f.field_source === "custom" && f.custom_field_id) {
        const custom = customFields.find((c) => c.id === f.custom_field_id);
        const label = custom?.label ?? `Field ${f.custom_field_id}`;
        const customType = (custom?.type ?? "text") as string;
        const type: PublicFormFieldConfig["type"] =
          customType === "email"
            ? "email"
            : customType === "tel" || customType === "phone"
              ? "tel"
              : customType === "textarea"
                ? "textarea"
                : "text";
        return {
          submitKey: `custom_${f.custom_field_id}`,
          label,
          required: f.required ?? false,
          type,
        };
      }
      return {
        submitKey: "unknown",
        label: "Unknown",
        required: false,
        type: "text" as const,
      };
    });

    const successMessage =
      (form.settings as { success_message?: string })?.success_message ??
      "Thank you for your submission!";

    return NextResponse.json({
      slug: form.slug,
      name: form.name,
      successMessage,
      fields,
    });
  } catch (e) {
    console.error("GET /api/forms/[formId]/config:", e);
    return NextResponse.json(
      { error: "Failed to load form config" },
      { status: 500 }
    );
  }
}
