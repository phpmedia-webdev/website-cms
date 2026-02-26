/**
 * POST /api/admin/php-auth-test-sync
 * Test call to PHP-Auth POST /api/external/sync-user-role. Superadmin only.
 * Body: { email, roleSlug, fullName?, newUser?, supabaseUserId? }. Returns raw response and duration for auth-test activity log.
 * Does not modify local DB; only calls PHP-Auth. Use for connectivity and payload testing.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import { getPhpAuthConfig } from "@/lib/php-auth/config";

export async function POST(request: Request) {
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

  let body: { email?: string; roleSlug?: string; fullName?: string; newUser?: boolean; supabaseUserId?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const roleSlug = typeof body.roleSlug === "string" ? body.roleSlug.trim() : "website-cms-viewer";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : undefined;
  const newUser = body.newUser === true;
  const supabaseUserId = typeof body.supabaseUserId === "string" ? body.supabaseUserId.trim() : undefined;

  if (!email) {
    return NextResponse.json({
      success: false,
      error: "email is required in body",
      statusCode: 0,
      durationMs: 0,
    });
  }

  const url = `${config.baseUrl}/api/external/sync-user-role`;
  const payload: Record<string, unknown> = {
    email,
    roleSlug: roleSlug || "website-cms-viewer",
  };
  if (newUser) {
    payload.newUser = true;
    payload.fullName = fullName ?? email.split("@")[0] ?? "User";
    if (supabaseUserId) payload.supabaseUserId = supabaseUserId;
  } else if (fullName) {
    payload.fullName = fullName;
  }

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const durationMs = Date.now() - start;
    const resBody = await res.json().catch(() => ({}));
    return NextResponse.json({
      success: res.ok,
      statusCode: res.status,
      durationMs,
      body: resBody,
      endpoint: `${config.baseUrl}/api/external/sync-user-role`,
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
