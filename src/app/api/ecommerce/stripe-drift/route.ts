/**
 * GET /api/ecommerce/stripe-drift
 * Step 43: Stripe ↔ app product drift report. Compare Stripe Products to app products;
 * returns inStripeNotInApp, inAppNotInStripe, differing (name/price). Admin only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getStripeDriftReport } from "@/lib/shop/stripe-drift";

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
    const report = await getStripeDriftReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error("GET /api/ecommerce/stripe-drift:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
