/**
 * Call PHP-Auth validate-user API to get current user's organizations and roles.
 * API doc: docs/reference/website-cms-validate-user-api.md
 * Supports both legacy response (organizations only) and new response (assignment.role, assignment.permissions, assignment.features).
 */

import { getPhpAuthConfig } from "./config";

export interface PhpAuthValidateUserOrganization {
  id: string;
  name: string;
  slug?: string;
  roleId?: string;
  roleName: string;
  /** PHP-Auth role slug (e.g. website-cms-admin). Use this when present; else derive from roleName. */
  roleSlug?: string;
  permissions?: string[];
  coreAppAccess?: Record<string, unknown>;
}

/** Application-level assignment for this app (role, permissions, features). Prefer this over org-based role when present. */
export interface PhpAuthValidateUserAssignment {
  role: { id?: string; name?: string; slug?: string };
  permissions?: { slug: string; label?: string; parentSlug?: string | null; isEnabled?: boolean }[];
  features?: { slug: string; label?: string; parentSlug?: string | null; isEnabled?: boolean }[];
}

export interface PhpAuthValidateUserData {
  user: {
    id: string;
    supabaseId?: string;
    email?: string;
    fullName?: string;
    isActive?: boolean;
  };
  application?: {
    id: string;
    organizationId: string;
    name?: string;
    isActive?: boolean;
  };
  organizations: PhpAuthValidateUserOrganization[];
  sessionId?: string;
  message?: string;
  /** Application-level role, permissions, features for this app. Use when present. */
  assignment?: PhpAuthValidateUserAssignment;
}

export interface PhpAuthValidateUserResult {
  success: true;
  data: PhpAuthValidateUserData;
}

/**
 * Call PHP-Auth POST /api/external/validate-user with the Supabase access token.
 * Returns parsed data on 200, null on 4xx/5xx or if config is missing.
 * Does not throw; caller uses null for fallback.
 */
export async function validateUser(accessToken: string): Promise<PhpAuthValidateUserData | null> {
  const result = await validateUserWithStatus(accessToken);
  return result.status === 200 ? result.data : null;
}

/**
 * Same as validateUser but returns HTTP status so callers can distinguish 401 vs 403 vs 200.
 * Useful for login-page diagnostics when validate-user fails.
 */
export async function validateUserWithStatus(
  accessToken: string
): Promise<{ data: PhpAuthValidateUserData | null; status: number }> {
  const config = getPhpAuthConfig();
  if (!config) return { data: null, status: 0 };

  const url = `${config.baseUrl}/api/external/validate-user`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-API-Key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) return { data: null, status: res.status };

  let json: { success?: boolean; data?: PhpAuthValidateUserData };
  try {
    json = (await res.json()) as { success?: boolean; data?: PhpAuthValidateUserData };
  } catch {
    return { data: null, status: res.status };
  }

  if (json.success !== true || !json.data) return { data: null, status: res.status };
  const data = json.data;
  if (!data.assignment?.role && (!data.organizations || data.organizations.length === 0)) {
    return { data: null, status: res.status };
  }
  return { data, status: res.status };
}

/**
 * Get the organization that matches AUTH_ORG_ID from validate-user data.
 * Returns that org (with roleName) or null.
 */
export function getOrgForThisApp(
  data: PhpAuthValidateUserData
): PhpAuthValidateUserOrganization | null {
  const config = getPhpAuthConfig();
  if (!config) return null;
  return data.organizations?.find((org) => org.id === config.orgId) ?? null;
}

/**
 * Get the user's role slug for this app from validate-user data.
 * Prefers data.assignment.role.slug (new API); falls back to org matching AUTH_ORG_ID (legacy).
 */
export function getRoleSlugFromValidateUserData(data: PhpAuthValidateUserData): string | null {
  const slug = data.assignment?.role?.slug?.trim();
  if (slug) return slug;
  const org = getOrgForThisApp(data);
  if (org?.roleSlug?.trim()) return org.roleSlug.trim();
  if (org?.roleName?.trim()) return org.roleName.trim();
  return null;
}
