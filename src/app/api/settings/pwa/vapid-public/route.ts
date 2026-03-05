import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";

/**
 * GET /api/settings/pwa/vapid-public
 * Returns the VAPID public key for client-side push subscription.
 * Only the public key is exposed; private key stays server-side.
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

    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    if (!publicKey) {
      return NextResponse.json(
        { error: "VAPID not configured", publicKey: null },
        { status: 503 }
      );
    }

    return NextResponse.json({ publicKey });
  } catch (err) {
    console.error("VAPID public GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
