/**
 * POST /api/ecommerce/import-orders
 * Step 48: Generic CSV order import with column mapping.
 * Body: { rows: string[][], mapping: Record<string, number> }
 * mapping keys: customer_email, total (required); currency, order_date, status, order_number, line_description, line_amount (optional).
 * Admin only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { importOrdersFromCsvRows } from "@/lib/shop/import-orders-csv";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rows = body.rows;
    const mapping = body.mapping ?? {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows to import" },
        { status: 400 }
      );
    }

    const schema = getClientSchema();
    const result = await importOrdersFromCsvRows(rows, mapping, schema ?? undefined);

    return NextResponse.json({
      created: result.created,
      skipped: result.skipped,
      total: rows.length,
      errors: result.errors.slice(0, 30),
    });
  } catch (err) {
    console.error("Import orders error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
