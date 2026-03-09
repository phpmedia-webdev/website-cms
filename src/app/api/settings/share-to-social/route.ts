import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getShareToSocialSettings,
  setShareToSocialSettings,
  type ShareToSocialSettings,
} from "@/lib/share-to-social/settings";

/**
 * GET /api/settings/share-to-social
 * Returns share/social links config (links[], displayStyle, showLabels).
 */
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

    const settings = await getShareToSocialSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Share-to-social GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/share-to-social
 * Update share/social links config. Body: links?, displayStyle?, showLabels?
 */
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

    const body = (await request.json()) as Partial<ShareToSocialSettings>;
    const success = await setShareToSocialSettings(body);
    if (!success) {
      return NextResponse.json({ error: "Failed to update share settings" }, { status: 500 });
    }
    const settings = await getShareToSocialSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Share-to-social PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
