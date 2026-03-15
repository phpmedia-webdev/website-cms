/**
 * GET /api/ecommerce/invoices — list invoices (admin).
 * POST /api/ecommerce/invoices — create draft invoice (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { listInvoices, createInvoice, type InvoiceStatus } from "@/lib/shop/invoices";

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
    const status = searchParams.get("status") as InvoiceStatus | null;
    const limit = Number(searchParams.get("limit") ?? 100);
    const contact_id = searchParams.get("contact_id") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const schema = getClientSchema();
    const invoices = await listInvoices(
      {
        status: status ?? undefined,
        limit,
        contact_id: contact_id || undefined,
        from: from || undefined,
        to: to || undefined,
      },
      schema ?? undefined
    );

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("GET /api/ecommerce/invoices:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const customer_email = typeof body?.customer_email === "string" ? body.customer_email.trim() : "";
    if (!customer_email) {
      return NextResponse.json(
        { error: "customer_email is required" },
        { status: 400 }
      );
    }

    const schema = getClientSchema();
    const invoice = await createInvoice(
      {
        customer_email,
        contact_id: body.contact_id ?? null,
        due_date: body.due_date ?? null,
        currency: body.currency ?? "USD",
      },
      schema ?? undefined
    );

    if (!invoice) {
      return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("POST /api/ecommerce/invoices:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
