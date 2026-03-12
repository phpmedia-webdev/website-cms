/**
 * GET /api/members/orders
 * Step 16: List orders for the current member (orders where user_id = current user).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getClientSchema } from "@/lib/supabase/schema";
import { getOrdersByUserId } from "@/lib/shop/orders";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schema = getClientSchema();
    const orders = await getOrdersByUserId(user.id, schema);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/members/orders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
