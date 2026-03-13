/**
 * POST /api/ecommerce/stripe-sync-orders
 * Step 46: Sync Stripe paid invoices to app orders.
 * For each paid invoice not already in app: ensure customer synced to CRM, create order + order_items.
 * Body (optional): { created_gte?: number, created_lte?: number, customer_id?: string }
 * - created_gte / created_lte: Unix timestamp (seconds). Filter invoices by creation date.
 * - customer_id: Stripe customer ID. Filter to that customer only.
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { syncStripeInvoiceOrdersToApp } from "@/lib/shop/stripe-orders-sync";

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

    let options: { createdGte?: number; createdLte?: number; customerId?: string } | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      if (body && typeof body === "object") {
        const createdGte = body.created_gte;
        const createdLte = body.created_lte;
        const customerId = typeof body.customer_id === "string" ? body.customer_id.trim() || undefined : undefined;
        if (createdGte != null || createdLte != null || customerId) {
          options = {};
          if (typeof createdGte === "number" && createdGte > 0) options.createdGte = createdGte;
          if (typeof createdLte === "number" && createdLte > 0) options.createdLte = createdLte;
          if (customerId) options.customerId = customerId;
        }
      }
    } catch {
      // ignore body parse
    }

    const schema = getClientSchema();
    const result = await syncStripeInvoiceOrdersToApp(options, schema ?? undefined);

    if (!result.ok && result.error) {
      return NextResponse.json(
        {
          error: result.error,
          created: result.created,
          skipped: result.skipped,
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error("POST /api/ecommerce/stripe-sync-orders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
