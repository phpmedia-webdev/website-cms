/**
 * GET /api/members/messaging-preferences — GPUM MAG community toggles (migration 214).
 * PATCH — update global + per-MAG opt-in (only MAGs the member belongs to).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMemberByUserId } from "@/lib/supabase/members";
import {
  getMemberMagMessagingPrefsForUser,
  updateMemberMagMessagingPrefsForUser,
} from "@/lib/supabase/member-mag-messaging";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const member = await getMemberByUserId(user.id);
  if (!member) {
    return NextResponse.json({ error: "Members only" }, { status: 403 });
  }
  const data = await getMemberMagMessagingPrefsForUser(user.id);
  if (!data) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const member = await getMemberByUserId(user.id);
  if (!member) {
    return NextResponse.json({ error: "Members only" }, { status: 403 });
  }
  let body: { mag_community_messaging_enabled?: boolean; opt_in_mag_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const global =
    typeof body.mag_community_messaging_enabled === "boolean"
      ? body.mag_community_messaging_enabled
      : (await getMemberMagMessagingPrefsForUser(user.id))?.mag_community_messaging_enabled ?? false;
  const rawIds = body.opt_in_mag_ids;
  const opt_in_mag_ids = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === "string")
    : [];

  const { ok, error } = await updateMemberMagMessagingPrefsForUser(user.id, {
    mag_community_messaging_enabled: global,
    opt_in_mag_ids,
  });
  if (!ok) {
    return NextResponse.json({ error: error ?? "Update failed" }, { status: 400 });
  }
  const data = await getMemberMagMessagingPrefsForUser(user.id);
  return NextResponse.json(data ?? { mag_community_messaging_enabled: global, mags: [] });
}
