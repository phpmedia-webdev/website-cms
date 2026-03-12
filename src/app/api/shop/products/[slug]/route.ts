/**
 * GET /api/shop/products/[slug]
 * Single product by slug for shop detail. Returns { product, eligible } so the page can show
 * "Not yet available for purchase" or hide add-to-cart when eligible is false.
 * 404 if not found or not visible to viewer.
 */

import { NextResponse } from "next/server";
import { getShopViewer } from "@/lib/shop/viewer";
import { getShopProductBySlugForDisplay } from "@/lib/supabase/products";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug?.trim()) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }
    const { viewer, membershipEnabled } = await getShopViewer();
    const result = await getShopProductBySlugForDisplay(slug.trim(), viewer, membershipEnabled);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ product: result.product, eligible: result.eligible });
  } catch (e) {
    console.warn("GET /api/shop/products/[slug]:", e);
    return NextResponse.json({ error: "Failed to get product" }, { status: 500 });
  }
}
