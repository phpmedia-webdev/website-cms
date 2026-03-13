/**
 * GET /api/ecommerce/export/orders
 * Step 49: Export orders as CSV for accounting (date range, status).
 * Step 50: Other formats (iif, qbo) return 501 Not Implemented stub.
 *
 * Query: from (ISO date), to (ISO date), status, format (csv | iif | qbo), limit.
 * format=csv: returns CSV with Content-Disposition attachment.
 * format=iif|qbo|...: returns 501 with JSON body.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { exportOrdersAsCsv } from "@/lib/shop/export-orders";
import type { OrderStatus } from "@/lib/shop/orders";

const CSV_FORMAT = "csv";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? CSV_FORMAT).toLowerCase();
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const status = (searchParams.get("status") ?? "") as OrderStatus | "";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 10000) : 5000;

    if (format !== CSV_FORMAT) {
      return NextResponse.json(
        {
          error: "Export format not implemented",
          format,
          message: "Only CSV is supported. Use ?format=csv. Other formats (IIF, QBO) are planned.",
        },
        { status: 501 }
      );
    }

    const schema = getClientSchema();
    const result = await exportOrdersAsCsv(
      { from, to, status: status || undefined, limit },
      schema ?? undefined
    );

    const filename = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("GET /api/ecommerce/export/orders:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}
