import { NextResponse } from "next/server";
import {
  getContactByEmail,
  createContact,
  updateContact,
  insertFormSubmission,
  getFormByIdOrSlug,
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

/**
 * Anychat webhook contact schema (flat):
 * guid, name, email, phone, clean_phone, zip_code, coutry, city, state, address,
 * company, lang, timezone, source, source_id, assigned_to, created_at, updated_at, image
 */
const ANYCHAT_TO_CRM: Record<string, string> = {
  zip_code: "postal_code",
  coutry: "country", // Anychat typo in field name
};

/** Normalize Anychat payload (flat or nested) to our CRM field names. */
function normalizeWebhookPayload(body: Record<string, unknown>): Record<string, unknown> {
  const contact =
    (body.contact as Record<string, unknown>) ??
    (body.data as Record<string, unknown>)?.contact ??
    (body.data as Record<string, unknown>);
  const base = (contact ?? body) as Record<string, unknown>;

  const out: Record<string, unknown> = {};

  for (const key of CORE_KEYS) {
    const v = base[key] ?? body[key];
    if (v != null && v !== "") out[key] = String(v);
  }

  // Anychat flat schema: zip_code → postal_code, coutry → country
  const zip = base.zip_code ?? body.zip_code;
  if (zip != null && zip !== "" && !out.postal_code) out.postal_code = String(zip);
  const country = base.coutry ?? base.country ?? body.coutry ?? body.country;
  if (country != null && country !== "" && !out.country) out.country = String(country);

  // phone: use clean_phone if phone is empty
  const phone = base.phone ?? body.phone;
  const cleanPhone = base.clean_phone ?? body.clean_phone;
  if (!out.phone && (phone != null && phone !== "")) out.phone = String(phone);
  if (!out.phone && (cleanPhone != null && cleanPhone !== "")) out.phone = String(cleanPhone);

  // name → first_name / last_name
  const name = (base.name ?? body.name) as string | undefined;
  if (name && !out.first_name && !out.last_name) {
    const parts = name.trim().split(/\s+/);
    out.first_name = parts[0] ?? "";
    out.last_name = parts.slice(1).join(" ") ?? "";
    out.full_name = name.trim();
  }

  // Pass through Anychat fields for submission payload (guid, lang, timezone, source, etc.)
  for (const [k, v] of Object.entries(body)) {
    if (CORE_KEYS.includes(k as (typeof CORE_KEYS)[number])) continue;
    if (ANYCHAT_TO_CRM[k]) continue;
    if (v != null && v !== "" && (typeof v === "string" || typeof v === "number")) out[k] = v;
  }

  return out;
}

function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.ANYCHAT_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured: allow (caller should set in production)

  const headerSecret =
    request.headers.get("x-anychat-webhook-secret") ??
    request.headers.get("x-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return headerSecret === secret;
}

/**
 * POST /api/webhooks/anychat
 * Receives Anychat webhook events (e.g. form submitted, contact created).
 * Creates or updates CRM contact and optionally records a form submission (form slug "anychat").
 *
 * Configure in Anychat: Settings → API settings → Webhook → add endpoint:
 *   https://your-domain.com/api/webhooks/anychat
 * Optional: set ANYCHAT_WEBHOOK_SECRET and send it in header X-Anychat-Webhook-Secret (or Authorization: Bearer <secret>).
 */
export async function POST(request: Request) {
  try {
    if (!verifyWebhookSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;

    const payload = normalizeWebhookPayload(body);
    const email =
      payload.email != null && payload.email !== ""
        ? String(payload.email)
        : null;

    if (!email) {
      return NextResponse.json(
        { error: "Payload must include contact email" },
        { status: 400 }
      );
    }

    const anychatGuid =
      (body.guid != null && String(body.guid).trim() !== "") ? String(body.guid) : null;

    const statuses = await getCrmContactStatuses();
    const defaultStatus = statuses[0]?.slug ?? "new";
    const existingContact = await getContactByEmail(email);
    let contactId: string | null = null;

    if (!existingContact) {
      const corePayload: Record<string, unknown> = {
        status: defaultStatus,
        source: "anychat",
        email: payload.email,
        first_name: payload.first_name ?? null,
        last_name: payload.last_name ?? null,
        full_name: payload.full_name ?? null,
        phone: payload.phone ?? null,
        company: payload.company ?? null,
        address: payload.address ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        postal_code: payload.postal_code ?? null,
        country: payload.country ?? null,
        message: payload.message ?? null,
        external_crm_id: anychatGuid,
      };
      const { contact: created, error: createErr } = await createContact(
        corePayload as Parameters<typeof createContact>[0]
      );
      if (createErr || !created) {
        console.error("Anychat webhook createContact error:", createErr);
        return NextResponse.json(
          { error: createErr?.message ?? "Failed to create contact" },
          { status: 500 }
        );
      }
      contactId = created.id;
    } else {
      contactId = existingContact.id;
      const updatePayload: Record<string, unknown> = {};
      const messageVal = payload.message ? String(payload.message) : null;
      if (messageVal) {
        const existingMessage = (existingContact.message ?? "").trim();
        updatePayload.message = existingMessage
          ? `${existingMessage}\n\n${messageVal}`
          : messageVal;
      }
      if (anychatGuid && !existingContact.external_crm_id) {
        updatePayload.external_crm_id = anychatGuid;
      }
      for (const key of CORE_KEYS) {
        if (key === "message" || key === "email") continue;
        const v = payload[key];
        if (v == null || v === "") continue;
        const existing = (existingContact as unknown as Record<string, unknown>)[key];
        const empty =
          existing == null || String(existing).trim() === "";
        if (empty) (updatePayload as unknown as Record<string, unknown>)[key] = String(v);
      }
      if (Object.keys(updatePayload).length > 0) {
        const { error: updateErr } = await updateContact(
          existingContact.id,
          updatePayload as Parameters<typeof updateContact>[1]
        );
        if (updateErr) {
          console.error("Anychat webhook updateContact error:", updateErr);
        }
      }
    }

    // If an "anychat" form exists in the registry, record this as a submission
    const anychatForm = await getFormByIdOrSlug("anychat");
    if (anychatForm && contactId) {
      const { error: subErr } = await insertFormSubmission(
        anychatForm.id,
        { ...payload, _source: "anychat", _webhook: body },
        contactId
      );
      if (subErr) {
        console.error("Anychat webhook insertFormSubmission error:", subErr);
      }
    }

    return NextResponse.json({
      success: true,
      contact_id: contactId,
      event: body.event ?? "unknown",
    });
  } catch (error) {
    console.error("Anychat webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
