/**
 * Resolve the current user's role for the current tenant.
 * M4: When PHP-Auth is configured, role comes only from validate-user; no fallback to metadata or tenant_user_assignments.
 * When not configured, fallback to metadata (superadmin) and tenant_user_assignments (tenant admin).
 *
 * Request-scoped reuse: validate-user is called at most once per request via getValidateUserDataCached (React cache()).
 */

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import {
  getTenantUserByAuthUserId,
  getRoleForUserOnSite,
  getAssignmentByAdminAndTenant,
} from "@/lib/supabase/tenant-users";
import { getClientSchema } from "@/lib/supabase/schema";
import { getEffectiveFeatureSlugs } from "@/lib/supabase/feature-registry";
import { isPhpAuthConfigured } from "@/lib/php-auth/config";
import { validateUser, getRoleSlugFromValidateUserData } from "@/lib/php-auth/validate-user";
import type { PhpAuthValidateUserData } from "@/lib/php-auth/validate-user";
import {
  toPhpAuthRoleSlug,
  legacySlugToPhpAuthSlug,
  PHP_AUTH_ROLE_SLUG,
  isSuperadminFromRole,
  isAdminRole,
  isTenantAdminRole,
} from "@/lib/php-auth/role-mapping";

export { isSuperadminFromRole, isAdminRole, isTenantAdminRole };

/**
 * Fetch validate-user result once per request (React cache). Used by getRoleForCurrentUser and getRoleForCurrentUserOnSite.
 */
async function getValidateUserDataForRequest(): Promise<PhpAuthValidateUserData | null> {
  if (!isPhpAuthConfigured()) return null;
  try {
    const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
    const supabase = await createServerSupabaseClientSSR();
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) return null;
    return await validateUser(accessToken);
  } catch {
    return null;
  }
}

const getValidateUserDataCached = cache(getValidateUserDataForRequest);

/**
 * Async superadmin check for API routes and server code.
 * Uses getRoleForCurrentUser() (PHP-Auth when configured, else fallback) then isSuperadminFromRole(role).
 * Prefer this over isSuperadmin(user) when PHP-Auth may be configured.
 */
export async function isSuperadminAsync(): Promise<boolean> {
  const role = await getRoleForCurrentUser();
  return isSuperadminFromRole(role);
}

/**
 * Get the current user's role for the current tenant (NEXT_PUBLIC_CLIENT_SCHEMA).
 * Dual-read: if PHP-Auth is configured, call validate-user first; if user is in AUTH_ORG_ID, use that role.
 * Else fallback: superadmin from metadata, tenant user from tenant_user_assignments.
 */
export async function getRoleForCurrentUser(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (isPhpAuthConfigured()) {
    const data = await getValidateUserDataCached();
    const roleSlug = data ? getRoleSlugFromValidateUserData(data) : null;
    if (roleSlug) return toPhpAuthRoleSlug(roleSlug);
    return null;
  }

  if (user.metadata.type === "superadmin" && user.metadata.role === "superadmin") {
    return PHP_AUTH_ROLE_SLUG.SUPERADMIN;
  }

  let tenantSiteId: string;
  try {
    const schema = getClientSchema();
    const site = await getTenantSiteBySchema(schema);
    if (!site) return null;
    tenantSiteId = site.id;
  } catch {
    return null;
  }

  const tenantUser = await getTenantUserByAuthUserId(user.id);
  if (!tenantUser) return null;

  const legacyRole = await getRoleForUserOnSite(tenantUser.id, tenantSiteId);
  return legacyRole ? legacySlugToPhpAuthSlug(legacyRole) : null;
}

/**
 * Get the current user's role for a specific tenant site (by id).
 * Uses same dual-read as getRoleForCurrentUser for org-scoped role; then for non-superadmin we still need site-level assignment in fallback.
 */
export async function getRoleForCurrentUserOnSite(tenantSiteId: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (isPhpAuthConfigured()) {
    const data = await getValidateUserDataCached();
    const roleSlug = data ? getRoleSlugFromValidateUserData(data) : null;
    if (roleSlug) return toPhpAuthRoleSlug(roleSlug);
    return null;
  }

  if (user.metadata.type === "superadmin" && user.metadata.role === "superadmin") {
    return PHP_AUTH_ROLE_SLUG.SUPERADMIN;
  }

  const tenantUser = await getTenantUserByAuthUserId(user.id);
  if (!tenantUser) return null;

  const legacyRole = await getRoleForUserOnSite(tenantUser.id, tenantSiteId);
  return legacyRole ? legacySlugToPhpAuthSlug(legacyRole) : null;
}

