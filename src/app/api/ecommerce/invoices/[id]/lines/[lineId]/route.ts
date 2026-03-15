/**
 * PATCH /api/ecommerce/invoices/[id]/lines/[lineId] — update line (draft only). Admin.
 * DELETE /api/ecommerce/invoices/[id]/lines/[lineId] — remove line (draft only). Admin.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { updateInvoiceLine, removeInvoiceLine } from "@/lib/shop/invoices";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
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

    const { lineId } = await params;
    const body = await request.json();
    const schema = getClientSchema();

    const ok = await updateInvoiceLine(
      lineId,
      {
        quantity: body.quantity != null ? Number(body.quantity) : undefined,
        unit_price: body.unit_price != null ? Number(body.unit_price) : undefined,
        line_description: body.line_description,
      },
      schema
    );

    if (!ok) {
      return NextResponse.json(
        { error: "Line not found or invoice not in draft" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/ecommerce/invoices/.../lines/[lineId]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
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

    const { lineId } = await params;
    const schema = getClientSchema();
    const ok = await removeInvoiceLine(lineId, schema);

    if (!ok) {
      return NextResponse.json(
        { error: "Line not found or invoice not in draft" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ecommerce/invoices/.../lines/[lineId]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
