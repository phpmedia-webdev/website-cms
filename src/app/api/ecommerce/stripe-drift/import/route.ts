/**
 * POST /api/ecommerce/stripe-drift/import
 * Step 43/44: Import a single Stripe product into the app (create content + product, set stripe_product_id).
 * Admin only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { importStripeProductIntoApp } from "@/lib/shop/stripe-drift";

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
    const stripeProductId =
      typeof body.stripe_product_id === "string" ? body.stripe_product_id.trim() : null;
    if (!stripeProductId) {
      return NextResponse.json(
        { error: "stripe_product_id is required" },
        { status: 400 }
      );
    }

    const schema = getClientSchema();
    const result = await importStripeProductIntoApp(stripeProductId, schema ?? undefined);

    if (!result.success) {
      const status =
        result.error === "Stripe product not found or deleted"
          ? 404
          : result.error === "Stripe is not configured."
            ? 503
            : result.error === "App product already linked to this Stripe product"
              ? 400
              : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      content_id: result.content_id,
      slug: result.slug,
      title: result.title,
    });
  } catch (error) {
    console.error("POST /api/ecommerce/stripe-drift/import:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
