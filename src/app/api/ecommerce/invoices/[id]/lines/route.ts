/**
 * POST /api/ecommerce/invoices/[id]/lines — add line to draft invoice (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { addInvoiceLine } from "@/lib/shop/invoices";

export async function POST(
  request: Request,
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

    const { id: invoiceId } = await params;
    const body = await request.json();
    const content_id = body?.content_id;
    if (!content_id || typeof content_id !== "string") {
      return NextResponse.json(
        { error: "content_id (product) is required" },
        { status: 400 }
      );
    }
    const quantity = Number(body?.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 }
      );
    }
    const unit_price = Number(body?.unit_price);
    if (!Number.isFinite(unit_price) || unit_price < 0) {
      return NextResponse.json(
        { error: "unit_price must be a non-negative number" },
        { status: 400 }
      );
    }

    const schema = getClientSchema();
    const line = await addInvoiceLine(
      {
        invoice_id: invoiceId,
        content_id,
        quantity,
        unit_price,
        line_description: body?.line_description ?? null,
      },
      schema
    );

    if (!line) {
      return NextResponse.json(
        { error: "Invoice not found or not in draft; could not add line" },
        { status: 400 }
      );
    }

    return NextResponse.json({ line });
  } catch (error) {
    console.error("POST /api/ecommerce/invoices/[id]/lines:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
