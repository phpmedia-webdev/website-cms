/**
 * M3: Sync user and role to PHP-Auth when assigning/updating/removing in website-cms.
 * Uses PHP-Auth POST /api/external/sync-user-role for assign and update (new API).
 * Remove: tries legacy POST /api/external/user-org-role with operation "remove" if PHP-Auth supports it.
 * See docs/reference/website-cms-sync-user-role-api.md.
 */

import { getPhpAuthConfig } from "./config";

export type UserOrgRoleOperation = "assign" | "update" | "remove";

export interface SyncUserOrgRoleParams {
  /** Supabase auth.users id (so PHP-Auth can link for validate-user). */
  supabaseUserId: string;
  /** User email. */
  email: string;
  /** PHP-Auth role slug (e.g. website-cms-admin). Null for remove. */
  roleSlug: string | null;
  /** Display name; required for new user, optional for existing (updates name if sent). */
  fullName?: string | null;
  /** Operation: assign, update, or remove. */
  operation: UserOrgRoleOperation;
  /** True when the user was just created (e.g. invite); use newUser: true and fullName in sync-user-role. */
  newUser?: boolean;
  /** When true, PHP-Auth adds the user to your org/app with the given role if they exist but have no org/app assignment. Use for assign/update to fix "user in table but no org/app". */
  addToOrgIfMissing?: boolean;
}

/**
 * Sync user role to PHP-Auth (assign or update).
 * Endpoint: POST {AUTH_BASE_URL}/api/external/sync-user-role
 * Body: { email, roleSlug, fullName?, newUser?, supabaseUserId?, addToOrgIfMissing? }. Org/app from X-API-Key.
 */
async function callSyncUserRole(params: {
  email: string;
  roleSlug: string;
  fullName?: string | null;
  newUser?: boolean;
  supabaseUserId?: string | null;
  addToOrgIfMissing?: boolean;
}): Promise<{ ok: boolean; status: number }> {
  const config = getPhpAuthConfig();
  if (!config) return { ok: false, status: 0 };

  const url = `${config.baseUrl}/api/external/sync-user-role`;
  const body: Record<string, unknown> = {
    email: params.email,
    roleSlug: params.roleSlug,
  };
  if (params.newUser === true) {
    body.newUser = true;
    body.fullName =
      params.fullName != null && params.fullName !== ""
        ? params.fullName
        : params.email.split("@")[0] || "User";
    if (params.supabaseUserId) body.supabaseUserId = params.supabaseUserId;
  } else if (params.fullName != null && params.fullName !== "") {
    body.fullName = params.fullName;
  }
  if (params.addToOrgIfMissing === true) {
    body.addToOrgIfMissing = true;
    if (body.fullName == null)
      body.fullName =
        params.fullName != null && params.fullName !== ""
          ? params.fullName
          : params.email.split("@")[0] || "User";
    if (params.supabaseUserId) body.supabaseUserId = params.supabaseUserId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status };
}

/**
 * Legacy remove: POST user-org-role with operation "remove". Use if PHP-Auth still supports it.
 */
async function callLegacyUserOrgRoleRemove(params: {
  supabaseUserId: string;
  email: string;
}): Promise<void> {
  const config = getPhpAuthConfig();
  if (!config) return;

  const url = `${config.baseUrl}/api/external/user-org-role`;
  const body = {
    supabaseUserId: params.supabaseUserId,
    email: params.email,
    roleSlug: null,
    organizationId: config.orgId,
    applicationId: config.applicationId,
    operation: "remove",
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
    if (res.status === 404) return;
    if (!res.ok) {
      console.warn("[php-auth] user-org-role remove failed:", res.status);
    }
  } catch (err) {
    console.warn("[php-auth] user-org-role remove error:", err);
  }
}

/**
 * Notify PHP-Auth of a user/role change so central auth stays in sync.
 * - Assign/update: calls POST /api/external/sync-user-role (email, roleSlug, fullName, newUser?, supabaseUserId?).
 * - Remove: calls legacy POST /api/external/user-org-role with operation "remove" (no-op if endpoint missing).
 * Does not throw; logs and returns on 4xx/5xx or if PHP-Auth is not configured.
 */
export async function syncUserOrgRoleToPhpAuth(params: SyncUserOrgRoleParams): Promise<void> {
  if (params.operation === "remove") {
    await callLegacyUserOrgRoleRemove({
      supabaseUserId: params.supabaseUserId,
      email: params.email,
    });
    return;
  }

  if (params.roleSlug == null || params.roleSlug === "") {
    console.warn("[php-auth] sync-user-role skipped: roleSlug required for assign/update");
    return;
  }

  try {
    const { ok, status } = await callSyncUserRole({
      email: params.email,
      roleSlug: params.roleSlug,
      fullName: params.fullName,
      newUser: params.newUser === true,
      supabaseUserId: params.supabaseUserId,
      addToOrgIfMissing: params.addToOrgIfMissing === true,
    });
    if (!ok) {
      console.warn("[php-auth] sync-user-role failed:", params.operation, status);
    }
  } catch (err) {
    console.warn("[php-auth] sync-user-role error:", params.operation, err);
  }
}
