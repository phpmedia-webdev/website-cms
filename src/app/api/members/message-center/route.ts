/**
 * GET /api/members/message-center
 * GPUM scaffold: member-safe Messages & Notifications feed contract.
 * Returns a cursor-ready payload shape (`items`, `nextCursor`, `hasMore`) while
 * currently sourcing rows from `getMemberActivity`.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMemberByUserId } from "@/lib/supabase/members";
import { getMemberActivity, type DashboardActivityItem } from "@/lib/supabase/crm";

function matchesFilter(item: DashboardActivityItem, filter: string): boolean {
  if (!filter || filter === "all") return true;
  if (filter === "notification_timeline") return item.type === "notification_timeline";
  if (filter === "message") return item.type === "message";
  if (filter === "note") return item.type === "note";
  if (filter === "form_submission") return item.type === "form_submission";
  if (filter === "contact_added") return item.type === "contact_added";
  if (filter === "mag_assignment") return item.type === "mag_assignment";
  if (filter === "marketing_list") return item.type === "marketing_list";
  if (filter === "order") return item.type === "order";
  return true;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await getMemberByUserId(user.id);
    if (!member) {
      return NextResponse.json({ items: [], nextCursor: null, hasMore: false });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "80", 10) || 80, 1), 120);
    const filter = (searchParams.get("filter") ?? "all").trim();
    const dateFrom = searchParams.get("date_from")?.trim() || "";
    const dateTo = searchParams.get("date_to")?.trim() || "";

    const activity = await getMemberActivity(member.contact_id, limit);
    let items = activity.filter((i) => matchesFilter(i, filter));
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      if (!Number.isNaN(fromTs)) items = items.filter((i) => new Date(i.at).getTime() >= fromTs);
    }
    if (dateTo) {
      const toTs = new Date(dateTo).getTime();
      if (!Number.isNaN(toTs)) items = items.filter((i) => new Date(i.at).getTime() <= toTs);
    }

    return NextResponse.json({
      items,
      nextCursor: null,
      hasMore: false,
    });
  } catch (error) {
    console.error("GET /api/members/message-center:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

