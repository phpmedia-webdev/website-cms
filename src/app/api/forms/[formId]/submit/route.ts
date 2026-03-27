import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/middleware";
import { getClientIdentifier, checkFormSubmitRateLimit } from "@/lib/api/rate-limit";
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
import { insertContactNotificationsTimeline } from "@/lib/supabase/contact-notifications-timeline";
import { CRM_STATUS_SLUG_NEW, getCrmContactStatuses } from "@/lib/supabase/settings";
import { notifyOnFormSubmitted } from "@/lib/notifications";
import { getFormProtectionSettings } from "@/lib/forms/form-protection-settings";
import { verifyRecaptchaToken } from "@/lib/forms/recaptcha";

/** Honeypot field name: if filled, treat as bot and do not persist. */
const HONEYPOT_FIELD = "website";
/** Minimum time on page before submit (ms). Reject if submit is faster. */
const MIN_FORM_TIME_MS = 5000;

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
  "shipping_address",
  "shipping_city",
  "shipping_state",
  "shipping_postal_code",
  "shipping_country",
] as const;

const CORE_LABELS: Record<(typeof CORE_KEYS)[number], string> = {
  email: "Email",
  phone: "Phone",
  first_name: "First name",
  last_name: "Last name",
  full_name: "Full name",
  company: "Company",
  address: "Address",
  city: "City",
  state: "State",
  postal_code: "Postal code",
  country: "Country",
  shipping_address: "Shipping address",
  shipping_city: "Shipping city",
  shipping_state: "Shipping state",
  shipping_postal_code: "Shipping postal code",
  shipping_country: "Shipping country",
};

