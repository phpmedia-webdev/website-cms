/**
 * POST /api/ecommerce/stripe-drift/bulk-import
 * Step 44: Bulk import all Stripe products that are not yet in the app.
 * Creates content + product row for each; sets stripe_product_id and stripe_price_id (recurring).
 * Admin only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { bulkImportStripeProductsNotInApp } from "@/lib/shop/stripe-drift";

export async function POST() {
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

    const schema = getClientSchema();
    const { imported, errors } = await bulkImportStripeProductsNotInApp(schema ?? undefined);

    return NextResponse.json({
      success: true,
      imported,
      errors,
    });
  } catch (error) {
    console.error("POST /api/ecommerce/stripe-drift/bulk-import:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
