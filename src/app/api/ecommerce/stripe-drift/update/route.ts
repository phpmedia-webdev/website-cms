/**
 * POST /api/ecommerce/stripe-drift/update
 * Step 43: Update app product from Stripe (title, price) for a given content_id.
 * Admin only.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getStripeClient } from "@/lib/stripe/config";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

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
    const contentId = typeof body.content_id === "string" ? body.content_id.trim() : null;
    if (!contentId) {
      return NextResponse.json(
        { error: "content_id is required" },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured." },
        { status: 503 }
      );
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { data: productRow, error: productErr } = await supabase
      .schema(schema)
      .from("product")
      .select("stripe_product_id")
      .eq("content_id", contentId)
      .maybeSingle();
    if (productErr || !productRow) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    const stripeProductId = (productRow as { stripe_product_id: string | null }).stripe_product_id;
    if (!stripeProductId) {
      return NextResponse.json(
        { error: "Product is not linked to Stripe" },
        { status: 400 }
      );
    }

    const stripeProduct = await stripe.products.retrieve(stripeProductId, {
      expand: ["default_price"],
    }) as Stripe.Product | null;
    if (!stripeProduct || (stripeProduct as { deleted?: boolean }).deleted) {
      return NextResponse.json(
        { error: "Stripe product not found or deleted" },
        { status: 404 }
      );
    }

    const name = stripeProduct.name ?? "";
    const defaultPrice = stripeProduct.default_price as { unit_amount?: number; currency?: string } | null;
    const priceDollars = defaultPrice?.unit_amount != null ? defaultPrice.unit_amount / 100 : 0;
    const currency = (defaultPrice?.currency ?? "usd").toUpperCase();

    const { error: contentUpdateErr } = await supabase
      .schema(schema)
      .from("content")
      .update({
        title: name,
        excerpt: stripeProduct.description?.slice(0, 500) ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contentId);
    if (contentUpdateErr) {
      console.error("Update from Stripe: content update failed", contentUpdateErr);
      return NextResponse.json(
        { error: "Failed to update content" },
        { status: 500 }
      );
    }

    const { error: productUpdateErr } = await supabase
      .schema(schema)
      .from("product")
      .update({
        price: priceDollars,
        currency,
        updated_at: new Date().toISOString(),
      })
      .eq("content_id", contentId);
    if (productUpdateErr) {
      console.error("Update from Stripe: product update failed", productUpdateErr);
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content_id: contentId,
      title: name,
      price: priceDollars,
      currency,
    });
  } catch (error) {
    console.error("POST /api/ecommerce/stripe-drift/update:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
