/**
 * GET /api/admin/message-center?filter=&limit=
 * Unified Message Center stream for admin dashboard (thread heads + timeline-shaped rows).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getAdminMessageCenterStream,
  type GetAdminMessageCenterStreamOptions,
  type MessageCenterStreamFilter,
} from "@/lib/message-center/admin-stream";

const ALLOWED: MessageCenterStreamFilter[] = [
  "all",
  "conversations",
  "notifications",
  "notification_timeline",
  "blog_comment",
  "form_submission",
  "form_submitted",
  "contact_added",
  "mag_assignment",
  "marketing_list",
  "order",
  "support",
  "task_ticket",
  "mag_group",
  "direct",
  "group",
];

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const rawFilter = searchParams.get("filter") ?? "all";
    const filter = (ALLOWED.includes(rawFilter as MessageCenterStreamFilter)
      ? rawFilter
      : "all") as MessageCenterStreamFilter;
    const limitRaw = searchParams.get("limit");
    const dateFrom = searchParams.get("date_from")?.trim() || null;
    const dateTo = searchParams.get("date_to")?.trim() || null;
    const hasDate = !!(dateFrom || dateTo);
    const maxItems = hasDate ? 250 : 120;
    const limit = Math.min(Math.max(parseInt(limitRaw ?? "50", 10) || 50, 1), maxItems);
    const contactId = searchParams.get("contact_id")?.trim() || null;
    const streamOpts: GetAdminMessageCenterStreamOptions = {
      contactId,
      forUserId: user.id,
      dateFrom,
      dateTo,
    };
    const items = await getAdminMessageCenterStream(limit, filter, streamOpts);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("GET /api/admin/message-center:", e);
    return NextResponse.json({ error: "Failed to load Message Center" }, { status: 500 });
  }
}
