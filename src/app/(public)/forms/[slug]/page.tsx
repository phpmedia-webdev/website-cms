import { notFound } from "next/navigation";
import { getFormByIdOrSlug, getFormFields, getCrmCustomFields } from "@/lib/supabase/crm";
import { CORE_FORM_FIELDS } from "@/lib/supabase/crm";
import { PublicFormClient } from "./PublicFormClient";

export interface PublicFormFieldConfig {
  submitKey: string;
  label: string;
  required: boolean;
  type: "email" | "text" | "textarea" | "tel";
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await getFormByIdOrSlug(slug);
  if (!form) {
    notFound();
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

  return (
    <main className="container mx-auto px-4 py-12 max-w-lg">
      <h1 className="text-2xl font-bold mb-2">{form.name}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Fill out the form below and we’ll get back to you.
      </p>
      <PublicFormClient
        formSlug={form.slug}
        formName={form.name}
        successMessage={successMessage}
        fields={fields}
      />
    </main>
  );
}
