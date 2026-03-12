/**
 * GET /api/ecommerce/orders
 * Step 16: List orders for admin. Query: status, search (email or order id).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { listOrders } from "@/lib/shop/orders";
import type { OrderStatus } from "@/lib/shop/orders";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "") as OrderStatus | "" | "needs_attention";
    const search = searchParams.get("search") ?? "";
    const limit = Number(searchParams.get("limit") ?? 100);

    const schema = getClientSchema();
    const orders = await listOrders(
      { status: status || undefined, search: search || undefined, limit },
      schema ?? undefined
    );

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/ecommerce/orders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
