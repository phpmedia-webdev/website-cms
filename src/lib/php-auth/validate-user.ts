/**
 * Call PHP-Auth validate-user API to get current user's organizations and roles.
 * Used for dual-read: try PHP-Auth first, then fall back to local tenant_user_assignments.
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
  const config = getPhpAuthConfig();
  if (!config) return null;

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

  if (!res.ok) return null;

  let json: { success?: boolean; data?: PhpAuthValidateUserData };
  try {
    json = (await res.json()) as { success?: boolean; data?: PhpAuthValidateUserData };
  } catch {
    return null;
  }

  if (json.success !== true || !json.data?.organizations) return null;
  return json.data;
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
  return data.organizations.find((org) => org.id === config.orgId) ?? null;
}
