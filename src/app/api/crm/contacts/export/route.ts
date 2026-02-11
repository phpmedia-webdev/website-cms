import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getContactsByIds,
  getCrmCustomFields,
  getContactCustomFieldValuesForContactIds,
  type CrmContact,
  type CrmCustomField,
} from "@/lib/supabase/crm";
import { EXPORT_MAX_RECORDS, EXPORT_CONTACT_FIELDS } from "@/lib/crm-export";
import PDFDocument from "pdfkit";

const ALLOWED_CORE_KEYS = new Set(EXPORT_CONTACT_FIELDS.map((f) => f.key));
const CUSTOM_PREFIX = "custom:";

function escapeCsvCell(value: string | null): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build CSV from flat rows (core + custom columns). */
function buildCsv(
  rows: Record<string, string | null>[],
  fields: string[],
  labels: string[]
): string {
  const header = labels.map((l) => escapeCsvCell(l)).join(",");
  const dataRows = rows.map((row) =>
    fields.map((k) => escapeCsvCell(row[k] ?? null)).join(",")
  );
  return [header, ...dataRows].join("\r\n");
}

/** Build PDF from flat rows (core + custom columns). Uses dynamic row height and landscape when many columns. */
function buildPdfBuffer(
  rows: Record<string, string | null>[],
  fields: string[],
  labels: string[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const colCount = fields.length;
    const useLandscape = colCount > 12;
    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      layout: useLandscape ? "landscape" : "portrait",
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 80;
    const colWidth = Math.max(20, (pageWidth - (colCount - 1) * 2) / colCount);
    const fontSize = colCount > 18 ? 6 : 8;
    const minRowHeight = fontSize * 1.4;
    doc.fontSize(fontSize);

    const cellText = (cell: string | null): string =>
      (cell ?? "").toString().trim().slice(0, 80);

    const getRowHeight = (row: (string | null)[]): number => {
      let maxH = minRowHeight;
      for (const cell of row) {
        const text = cellText(cell);
        if (!text) continue;
        const h = doc.heightOfString(text, { width: colWidth - 4 });
        if (h > maxH) maxH = h;
      }
      return maxH;
    };

    let y = 40;
    const drawRow = (row: (string | null)[]) => {
      const rowHeight = getRowHeight(row);
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage({ layout: useLandscape ? "landscape" : "portrait", size: "A4" });
        y = 40;
      }
      let x = 40;
      row.forEach((cell) => {
        const text = cellText(cell);
        doc.text(text, x, y, { width: colWidth - 4, align: "left" });
        x += colWidth;
      });
      y += rowHeight;
    };

    drawRow(labels);
    doc.moveTo(40, y).lineTo(pageWidth + 40, y).stroke();
    y += minRowHeight;

    for (const row of rows) {
      const cells = fields.map((k) => row[k] ?? null);
      drawRow(cells);
    }

    doc.end();
  });
}

/**
 * POST /api/crm/contacts/export
 * Body: { contactIds: string[], format: 'csv' | 'pdf', fields: string[] }
 * Returns file download. Max 10k contacts; fields filtered to allowed list.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      contactIds,
      format,
      fields: requestedFields,
    }: {
      contactIds?: string[];
      format?: string;
      fields?: string[];
    } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds must be a non-empty array" },
        { status: 400 }
      );
    }
    if (contactIds.length > EXPORT_MAX_RECORDS) {
      return NextResponse.json(
        {
          error: `Export is limited to ${EXPORT_MAX_RECORDS} contacts. You have ${contactIds.length}. Narrow filters or select fewer to export.`,
        },
        { status: 400 }
      );
    }
    const fmt = format === "pdf" ? "pdf" : "csv";

    const requested = Array.isArray(requestedFields) && requestedFields.length > 0
      ? (requestedFields as string[])
      : EXPORT_CONTACT_FIELDS.map((f) => f.key);

    const coreKeys = requested.filter((k) => !k.startsWith(CUSTOM_PREFIX));
    const customIds = requested
      .filter((k) => k.startsWith(CUSTOM_PREFIX))
      .map((k) => k.slice(CUSTOM_PREFIX.length));

    const validCoreKeys = coreKeys.filter((k) => ALLOWED_CORE_KEYS.has(k));
    let customDefs: CrmCustomField[] = [];
    let validCustomIds: string[] = [];
    if (customIds.length > 0) {
      customDefs = await getCrmCustomFields();
      const defIds = new Set(customDefs.map((d) => d.id));
      validCustomIds = customIds.filter((id) => defIds.has(id));
    }

    const fieldsOrder =
      requested.length > 0
        ? requested.filter((k) =>
            k.startsWith(CUSTOM_PREFIX)
              ? validCustomIds.includes(k.slice(CUSTOM_PREFIX.length))
              : ALLOWED_CORE_KEYS.has(k)
          )
        : [...EXPORT_CONTACT_FIELDS.map((f) => f.key)];

    if (fieldsOrder.length === 0) {
      return NextResponse.json(
        { error: "At least one valid field is required" },
        { status: 400 }
      );
    }

    const labels = fieldsOrder.map((k) => {
      if (k.startsWith(CUSTOM_PREFIX)) {
        const id = k.slice(CUSTOM_PREFIX.length);
        return customDefs.find((d) => d.id === id)?.label ?? id;
      }
      return EXPORT_CONTACT_FIELDS.find((f) => f.key === k)?.label ?? k;
    });

    const contacts = await getContactsByIds(contactIds);
    let bulkCustomValues: { contact_id: string; custom_field_id: string; value: string | null }[] = [];
    if (validCustomIds.length > 0) {
      bulkCustomValues = await getContactCustomFieldValuesForContactIds(contactIds);
    }

    const valueByContactAndField = new Map<string, string | null>();
    for (const v of bulkCustomValues) {
      valueByContactAndField.set(`${v.contact_id}:${v.custom_field_id}`, v.value);
    }

    const flatRows: Record<string, string | null>[] = contacts.map((c) => {
      const row: Record<string, string | null> = {};
      for (const k of fieldsOrder) {
        if (k.startsWith(CUSTOM_PREFIX)) {
          const id = k.slice(CUSTOM_PREFIX.length);
          row[k] = valueByContactAndField.get(`${c.id}:${id}`) ?? null;
        } else {
          row[k] = (c[k as keyof CrmContact] as string | null) ?? null;
        }
      }
      return row;
    });

    if (fmt === "csv") {
      const csv = buildCsv(flatRows, fieldsOrder, labels);
      const filename = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const pdfBuffer = await buildPdfBuffer(flatRows, fieldsOrder, labels);
    const pdfFilename = `contacts-export-${new Date().toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Error exporting contacts:", error);
    return NextResponse.json(
      { error: "Failed to export contacts" },
      { status: 500 }
    );
  }
}
