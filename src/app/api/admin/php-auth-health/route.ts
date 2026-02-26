/**
 * GET /api/admin/php-auth-health
 * Calls PHP-Auth GET /api/external/health with X-API-Key only.
 * Superadmin only. Use from auth-test page to verify connectivity and API key.
 */

import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { isPhpAuthConfigured } from "@/lib/php-auth/config";
import { getPhpAuthConfig } from "@/lib/php-auth/config";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (isPhpAuthConfigured()) {
    const role = await getRoleForCurrentUser();
    if (!isSuperadminFromRole(role)) {
      return NextResponse.json({ error: "Unauthorized: Superadmin required" }, { status: 403 });
    }
  } else if (!isSuperadmin(user)) {
    return NextResponse.json({ error: "Unauthorized: Superadmin required" }, { status: 403 });
  }

  const config = getPhpAuthConfig();
  if (!config) {
    return NextResponse.json({
      success: false,
      reason: "config_missing",
      message: "AUTH_BASE_URL, AUTH_ORG_ID, AUTH_APPLICATION_ID, AUTH_API_KEY must be set",
    });
  }

  try {
    const url = `${config.baseUrl}/api/external/health`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-API-Key": config.apiKey, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({
      success: res.ok,
      status: res.status,
      baseUrl: config.baseUrl,
      body,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      reason: "fetch_error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
