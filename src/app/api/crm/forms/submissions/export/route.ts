import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getFormSubmissionsList,
  getFormByIdOrSlug,
  getFormFields,
  getCrmCustomFields,
  CORE_FORM_FIELDS,
  type FormFieldAssignment,
} from "@/lib/supabase/crm";
import { EXPORT_MAX_RECORDS } from "@/lib/crm-export";

function escapeCsvCell(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseDateRange(
  preset: string | null,
  dateFrom: string | null,
  dateTo: string | null
): { from: string | null; to: string | null } {
  if (preset === "all") return { from: null, to: null };
  const now = new Date();
  if (preset === "24h") {
    const from = new Date(now);
    from.setHours(from.getHours() - 24);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (preset === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (preset === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (preset === "custom" && dateFrom?.trim() && dateTo?.trim()) {
    return { from: new Date(dateFrom).toISOString(), to: new Date(dateTo).toISOString() };
  }
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString(), to: now.toISOString() };
}

/**
 * POST /api/crm/forms/submissions/export
 * Body: { formId: string, preset?: string, dateFrom?: string, dateTo?: string, fields: string[] }
 * Returns CSV file. Uses current filter (form + date range). Max EXPORT_MAX_RECORDS.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      formId,
      preset = "30d",
      dateFrom,
      dateTo,
      fields,
    }: {
      formId?: string;
      preset?: string;
      dateFrom?: string;
      dateTo?: string;
      fields?: string[];
    } = body;

    if (!formId || typeof formId !== "string" || !formId.trim()) {
      return NextResponse.json(
        { error: "formId is required" },
        { status: 400 }
      );
    }

    const form = await getFormByIdOrSlug(formId.trim());
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const requestedFields = Array.isArray(fields) && fields.length > 0
      ? fields
      : ["submitted_at", "contact_id"];

    const { from, to } = parseDateRange(
      preset?.trim() ?? "30d",
      dateFrom?.trim() || null,
      dateTo?.trim() || null
    );

    const { submissions, total } = await getFormSubmissionsList({
      formId: form.id,
      dateFrom: from,
      dateTo: to,
      limit: EXPORT_MAX_RECORDS,
      offset: 0,
    });

    if (total > EXPORT_MAX_RECORDS) {
      return NextResponse.json(
        {
          error: `Export is limited to ${EXPORT_MAX_RECORDS} submissions. Your filter returned ${total}. Narrow the date range and try again.`,
        },
        { status: 400 }
      );
    }

    const [assignments, customFields] = await Promise.all([
      getFormFields(form.id),
      getCrmCustomFields(),
    ]);
    const customById = new Map(customFields.map((c) => [c.id, c.label]));
    const keyToLabel = new Map<string, string>([
      ["submitted_at", "Submitted"],
      ["contact_id", "Contact ID"],
    ]);
    for (const a of assignments as FormFieldAssignment[]) {
      if (a.field_source === "core" && a.core_field_key) {
        const core = CORE_FORM_FIELDS.find((f) => f.key === a.core_field_key);
        keyToLabel.set(a.core_field_key, core?.label ?? a.core_field_key);
      } else if (a.field_source === "custom" && a.custom_field_id) {
        keyToLabel.set(
          `custom_${a.custom_field_id}`,
          customById.get(a.custom_field_id) ?? `Custom ${a.custom_field_id}`
        );
      }
    }
    const labels = requestedFields.map((k) => keyToLabel.get(k) ?? k);

    const header = labels.map((l) => escapeCsvCell(l)).join(",");
    const dataRows = submissions.map((s) =>
      requestedFields.map((key) => {
        if (key === "submitted_at") return escapeCsvCell(s.submitted_at ?? null);
        if (key === "contact_id") return escapeCsvCell(s.contact_id ?? null);
        const val = s.payload?.[key];
        return escapeCsvCell(val != null ? String(val) : null);
      }).join(",")
    );
    const csv = [header, ...dataRows].join("\r\n");

    const safeName = form.name.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40);
    const filename = `${safeName}-submissions-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Form submissions export error:", error);
    return NextResponse.json(
      { error: "Failed to export submissions" },
      { status: 500 }
    );
  }
}
