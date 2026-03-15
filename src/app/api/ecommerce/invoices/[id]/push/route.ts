/**
 * POST /api/ecommerce/invoices/[id]/push — push draft invoice to Stripe (create, finalize, send). Admin.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { pushInvoiceToStripe } from "@/lib/shop/invoices";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const schema = getClientSchema();
    const result = await pushInvoiceToStripe(id, schema);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to push invoice to Stripe" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      stripe_invoice_id: result.stripe_invoice_id,
    });
  } catch (error) {
    console.error("POST /api/ecommerce/invoices/[id]/push:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
