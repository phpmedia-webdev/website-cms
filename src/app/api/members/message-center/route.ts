/**
 * GET /api/members/message-center
 * GPUM merged stream: `items` (legacy activity) + `streamItems` (normalized union + conversation heads).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMemberByUserId } from "@/lib/supabase/members";
import type { DashboardActivityItem } from "@/lib/supabase/crm";
import { getMemberMessageCenterMergedStream } from "@/lib/message-center/gpum-member-stream";
import {
  filterMemberStreamItems,
  type MemberMessageCenterFilter,
} from "@/lib/message-center/gpum-message-center";
import { paginateMemberStreamItems } from "@/lib/message-center/gpum-message-center-pagination";
import {
  messageCenterItemInDateRange,
  normalizeMessageCenterDateRange,
} from "@/lib/message-center/date-range";

function matchesLegacyActivityFilter(item: DashboardActivityItem, filter: string): boolean {
  if (!filter || filter === "all") return true;
  if (filter === "conversations" || filter === "notifications") return true;
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

function toStreamFilter(raw: string): MemberMessageCenterFilter {
  const f = raw.trim().toLowerCase();
  if (f === "conversations") return "conversations";
  if (f === "notifications") return "notifications";
  return "all";
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await getMemberByUserId(user.id);
    if (!member) {
      const empty = {
        items: [],
        streamItems: [],
        nextCursor: null,
        hasMore: false,
        memberContactId: null as string | null,
      };
      return NextResponse.json(empty);
    }

    const { searchParams } = new URL(request.url);
    const filterRaw = (searchParams.get("filter") ?? "all").trim();
    const dateFrom = searchParams.get("date_from")?.trim() || "";
    const dateTo = searchParams.get("date_to")?.trim() || "";
    const dateRangeActive = !!(dateFrom || dateTo);
    const requestedLimit = parseInt(searchParams.get("limit") ?? "80", 10) || 80;
    const limit = Math.min(Math.max(requestedLimit, dateRangeActive ? 120 : 1), 200);
    const cursorParam = (searchParams.get("cursor") ?? "").trim() || null;
    const dateBounds =
      dateRangeActive && (dateFrom || dateTo)
        ? normalizeMessageCenterDateRange(dateFrom || null, dateTo || null)
        : null;

    const { activity, streamItems: merged } = await getMemberMessageCenterMergedStream(
      member.contact_id,
      user.id,
      limit,
      { dateRangeActive, streamMergeMax: 480 }
    );

    let items = activity.filter((i) => matchesLegacyActivityFilter(i, filterRaw));
    if (dateBounds) {
      items = items.filter((i) => messageCenterItemInDateRange(i.at, dateBounds));
    }

    let streamItems = merged;
    if (dateBounds) {
      streamItems = streamItems.filter((i) => messageCenterItemInDateRange(i.at, dateBounds));
    }

    streamItems = filterMemberStreamItems(streamItems, toStreamFilter(filterRaw));
    const page = paginateMemberStreamItems(streamItems, limit, cursorParam);

    return NextResponse.json({
      items: cursorParam ? [] : items,
      streamItems: page.streamItems,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      memberContactId: member.contact_id,
    });
  } catch (error) {
    console.error("GET /api/members/message-center:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
