/**
 * GET /api/admin/php-auth-user-lookup?email=...
 * Check if a user is in the PHP-Auth user list (calling app's org). Superadmin only.
 * Calls PHP-Auth GET /api/external/check-user?email=... with X-API-Key.
 * See docs/reference/website-cms-sync-user-role-api.md Section 9 ("Check if a user is in the PHP-Auth user list").
 * Response: 200 with exists: true + user info if in org, or exists: false if not (or in another org). 400 if email missing.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import { getPhpAuthConfig } from "@/lib/php-auth/config";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isSuperadminAsync())) {
    return NextResponse.json({ error: "Unauthorized: Superadmin required" }, { status: 403 });
  }

  const config = getPhpAuthConfig();
  if (!config) {
    return NextResponse.json({
      success: false,
      error: "PHP-Auth not configured (AUTH_* env vars)",
      statusCode: 0,
      durationMs: 0,
    });
  }

  const { searchParams } = new URL(request.url);
  const emailRaw = searchParams.get("email")?.trim() ?? "";
  if (!emailRaw) {
    return NextResponse.json({
      success: false,
      error: "email query parameter is required",
      statusCode: 400,
      durationMs: 0,
    });
  }
  const email = emailRaw.toLowerCase();

  // Path: default api/external/check-user; override with AUTH_CHECK_USER_PATH if PHP-Auth uses another path.
  const pathRaw = process.env.AUTH_CHECK_USER_PATH ?? "api/external/check-user";
  const path = pathRaw.replace(/^\//, "").replace(/\/$/, "") || "api/external/check-user";
  const url = `${config.baseUrl}/${path}?${new URLSearchParams({ email }).toString()}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-API-Key": config.apiKey, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const durationMs = Date.now() - start;
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const phpMessage = typeof body?.message === "string" ? body.message : typeof body?.error === "string" ? body.error : undefined;

    // 404 with empty body usually means the endpoint doesn't exist on the server yet.
    const is404Empty = res.status === 404 && Object.keys(body).length === 0;
    const outBody = is404Empty
      ? {
          _note: "PHP-Auth returned 404 with no body. The check-user endpoint may not be deployed or may use a different path.",
          _hint: "If your auth server uses a different path, set AUTH_CHECK_USER_PATH (e.g. api/v1/check-user).",
          endpoint: url,
        }
      : body;

    return NextResponse.json({
      success: res.ok,
      statusCode: res.status,
      durationMs,
      body: outBody,
      endpoint: url,
      ...(phpMessage && !res.ok ? { message: phpMessage } : {}),
      ...(is404Empty ? { message: "Endpoint not found (404). Set AUTH_CHECK_USER_PATH if your auth server uses a different path." } : {}),
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    return NextResponse.json({
      success: false,
      statusCode: 0,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
