/**
 * GET /api/members/profile — current member's profile (handle, communicate_in_messages).
 * PATCH /api/members/profile — update handle and communicate_in_messages. Auth: current user only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getProfileByUserId, upsertProfile } from "@/lib/supabase/profiles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getProfileByUserId(user.id);
  return NextResponse.json({
    handle: profile?.handle ?? null,
    communicate_in_messages: profile?.communicate_in_messages ?? false,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { handle?: string | null; communicate_in_messages?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const existing = await getProfileByUserId(user.id);
  const handle = body.handle !== undefined ? (body.handle?.trim() || null) : existing?.handle ?? null;
  const communicate_in_messages =
    body.communicate_in_messages !== undefined
      ? body.communicate_in_messages
      : (existing?.communicate_in_messages ?? false);
  const updated = await upsertProfile({
    user_id: user.id,
    display_name: existing?.display_name ?? null,
    avatar_url: existing?.avatar_url ?? null,
    title: existing?.title ?? null,
    company: existing?.company ?? null,
    bio: existing?.bio ?? null,
    phone: existing?.phone ?? null,
    handle,
    communicate_in_messages,
  });
  if (!updated) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
  return NextResponse.json({
    handle: updated.handle ?? null,
    communicate_in_messages: updated.communicate_in_messages ?? false,
  });
}
