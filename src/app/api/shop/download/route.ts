/**
 * GET /api/shop/download?token=...
 * Step 25d: Time-limited download redirect. Token encodes orderId, orderItemId, linkIndex, exp.
 * Verifies order is paid/completed, item is downloadable, then redirects to real URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyDownloadToken } from "@/lib/shop/download-token";
import { getOrderById, getOrderItems } from "@/lib/shop/orders";
import { getClientSchema } from "@/lib/supabase/schema";
import { createServerSupabaseClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token?.trim()) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = verifyDownloadToken(token.trim());
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  const schema = getClientSchema();
  const order = await getOrderById(payload.orderId, schema);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "paid" && order.status !== "completed" && order.status !== "processing") {
    return NextResponse.json({ error: "Order not available for download" }, { status: 403 });
  }

  const items = await getOrderItems(payload.orderId, schema);
  const item = items.find((i) => i.id === payload.orderItemId);
  if (!item || !item.downloadable) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }

  const supabase = createServerSupabaseClient();
  const { data: productRow } = await supabase
    .schema(schema)
    .from("product")
    .select("digital_delivery_links")
    .eq("content_id", item.content_id)
    .maybeSingle();

  const rawLinks = (productRow as { digital_delivery_links?: unknown } | null)?.digital_delivery_links;
  const links = Array.isArray(rawLinks)
    ? rawLinks.map((x: unknown) => (x && typeof x === "object" && "url" in x ? { label: String((x as { label?: string }).label ?? ""), url: String((x as { url: string }).url) } : null)).filter(Boolean) as { label: string; url: string }[]
    : [];
  const link = links[payload.linkIndex];
  if (!link?.url?.trim()) {
    return NextResponse.json({ error: "Download link not found" }, { status: 404 });
  }

  return NextResponse.redirect(link.url.trim(), 302);
}
