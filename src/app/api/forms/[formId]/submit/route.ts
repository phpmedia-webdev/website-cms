import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/middleware";
import {
  getFormByIdOrSlug,
  getFormFields,
  getContactByEmail,
  createContact,
  updateContact,
  addContactToMag,
  getContactCustomFields,
  upsertContactCustomFieldValue,
  insertFormSubmission,
  type FormFieldAssignment,
} from "@/lib/supabase/crm";
import { getCrmContactStatuses } from "@/lib/supabase/settings";

const CORE_KEYS = [
  "email",
  "phone",
  "first_name",
  "last_name",
  "full_name",
  "company",
  "address",
  "city",
  "state",
  "postal_code",
  "country",
  "message",
] as const;

function getPayloadValue(
  body: Record<string, unknown>,
  field: FormFieldAssignment
): string | null {
  if (field.field_source === "core" && field.core_field_key) {
    const v = body[field.core_field_key];
    return v != null && v !== "" ? String(v) : null;
  }
  if (field.field_source === "custom" && field.custom_field_id) {
    const v = body[`custom_${field.custom_field_id}`];
    return v != null && v !== "" ? String(v) : null;
  }
  return null;
}

/**
 * POST /api/forms/[formId]/submit
 * Validates payload against form fields, matches or creates contact, inserts submission.
 */
async function handler(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const form = await getFormByIdOrSlug(formId);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const formFields = await getFormFields(form.id);
    for (const field of formFields) {
      if (!field.required) continue;
      const val = getPayloadValue(body, field);
      if (val === null) {
        const label =
          field.field_source === "core"
            ? field.core_field_key
            : `custom_${field.custom_field_id}`;
        return NextResponse.json(
          { error: `Field ${label} is required` },
          { status: 400 }
        );
      }
    }

    const email = (body.email != null && body.email !== "")
      ? String(body.email)
      : null;
    const existingContact = await getContactByEmail(email);

    const statuses = await getCrmContactStatuses();
    const defaultStatus = statuses[0]?.slug ?? "new";

    let contactId: string | null = null;

    if (!existingContact) {
      const corePayload: Record<string, unknown> = {
        status: defaultStatus,
        source: "form",
        form_id: form.id,
      };
      for (const key of CORE_KEYS) {
        const v = body[key];
        if (v != null && v !== "") corePayload[key] = String(v);
      }
      // Ensure message is set when form has message field (defensive for casing or client quirks)
      const hasMessageField = formFields.some(
        (f) => f.field_source === "core" && f.core_field_key === "message"
      );
      if (hasMessageField) {
        const msg =
          body.message != null && body.message !== ""
            ? String(body.message)
            : (body as Record<string, unknown>).Message != null &&
                (body as Record<string, unknown>).Message !== ""
              ? String((body as Record<string, unknown>).Message)
              : null;
        if (msg !== null) corePayload.message = msg;
      }
      const { contact: created, error: createErr } = await createContact(
        corePayload as Parameters<typeof createContact>[0]
      );
      if (createErr || !created) {
        return NextResponse.json(
          { error: createErr?.message ?? "Failed to create contact" },
          { status: 500 }
        );
      }
      contactId = created.id;

      for (const field of formFields) {
        if (field.field_source !== "custom" || !field.custom_field_id) continue;
        const val = getPayloadValue(body, field);
        if (val !== null) {
          await upsertContactCustomFieldValue(created.id, field.custom_field_id, val);
        }
      }

      if (form.auto_assign_mag_ids?.length) {
        for (const magId of form.auto_assign_mag_ids) {
          await addContactToMag(created.id, magId, "form");
        }
      }
    } else {
      contactId = existingContact.id;

      const updatePayload: Record<string, unknown> = {};
      const messageField = formFields.find((f) => f.core_field_key === "message");
      const messageVal =
        messageField && body.message != null && body.message !== ""
          ? String(body.message)
          : null;
      if (messageVal !== null) {
        const existingMessage = existingContact.message?.trim() ?? "";
        updatePayload.message = existingMessage
          ? `${existingMessage}\n\n${messageVal}`
          : messageVal;
      }

      for (const key of CORE_KEYS) {
        if (key === "message") continue;
        const bodyVal = body[key];
        if (bodyVal == null || bodyVal === "") continue;
        const existingVal = (existingContact as unknown as Record<string, unknown>)[key];
        const isEmpty =
          existingVal == null || String(existingVal).trim() === "";
        if (isEmpty) (updatePayload as unknown as Record<string, unknown>)[key] = String(bodyVal);
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateErr } = await updateContact(
          existingContact.id,
          updatePayload as Parameters<typeof updateContact>[1]
        );
        if (updateErr) {
          return NextResponse.json(
            { error: updateErr.message },
            { status: 500 }
          );
        }
      }

      const customValues = await getContactCustomFields(existingContact.id);
      const customByFieldId = new Map(
        customValues.map((c) => [c.custom_field_id, c.value])
      );
      for (const field of formFields) {
        if (field.field_source !== "custom" || !field.custom_field_id) continue;
        const bodyVal = getPayloadValue(body, field);
        if (bodyVal === null) continue;
        const current = customByFieldId.get(field.custom_field_id);
        const isEmpty = current == null || String(current).trim() === "";
        if (isEmpty) {
          await upsertContactCustomFieldValue(
            existingContact.id,
            field.custom_field_id,
            bodyVal
          );
        }
      }
    }

    const { submission, error: subErr } = await insertFormSubmission(
      form.id,
      body,
      contactId
    );
    if (subErr || !submission) {
      return NextResponse.json(
        { error: subErr?.message ?? "Failed to save submission" },
        { status: 500 }
      );
    }

    const successMessage =
      (form.settings as { success_message?: string })?.success_message ??
      "Thank you for your submission!";

    return NextResponse.json({
      success: true,
      message: successMessage,
      submission_id: submission.id,
    });
  } catch (error) {
    console.error("Form submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler);
