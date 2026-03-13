/**
 * GET /api/ecommerce/export/formats
 * Step 50: List available and planned export formats for accounting.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";

export async function GET() {
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

    return NextResponse.json({
      available: ["csv"],
      planned: ["iif", "qbo"],
      description: {
        csv: "Generic CSV for QuickBooks, Xero, FreshBooks, or manual import",
        iif: "Intuit Interchange Format (future)",
        qbo: "QuickBooks Online format (future)",
      },
    });
  } catch (err) {
    console.error("GET /api/ecommerce/export/formats:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed" },
      { status: 500 }
    );
  }
}
