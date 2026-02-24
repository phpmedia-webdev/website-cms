/**
 * M3: Sync user–org–role to PHP-Auth when assigning/updating/removing in website-cms.
 * Calls PHP-Auth external API if available; no-op if not configured or endpoint missing.
 * We always keep writing to tenant_user_assignments (fallback); this is an additional write to central.
 */

import { getPhpAuthConfig } from "./config";

export type UserOrgRoleOperation = "assign" | "update" | "remove";

export interface SyncUserOrgRoleParams {
  /** Supabase auth.users id (so PHP-Auth can match by supabase_user_id). */
  supabaseUserId: string;
  /** User email (for display and matching). */
  email: string;
  /** PHP-Auth role slug (e.g. website-cms-admin). Null for remove. */
  roleSlug: string | null;
  operation: UserOrgRoleOperation;
}

/**
 * Notify PHP-Auth of a role assignment change so it can update auth_user_organizations.
 * Endpoint: POST {AUTH_BASE_URL}/api/external/user-org-role
 * Body: { supabaseUserId, email, roleSlug, organizationId, applicationId, operation }.
 * Does not throw; logs and returns on 4xx/5xx or if PHP-Auth is not configured.
 */
export async function syncUserOrgRoleToPhpAuth(params: SyncUserOrgRoleParams): Promise<void> {
  const config = getPhpAuthConfig();
  if (!config) return;

  const url = `${config.baseUrl}/api/external/user-org-role`;
  const body = {
    supabaseUserId: params.supabaseUserId,
    email: params.email,
    roleSlug: params.roleSlug,
    organizationId: config.orgId,
    applicationId: config.applicationId,
    operation: params.operation,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.status === 404) {
      // Endpoint not implemented yet; document in PHP-Auth and add when ready
      return;
    }
    if (!res.ok) {
      console.warn("[php-auth] user-org-role sync failed:", params.operation, res.status);
    }
  } catch (err) {
    console.warn("[php-auth] user-org-role sync error:", params.operation, err);
  }
}
