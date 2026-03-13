/**
 * GET /api/members/activity
 * Steps 38–39: Activity stream for current member (notes, messages, form submissions, orders, etc.).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMemberByUserId } from "@/lib/supabase/members";
import { getMemberActivity } from "@/lib/supabase/crm";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await getMemberByUserId(user.id);
    if (!member) {
      return NextResponse.json({ activity: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 80, 100);
    const activity = await getMemberActivity(member.contact_id, limit);
    return NextResponse.json({ activity });
  } catch (error) {
    console.error("GET /api/members/activity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
