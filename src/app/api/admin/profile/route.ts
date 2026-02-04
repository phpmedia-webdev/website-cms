/**
 * GET /api/admin/profile — current user's profile + email (read-only).
 * PATCH /api/admin/profile — update profile (core + custom fields). Auth: must be current user.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getProfileWithFields,
  upsertProfile,
  setProfileFieldValue,
} from "@/lib/supabase/profiles";
import type { ProfileUpdate } from "@/types/profiles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getProfileWithFields(user.id);
  return NextResponse.json({
    email: user.email ?? "",
    profile: profile ?? {
      user_id: user.id,
      display_name: null,
      avatar_url: null,
      title: null,
      company: null,
      bio: null,
      phone: null,
      created_at: "",
      updated_at: "",
      custom_fields: {},
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    display_name?: string | null;
    avatar_url?: string | null;
    title?: string | null;
    company?: string | null;
    bio?: string | null;
    phone?: string | null;
    custom_fields?: Record<string, string>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const update: ProfileUpdate = {
    display_name: body.display_name,
    avatar_url: body.avatar_url,
    title: body.title,
    company: body.company,
    bio: body.bio,
    phone: body.phone,
  };
  const updated = await upsertProfile({ user_id: user.id, ...update });
  if (!updated) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
  if (body.custom_fields && typeof body.custom_fields === "object") {
    for (const [key, value] of Object.entries(body.custom_fields)) {
      if (typeof key === "string" && key.trim()) {
        await setProfileFieldValue({
          user_id: user.id,
          field_key: key.trim(),
          value: typeof value === "string" ? value : "",
        });
      }
    }
  }
  const profile = await getProfileWithFields(user.id);
  return NextResponse.json({ profile });
}
