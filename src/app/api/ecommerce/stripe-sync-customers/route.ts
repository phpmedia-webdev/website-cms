/**
 * POST /api/ecommerce/stripe-sync-customers
 * Step 45: Sync Stripe customers to CRM contacts.
 * For each Stripe customer: find or create contact by external_stripe_id or email;
 * set external_stripe_id; update name/address from Stripe.
 * Admin only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { syncStripeCustomersToCrm } from "@/lib/shop/stripe-customers-sync";

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

    const result = await syncStripeCustomersToCrm();
    if (!result.ok && result.error) {
      return NextResponse.json(
        { error: result.error, created: result.created, updated: result.updated, errors: result.errors },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error) {
    console.error("POST /api/ecommerce/stripe-sync-customers:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