function getSubmittedMessage(
  body: Record<string, unknown>,
  formFields: FormFieldAssignment[]
): string | null {
  const hasMessageField = formFields.some(
    (f) => f.field_source === "core" && f.core_field_key === "message"
  );
  if (!hasMessageField) return null;

  const msg =
    body.message != null && body.message !== ""
      ? String(body.message)
      : body.Message != null && body.Message !== ""
        ? String(body.Message)
        : null;
  if (!msg) return null;
  const trimmed = msg.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
    const identifier = getClientIdentifier(request);
    const formSubmitLimit = checkFormSubmitRateLimit(identifier, formId);
    if (formSubmitLimit && !formSubmitLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many submissions. Please try again later.",
          message: "Too many submissions. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((formSubmitLimit.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

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

    // Honeypot: if filled, pretend success and do not persist
    const honeypotValue = body[HONEYPOT_FIELD];
    if (honeypotValue != null && String(honeypotValue).trim() !== "") {
      const msg =
        (form.settings as { success_message?: string })?.success_message ??
        "Thank you for your submission!";
      return NextResponse.json({ success: true, message: msg });
    }

    // Time-on-page: reject if submitted too fast
    const loadedAt = body._form_loaded_at;
    if (loadedAt != null && typeof loadedAt === "string") {
      const loadedTime = new Date(loadedAt).getTime();
      if (!Number.isNaN(loadedTime) && Date.now() - loadedTime < MIN_FORM_TIME_MS) {
        return NextResponse.json(
          { error: "Please wait a moment before submitting." },
          { status: 400 }
        );
      }
    }

    const formProtection = await getFormProtectionSettings();
    if (formProtection.recaptchaEnabled && formProtection.recaptchaSecretKey) {
      const token =
        body.captcha_token ?? body["g-recaptcha-response"];
      const tokenStr = token != null ? String(token).trim() : "";
      if (!tokenStr) {
        return NextResponse.json(
          { error: "Captcha verification required. Please complete the challenge." },
          { status: 400 }
        );
      }
      const forwarded = request.headers.get("x-forwarded-for");
      const remoteip = forwarded ? forwarded.split(",")[0]?.trim() : undefined;
      const verify = await verifyRecaptchaToken(
        formProtection.recaptchaSecretKey,
        tokenStr,
        remoteip
      );
      if (!verify.success) {
        return NextResponse.json(
          { error: "Captcha verification failed. Please try again." },
          { status: 400 }
        );
      }
    }

    // Strip protection-only fields so they are not stored in submission payload
    const { [HONEYPOT_FIELD]: _h, _form_loaded_at: _t, captcha_token: _c, ...cleanBody } = body;
    const bodyForSubmission = cleanBody as Record<string, unknown>;
    if ("g-recaptcha-response" in bodyForSubmission) {
      delete (bodyForSubmission as Record<string, unknown>)["g-recaptcha-response"];
    }

    const formFields = await getFormFields(form.id);
    for (const field of formFields) {
      if (!field.required) continue;
      const val = getPayloadValue(bodyForSubmission, field);
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

    const statuses = await getCrmContactStatuses();
    const defaultStatus =
      statuses.find((s) => s.slug === CRM_STATUS_SLUG_NEW)?.slug ??
      statuses[0]?.slug ??
      CRM_STATUS_SLUG_NEW;
    const submittedMessage = getSubmittedMessage(bodyForSubmission, formFields);
    const submittedEmail =
      bodyForSubmission.email != null && bodyForSubmission.email !== ""
        ? String(bodyForSubmission.email).trim()
        : null;
    const existingContact = await getContactByEmail(submittedEmail);

    let contactId: string | null = null;
    let contactRecord:
      | {
          id: string;
          email: string | null;
          phone: string | null;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          company: string | null;
          status: string | null;
        }
      | null = null;
    const changedLines: string[] = [];

    if (existingContact) {
      contactId = existingContact.id;
      const updatePayload: Record<string, unknown> = {};
      for (const key of CORE_KEYS) {
        const v = bodyForSubmission[key];
        if (v == null || v === "") continue;
        const nextVal = String(v).trim();
        const prevVal = String((existingContact as unknown as Record<string, unknown>)[key] ?? "").trim();
        if (nextVal !== prevVal) {
          updatePayload[key] = nextVal;
          changedLines.push(`${CORE_LABELS[key]}: ${prevVal || "—"} -> ${nextVal || "—"}`);
        }
      }

      if (Object.keys(updatePayload).length > 0) {
        const { contact: updated, error: updateErr } = await updateContact(
          existingContact.id,
          updatePayload as Parameters<typeof updateContact>[1]
        );
        if (updateErr || !updated) {
          return NextResponse.json(
            { error: updateErr?.message ?? "Failed to update contact" },
            { status: 500 }
          );
        }
        contactRecord = {
          id: updated.id,
          email: updated.email ?? null,
          phone: updated.phone ?? null,
          first_name: updated.first_name ?? null,
          last_name: updated.last_name ?? null,
          full_name: updated.full_name ?? null,
          company: updated.company ?? null,
          status: updated.status ?? null,
        };
      } else {
        contactRecord = {
          id: existingContact.id,
          email: existingContact.email ?? null,
          phone: existingContact.phone ?? null,
          first_name: existingContact.first_name ?? null,
          last_name: existingContact.last_name ?? null,
          full_name: existingContact.full_name ?? null,
          company: existingContact.company ?? null,
          status: existingContact.status ?? null,
        };
      }
    } else {
      const corePayload: Record<string, unknown> = {
        status: defaultStatus,
        source: "form",
        form_id: form.id,
      };
      for (const key of CORE_KEYS) {
        const v = bodyForSubmission[key];
        if (v != null && v !== "") corePayload[key] = String(v);
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
      contactRecord = {
        id: created.id,
        email: created.email ?? null,
        phone: created.phone ?? null,
        first_name: created.first_name ?? null,
        last_name: created.last_name ?? null,
        full_name: created.full_name ?? null,
        company: created.company ?? null,
        status: created.status ?? null,
      };
    }

    if (!contactId) {
      return NextResponse.json({ error: "Missing contact id" }, { status: 500 });
    }

    const existingCustomValues = new Map<string, string>();
    if (existingContact) {
      const customRows = await getContactCustomFields(contactId);
      for (const row of customRows) {
        existingCustomValues.set(row.custom_field_id, String(row.value ?? ""));
      }
    }
    for (const field of formFields) {
      if (field.field_source !== "custom" || !field.custom_field_id) continue;
      const val = getPayloadValue(bodyForSubmission, field);
      if (val === null) continue;
      const prevVal = (existingCustomValues.get(field.custom_field_id) ?? "").trim();
      const nextVal = String(val).trim();
      if (nextVal === prevVal) continue;
      await upsertContactCustomFieldValue(contactId, field.custom_field_id, nextVal);
      if (existingContact) {
        changedLines.push(`Custom ${field.custom_field_id}: ${prevVal || "—"} -> ${nextVal || "—"}`);
      }
    }

    if (form.auto_assign_mag_ids?.length) {
      for (const magId of form.auto_assign_mag_ids) {
        await addContactToMag(contactId, magId, "form");
      }
    }

    const { submission, error: subErr } = await insertFormSubmission(
      form.id,
      bodyForSubmission,
      contactId
    );
    if (subErr || !submission) {
      return NextResponse.json(
        { error: subErr?.message ?? "Failed to save submission" },
        { status: 500 }
      );
    }

    if (contactId && contactRecord) {
      const name =
        contactRecord.full_name?.trim() ||
        [contactRecord.first_name, contactRecord.last_name]
          .filter((v): v is string => !!v && v.trim().length > 0)
          .join(" ")
          .trim() ||
        contactRecord.email ||
        "Unknown contact";

      const summaryLines = [
        `Name: ${name}`,
        contactRecord.email ? `Email: ${contactRecord.email}` : null,
        contactRecord.phone ? `Phone: ${contactRecord.phone}` : null,
        contactRecord.company ? `Company: ${contactRecord.company}` : null,
      ].filter((line): line is string => !!line);
      const changeBlock = existingContact
        ? changedLines.length > 0
          ? `Changes:\n- ${changedLines.join("\n- ")}`
          : "Changes: No mapped field changes."
        : "Changes: New contact created.";
      const messageBlock = submittedMessage ? `Message:\n${submittedMessage}` : "Message:\n—";

      await insertContactNotificationsTimeline({
        contact_id: contactId,
        kind: "form_submission",
        visibility: "admin_only",
        title: existingContact ? `Form update: ${form.name}` : `Form submission: ${form.name}`,
        body: `${summaryLines.join("\n")}\n\n${changeBlock}\n\n${messageBlock}`,
        metadata: {
          form_id: form.id,
          form_name: form.name,
          submission_id: submission.id,
          contact_id: contactId,
          extracted: true,
          operation: existingContact ? "contact_updated" : "contact_created",
          changed_fields: changedLines,
        },
        subject_type: "form_submission",
        subject_id: submission.id,
        source_event: "form_submitted",
      });
    }

    const successMessage =
      (form.settings as { success_message?: string })?.success_message ??
      "Thank you for your submission!";

    // Fire-and-forget: email and/or PWA push per Admin → Settings → Notifications
    void notifyOnFormSubmitted({
      formId: form.id,
      formName: form.name,
      submissionId: submission.id,
      contactId: contactId ?? undefined,
    }).catch((err) => {
      console.error("notifyOnFormSubmitted failed:", err);
    });

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
