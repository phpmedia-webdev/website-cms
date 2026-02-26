/**
 * GET /api/auth/validate-user-diagnose
 * Minimal diagnostic for "couldn't be verified" on login page.
 * Requires a valid Supabase session (so user can call it when stuck at login with reason=no_central_role).
 * Does NOT require superadmin. Returns only success, status, and a short reason — no config or tokens.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { validateUserWithStatus, getRoleSlugFromValidateUserData } from "@/lib/php-auth/validate-user";
import { getPhpAuthConfig } from "@/lib/php-auth/config";

export async function GET() {
  try {
    const config = getPhpAuthConfig();
    if (!config) {
      return NextResponse.json({
        success: false,
        status: 0,
        reason: "PHP-Auth not configured (missing AUTH_BASE_URL, AUTH_ORG_ID, AUTH_APPLICATION_ID, or AUTH_API_KEY).",
      });
    }

    const supabase = await createServerSupabaseClientSSR();
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        status: 0,
        reason: "No session or access token. Sign in first, then use this check.",
      });
    }

    const { data, status } = await validateUserWithStatus(accessToken);

    if (status === 200 && data) {
      const roleSlug = getRoleSlugFromValidateUserData(data);
      if (roleSlug) {
        return NextResponse.json({
          success: true,
          status: 200,
          reason: "OK",
          roleSlug,
        });
      }
      return NextResponse.json({
        success: false,
        status: 200,
        reason: "PHP-Auth returned 200 but no role for this app. Your user may not be in the org that matches AUTH_ORG_ID, or has no application role. In PHP-Auth: add user to the application's organization and assign a role (e.g. website-cms-superadmin).",
      });
    }

    if (status === 401) {
      return NextResponse.json({
        success: false,
        status: 401,
        reason: "PHP-Auth returned 401. Check: API key valid and for this application? Bearer token valid and not expired? User exists in PHP-Auth and is active?",
      });
    }

    if (status === 403) {
      return NextResponse.json({
        success: false,
        status: 403,
        reason: "PHP-Auth returned 403. User is not in the application's organization or has no role for this app. In PHP-Auth: ensure user is in the same org as the application (AUTH_ORG_ID) and has a role (e.g. website-cms-superadmin or website-cms-admin).",
      });
    }

    if (status >= 500) {
      return NextResponse.json({
        success: false,
        status,
        reason: `PHP-Auth returned ${status}. Server error on auth.phpmedia.com — check PHP-Auth logs.`,
      });
    }

    if (status === 0) {
      return NextResponse.json({
        success: false,
        status: 0,
        reason: "Could not reach PHP-Auth (network error or AUTH_BASE_URL unreachable).",
      });
    }

    return NextResponse.json({
      success: false,
      status,
      reason: `PHP-Auth returned ${status}. See validate-user-troubleshooting.md for audit log steps.`,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      status: 0,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
