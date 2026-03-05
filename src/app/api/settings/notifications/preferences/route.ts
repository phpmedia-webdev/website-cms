/**
 * GET /api/settings/notifications/preferences — notification action preferences (email/pwa per action).
 * PATCH /api/settings/notifications/preferences — update preferences. Admin only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getSetting, setSetting } from "@/lib/supabase/settings";
import {
  NOTIFICATIONS_PREFERENCES_KEY,
  mergeWithDefaults,
  type NotificationPreferences,
  NOTIFICATION_ACTION_KEYS,
} from "@/lib/notifications/actions";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await getSetting<NotificationPreferences>(NOTIFICATIONS_PREFERENCES_KEY);
    const preferences = mergeWithDefaults(raw ?? null);
    return NextResponse.json({ preferences });
  } catch (err) {
    console.error("GET notifications preferences:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const preferences = body.preferences as NotificationPreferences | undefined;
    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json(
        { error: "Invalid body: preferences object required" },
        { status: 400 }
      );
    }

    const toStore: NotificationPreferences = {};
    for (const key of NOTIFICATION_ACTION_KEYS) {
      const p = preferences[key];
      if (p && typeof p === "object" && typeof p.email === "boolean" && typeof p.pwa === "boolean") {
        toStore[key] = { email: p.email, pwa: p.pwa };
      }
    }

    const ok = await setSetting(NOTIFICATIONS_PREFERENCES_KEY, toStore);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to save preferences" },
        { status: 500 }
      );
    }

    const merged = mergeWithDefaults(toStore);
    return NextResponse.json({ preferences: merged });
  } catch (err) {
    console.error("PATCH notifications preferences:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
