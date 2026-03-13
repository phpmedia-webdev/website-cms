/**
 * GET /api/members/subscriptions
 * Step 35: List current member's subscriptions (active and canceled) for /members/subscriptions.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getClientSchema } from "@/lib/supabase/schema";
import { listSubscriptionsForMember } from "@/lib/shop/subscriptions";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schema = getClientSchema();
    const subscriptions = await listSubscriptionsForMember(user.id, schema ?? undefined);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("GET /api/members/subscriptions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
