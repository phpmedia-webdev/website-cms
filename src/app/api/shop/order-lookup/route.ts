/**
 * GET /api/shop/order-lookup?email=...&order_id=...
 * Step 24: Guest order lookup. Returns order + items only if customer_email matches (case-insensitive).
 * No auth required; used by guests to view order status via link in confirmation email.
 */

import { NextResponse } from "next/server";
import { getClientSchema } from "@/lib/supabase/schema";
import { getOrderById, getOrderItems } from "@/lib/shop/orders";
import { getOrderDownloadLinks } from "@/lib/shop/order-download-links";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim();
    const orderId = searchParams.get("order_id")?.trim();

    if (!email || !orderId) {
      return NextResponse.json(
        { error: "Email and order ID are required" },
        { status: 400 }
      );
    }

    const schema = getClientSchema();
    const order = await getOrderById(orderId, schema);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.customer_email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = await getOrderItems(orderId, schema);
    const downloadLinks =
      order.status === "paid" || order.status === "completed" || order.status === "processing"
        ? await getOrderDownloadLinks(orderId, schema)
        : [];
    return NextResponse.json({ order, items, download_links: downloadLinks });
  } catch (error) {
    console.error("GET /api/shop/order-lookup:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
