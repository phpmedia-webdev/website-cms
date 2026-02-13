import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createContact, createNote } from "@/lib/supabase/crm";
import { CRM_STATUS_SLUG_NEW } from "@/lib/supabase/settings";

/** Core contact fields we allow from import (mapping by column index). */
const IMPORTABLE_FIELDS = [
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
  "source",
] as const;

type ImportableField = (typeof IMPORTABLE_FIELDS)[number];

function trim(s: string): string {
  return s?.trim() ?? "";
}

/**
 * POST /api/crm/contacts/import
 * Body: { rows: string[][], mapping: Record<string, number> }
 * mapping keys are ImportableField; values are column index in each row.
 * Creates one contact per row; returns { created, failed, errors }.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { rows = [], mapping = {} } = body as {
      rows: string[][];
      mapping: Record<string, number>;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows to import" },
        { status: 400 }
      );
    }

    let created = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const payload: Record<string, string | null> = {
        status: CRM_STATUS_SLUG_NEW,
      };

      for (const field of IMPORTABLE_FIELDS) {
        const colIndex = mapping[field];
        if (colIndex == null || colIndex < 0) continue;
        const value = trim(String(row[colIndex] ?? ""));
        payload[field] = value || null;
      }

      const { contact: newContact, error } = await createContact(payload);
      if (error) {
        errors.push({ row: i + 1, message: error.message });
      } else {
        created++;
        if (newContact?.id) {
          await createNote(newContact.id, "Imported", user.id, "import");
        }
      }
    }

    return NextResponse.json({
      created,
      failed: errors.length,
      total: rows.length,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    console.error("Contacts import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
