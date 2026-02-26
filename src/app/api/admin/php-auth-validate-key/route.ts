/**
 * POST /api/admin/php-auth-validate-key
 * Calls PHP-Auth POST /api/external/validate-api-key with X-API-Key only.
 * Superadmin only. Use from auth-test page to confirm application is authenticated.
 */

import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { isPhpAuthConfigured, getPhpAuthConfig } from "@/lib/php-auth/config";

export async function POST() {
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
    });
  }

  try {
    const url = `${config.baseUrl}/api/external/validate-api-key`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-API-Key": config.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({}),
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
