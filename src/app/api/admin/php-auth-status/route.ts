/**
 * GET /api/admin/php-auth-status
 * Temporary debug endpoint: verify PHP-Auth config and validate-user (token flow).
 * Superadmin only. Remove or restrict when no longer needed.
 * Returns JSON: config status + validate-user result (org match, role).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getPhpAuthConfig, isPhpAuthConfigured } from "@/lib/php-auth/config";
import { validateUser, getRoleSlugFromValidateUserData, getOrgForThisApp } from "@/lib/php-auth/validate-user";
import { getRolesForAssignmentFromPhpAuth } from "@/lib/php-auth/fetch-roles";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = await getRoleForCurrentUser();
    if (!isSuperadminFromRole(role)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    const config = getPhpAuthConfig();
    const configStatus = {
      allSet: isPhpAuthConfigured(),
      baseUrlSet: Boolean(process.env.AUTH_BASE_URL),
      orgIdSet: Boolean(process.env.AUTH_ORG_ID),
      applicationIdSet: Boolean(process.env.AUTH_APPLICATION_ID),
      apiKeySet: Boolean(process.env.AUTH_API_KEY),
      baseUrlHint: config
        ? config.baseUrl.includes("localhost")
          ? "localhost"
          : config.baseUrl.startsWith("https")
            ? "https"
            : "http"
        : null,
      rolesUrl: config ? `${config.baseUrl}/${config.rolesPath}` : null,
    };

    if (!config) {
      return NextResponse.json({
        config: configStatus,
        validateUser: { success: false, reason: "config_missing" },
        roles: { success: false, reason: "config_missing" },
      });
    }

    // DEBUG START: Direct probe of roles endpoint — remove when done debugging
    let rolesProbe: { statusCode: number; ok: boolean; error?: string; bodySnippet?: string } = { statusCode: 0, ok: false };
    try {
      const rolesUrl = `${config.baseUrl}/${config.rolesPath}`;
      const probeRes = await fetch(rolesUrl, {
        method: "GET",
        headers: { "X-API-Key": config.apiKey, "Content-Type": "application/json" },
        cache: "no-store",
      });
      const bodyText = await probeRes.text();
      rolesProbe = { statusCode: probeRes.status, ok: probeRes.ok };
      if (!probeRes.ok) {
        rolesProbe.error = bodyText.slice(0, 300);
      } else {
        rolesProbe.bodySnippet = bodyText.slice(0, 500);
      }
    } catch (e) {
      rolesProbe.error = e instanceof Error ? e.message : String(e);
    }
    // DEBUG END

    const supabase = await createServerSupabaseClientSSR();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      const roles = await getRolesForAssignmentFromPhpAuth();
      return NextResponse.json({
        config: configStatus,
        validateUser: { success: false, reason: "no_access_token" },
        rolesProbe,
        roles: { count: roles.length, slugs: roles.map((r) => r.slug) },
      });
    }

    const data = await validateUser(accessToken);
    if (!data) {
      const roles = await getRolesForAssignmentFromPhpAuth();
      return NextResponse.json({
        config: configStatus,
        validateUser: { success: false, reason: "validate_user_failed" },
        rolesProbe,
        roles: { count: roles.length, slugs: roles.map((r) => r.slug) },
      });
    }

    const roleSlug = getRoleSlugFromValidateUserData(data);
    const org = getOrgForThisApp(data);
    const roles = await getRolesForAssignmentFromPhpAuth();
    return NextResponse.json({
      config: configStatus,
      validateUser: {
        success: true,
        roleSlug: roleSlug ?? null,
        fromAssignment: Boolean(data.assignment?.role?.slug),
        orgMatch: Boolean(org),
        roleName: org?.roleName ?? data.assignment?.role?.name ?? null,
        organizationCount: data.organizations?.length ?? 0,
        assignment: data.assignment
          ? {
              role: data.assignment.role,
              permissionsCount: data.assignment.permissions?.length ?? 0,
              featuresCount: data.assignment.features?.length ?? 0,
            }
          : undefined,
      },
      rolesProbe,
      roles: { count: roles.length, slugs: roles.map((r) => r.slug) },
    });
  } catch (err) {
    console.error("php-auth-status error:", err);
    return NextResponse.json(
      {
        error: "Failed to check PHP-Auth status",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
