/**
 * GET /api/ecommerce/subscriptions
 * Step 34: List subscriptions for admin (customer, product, status, current period end).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { listSubscriptions } from "@/lib/shop/subscriptions";

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
    const subscriptions = await listSubscriptions(schema ?? undefined);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("GET /api/ecommerce/subscriptions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
