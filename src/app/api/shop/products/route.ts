/**
 * GET /api/shop/products
 * List products eligible for shop and visible to current viewer.
 * Eligibility: published + stripe_product_id set + available_for_purchase.
 * Visibility: access_level + product.visibility_mag_ids (membership).
 */

import { NextResponse } from "next/server";
import { getShopViewer } from "@/lib/shop/viewer";
import { getShopProductList } from "@/lib/supabase/products";

export async function GET() {
  try {
    const { viewer, membershipEnabled } = await getShopViewer();
    const products = await getShopProductList(viewer, membershipEnabled);
    return NextResponse.json(products);
  } catch (e) {
    console.warn("GET /api/shop/products:", e);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}
