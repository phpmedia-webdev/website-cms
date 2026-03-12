/**
 * GET /api/ecommerce/orders/metrics
 * Step 26: Order counts by status, today, and revenue for dashboard and PWA.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { getOrderMetrics } from "@/lib/shop/orders";

export async function GET() {
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

    const schema = getClientSchema();
    const metrics = await getOrderMetrics(schema ?? undefined);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("GET /api/ecommerce/orders/metrics:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
