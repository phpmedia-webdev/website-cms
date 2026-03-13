/**
 * POST /api/ecommerce/woo-sync/csv
 * Step 47: Import WooCommerce customers and/or orders from CSV (preferred routine).
 * Body: { csv: string, import_type: "customers" | "orders" | "all" }
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import {
  syncWooCommerceCustomersFromCsv,
  syncWooCommerceOrdersFromCsv,
} from "@/lib/shop/woo-commerce-sync";

export async function POST(request: NextRequest) {
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
    const csv = typeof body.csv === "string" ? body.csv : "";
    const importType =
      body.import_type === "customers" || body.import_type === "orders" || body.import_type === "all"
        ? body.import_type
        : "all";

    if (!csv.trim()) {
      return NextResponse.json(
        { error: "csv is required (paste or upload WooCommerce export CSV)" },
        { status: 400 }
      );
    }

    const schema = getClientSchema();

    if (importType === "customers") {
      const customers = await syncWooCommerceCustomersFromCsv(csv, schema ?? undefined);
      return NextResponse.json({
        success: true,
        customers: {
          created: customers.created,
          updated: customers.updated,
          errors: customers.errors,
        },
        orders: null,
      });
    }
    if (importType === "orders") {
      const orders = await syncWooCommerceOrdersFromCsv(csv, schema ?? undefined);
      return NextResponse.json({
        success: true,
        customers: null,
        orders: {
          created: orders.created,
          skipped: orders.skipped,
          errors: orders.errors,
        },
      });
    }

    const customers = await syncWooCommerceCustomersFromCsv(csv, schema ?? undefined);
    const orders = await syncWooCommerceOrdersFromCsv(csv, schema ?? undefined);
    return NextResponse.json({
      success: true,
      customers: {
        created: customers.created,
        updated: customers.updated,
        errors: customers.errors,
      },
      orders: {
        created: orders.created,
        skipped: orders.skipped,
        errors: orders.errors,
      },
    });
  } catch (error) {
    console.error("POST /api/ecommerce/woo-sync/csv:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
