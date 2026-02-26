/**
 * GET /api/admin/php-auth-health
 * Calls PHP-Auth GET /api/external/health with X-API-Key only.
 * Superadmin only. Use from auth-test page to verify connectivity and API key.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import { getPhpAuthConfig } from "@/lib/php-auth/config";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isSuperadminAsync())) {
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
