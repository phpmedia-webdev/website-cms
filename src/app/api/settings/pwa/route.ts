import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getPwaSettings, setPwaSettings, type PwaSettings } from "@/lib/pwa/settings";

/**
 * GET /api/settings/pwa
 * Returns PWA manifest settings (name, short_name, theme_color, background_color, icon_media_id, icon_url).
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

    const settings = await getPwaSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("PWA settings GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/pwa
 * Update PWA settings. Partial body: name?, short_name?, theme_color?, background_color?, icon_media_id?, icon_url?
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

    const body = (await request.json()) as Partial<PwaSettings>;
    const updates: Partial<PwaSettings> = {};
    if (body.name !== undefined) updates.name = typeof body.name === "string" ? body.name : "";
    if (body.short_name !== undefined) updates.short_name = typeof body.short_name === "string" ? body.short_name : "";
    if (body.theme_color !== undefined) updates.theme_color = typeof body.theme_color === "string" ? body.theme_color : "";
    if (body.background_color !== undefined) updates.background_color = typeof body.background_color === "string" ? body.background_color : "";
    if (body.icon_media_id !== undefined) updates.icon_media_id = typeof body.icon_media_id === "string" ? body.icon_media_id : undefined;
    if (body.icon_url !== undefined) updates.icon_url = typeof body.icon_url === "string" ? body.icon_url : undefined;

    const success = await setPwaSettings(updates);
    if (!success) {
      return NextResponse.json({ error: "Failed to update PWA settings" }, { status: 500 });
    }
    const settings = await getPwaSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("PWA settings PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
