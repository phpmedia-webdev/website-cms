/**
 * POST /api/ecommerce/products/[id]/link-stripe
 * Step 44: Link existing app product to existing Stripe product (and optional Price for subscriptions).
 * Saves stripe_product_id and optionally stripe_price_id without creating anything in Stripe.
 * [id] = content_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getStripeClient } from "@/lib/stripe/config";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

export async function POST(
  request: NextRequest,
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

    const { id: contentId } = await params;
    if (!contentId) {
      return NextResponse.json({ error: "Product content id required" }, { status: 400 });
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
    const stripePriceId =
      typeof body.stripe_price_id === "string" ? body.stripe_price_id.trim() || null : null;

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    }

    const stripeProduct = await stripe.products.retrieve(stripeProductId);
    if (!stripeProduct || (stripeProduct as { deleted?: boolean }).deleted) {
      return NextResponse.json(
        { error: "Stripe product not found or deleted" },
        { status: 404 }
      );
    }

    if (stripePriceId) {
      const price = await stripe.prices.retrieve(stripePriceId);
      const priceProductId =
        typeof price.product === "string" ? price.product : (price.product as { id: string })?.id;
      if (priceProductId !== stripeProductId) {
        return NextResponse.json(
          { error: "Stripe Price does not belong to this Stripe Product" },
          { status: 400 }
        );
      }
    }

    const schema = getClientSchema();
    const supabase = createServerSupabaseClient();
    const { data: productRow } = await supabase
      .schema(schema ?? "")
      .from("product")
      .select("content_id")
      .eq("content_id", contentId)
      .maybeSingle();
    if (!productRow) {
      return NextResponse.json({ error: "Product not found for this content" }, { status: 404 });
    }

    const update: { stripe_product_id: string; stripe_price_id: string | null } = {
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    };
    const { error: updateError } = await supabase
      .schema(schema ?? "")
      .from("product")
      .update(update)
      .eq("content_id", contentId);
    if (updateError) {
      console.error("link-stripe update:", updateError);
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/ecommerce/products/[id]/link-stripe:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