/**
 * Effective feature slugs for the current user (for sidebar and route guards).
 * - Superadmin (from getRoleForCurrentUser): returns "all".
 * - Tenant user: returns slug[] from getEffectiveFeatureSlugs(tenantSiteId, role).
 * - No user or no role (e.g. PHP-Auth configured and validate-user failed): returns [].
 */
export async function getEffectiveFeatureSlugsForCurrentUser(): Promise<string[] | "all"> {
  const role = await getRoleForCurrentUser();
  if (!role) return [];
  if (role === PHP_AUTH_ROLE_SLUG.SUPERADMIN) return "all";

  let tenantSiteId: string;
  try {
    const schema = getClientSchema();
    const site = await getTenantSiteBySchema(schema);
    if (!site) return [];
    tenantSiteId = site.id;
  } catch {
    return [];
  }

  return getEffectiveFeatureSlugs(tenantSiteId, role);
}

/** Result for team management authZ: can the current user manage team for the current tenant, and are they an Owner? */
export interface TeamManagementContext {
  canManage: boolean;
  isOwner: boolean;
  isSuperadmin: boolean;
  tenantSiteId: string | null;
  tenantUserId: string | null;
}

/**
 * Can the current user manage team (Settings → Users) for the current tenant?
 * - Superadmin: canManage true, isOwner false, tenantSiteId from schema.
 * - Tenant admin (website-cms-admin): canManage true, isOwner from assignment.
 * - Others: canManage false.
 * When PHP-Auth is configured, role comes only from getRoleForCurrentUser(); metadata and tenant_user_assignments are not used for role.
 */
export async function getTeamManagementContext(): Promise<TeamManagementContext> {
  const user = await getCurrentUser();
  if (!user) {
    return { canManage: false, isOwner: false, isSuperadmin: false, tenantSiteId: null, tenantUserId: null };
  }

  let tenantSiteId: string;
  try {
    const schema = getClientSchema();
    const site = await getTenantSiteBySchema(schema);
    if (!site) {
      return { canManage: false, isOwner: false, isSuperadmin: false, tenantSiteId: null, tenantUserId: null };
    }
    tenantSiteId = site.id;
  } catch {
    return { canManage: false, isOwner: false, isSuperadmin: false, tenantSiteId: null, tenantUserId: null };
  }

  if (isPhpAuthConfigured()) {
    const role = await getRoleForCurrentUser();
    if (isSuperadminFromRole(role)) {
      return { canManage: true, isOwner: false, isSuperadmin: true, tenantSiteId, tenantUserId: null };
    }
    if (isTenantAdminRole(role)) {
      const tenantUser = await getTenantUserByAuthUserId(user.id);
      if (!tenantUser) {
        return { canManage: false, isOwner: false, isSuperadmin: false, tenantSiteId: null, tenantUserId: null };
      }
      const assignment = await getAssignmentByAdminAndTenant(tenantUser.id, tenantSiteId);
      return {
        canManage: true,
        isOwner: assignment?.is_owner ?? false,
        isSuperadmin: false,
        tenantSiteId,
        tenantUserId: tenantUser.id,
      };
    }
    const tenantUser = await getTenantUserByAuthUserId(user.id);
    return {
      canManage: false,
      isOwner: false,
      isSuperadmin: false,
      tenantSiteId: null,
      tenantUserId: tenantUser?.id ?? null,
    };
  }

  if (user.metadata.type === "superadmin" && user.metadata.role === "superadmin") {
    return { canManage: true, isOwner: false, isSuperadmin: true, tenantSiteId, tenantUserId: null };
  }

  const tenantUser = await getTenantUserByAuthUserId(user.id);
  if (!tenantUser) {
    return { canManage: false, isOwner: false, isSuperadmin: false, tenantSiteId: null, tenantUserId: null };
  }

  const assignment = await getAssignmentByAdminAndTenant(tenantUser.id, tenantSiteId);
  if (!assignment || (assignment.role_slug !== "admin" && assignment.role_slug !== PHP_AUTH_ROLE_SLUG.ADMIN)) {
    return { canManage: false, isOwner: false, isSuperadmin: false, tenantSiteId: null, tenantUserId: tenantUser.id };
  }

  return {
    canManage: true,
    isOwner: assignment.is_owner,
    isSuperadmin: false,
    tenantSiteId,
    tenantUserId: tenantUser.id,
  };
}
