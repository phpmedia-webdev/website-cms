import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { savePushSubscription } from "@/lib/pwa/push-subscriptions";

/**
 * POST /api/settings/pwa/push-subscription
 * Save the current user's push subscription (from browser pushManager.subscribe()).
 * Body: { endpoint: string, keys: { p256dh: string, auth: string } }
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
    const keys = body?.keys && typeof body.keys === "object" ? body.keys : null;
    const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh.trim() : "";
    const auth = typeof keys?.auth === "string" ? keys.auth.trim() : "";

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Missing endpoint or keys.p256dh or keys.auth" },
        { status: 400 }
      );
    }

    const ok = await savePushSubscription(user.id, { endpoint, p256dh, auth });
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push subscription POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
