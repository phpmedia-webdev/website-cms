/**
 * GET /api/members/orders/[id]
 * Step 16: Order detail for the current member. Returns 404 if order does not belong to user.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getClientSchema } from "@/lib/supabase/schema";
import { getOrderById, getOrderItems } from "@/lib/shop/orders";
import { getOrderDownloadLinks } from "@/lib/shop/order-download-links";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const schema = getClientSchema();
    const order = await getOrderById(id, schema);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = await getOrderItems(id, schema);
    const downloadLinks =
      order.status === "paid" || order.status === "completed" || order.status === "processing"
        ? await getOrderDownloadLinks(id, schema)
        : [];
    return NextResponse.json({ order, items, download_links: downloadLinks });
  } catch (error) {
    console.error("GET /api/members/orders/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
