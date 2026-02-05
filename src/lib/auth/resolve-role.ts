/**
 * Resolve the current user's role for the current tenant from DB (tenant_user_assignments).
 * Superadmin remains from auth metadata; tenant users get role from tenant_user_assignments.
 */

import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import {
  getTenantUserByAuthUserId,
  getRoleForUserOnSite,
} from "@/lib/supabase/tenant-users";
import { getClientSchema } from "@/lib/supabase/schema";
import { getEffectiveFeatureSlugs } from "@/lib/supabase/feature-registry";

/**
 * Get the current user's role for the current tenant (NEXT_PUBLIC_CLIENT_SCHEMA).
 * - Superadmin: returns "superadmin" from metadata.
 * - Tenant user: looks up tenant_sites by schema, then tenant_user_assignments for this user/site; returns role_slug or null.
 * Use for sidebar, route guards, and effective features.
 */
export async function getRoleForCurrentUser(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (user.metadata.type === "superadmin" && user.metadata.role === "superadmin") {
    return "superadmin";
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

  return getRoleForUserOnSite(tenantUser.id, tenantSiteId);
}

/**
 * Get the current user's role for a specific tenant site (by id).
 * Useful when Superadmin is acting in a site context. Returns "superadmin" for superadmin; otherwise DB lookup.
 */
export async function getRoleForCurrentUserOnSite(tenantSiteId: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (user.metadata.type === "superadmin" && user.metadata.role === "superadmin") {
    return "superadmin";
  }

  const tenantUser = await getTenantUserByAuthUserId(user.id);
  if (!tenantUser) return null;

  return getRoleForUserOnSite(tenantUser.id, tenantSiteId);
}

/**
 * Effective feature slugs for the current user (for sidebar and route guards).
 * - Superadmin: returns "all" (allow everything).
 * - Tenant user: returns slug[] from getEffectiveFeatureSlugs(tenantSiteId, role).
 * - No user or no tenant/role: returns [].
 */
export async function getEffectiveFeatureSlugsForCurrentUser(): Promise<string[] | "all"> {
  const user = await getCurrentUser();
  if (!user) return [];

  if (user.metadata.type === "superadmin" && user.metadata.role === "superadmin") {
    return "all";
  }

  let tenantSiteId: string;
  try {
    const schema = getClientSchema();
    const site = await getTenantSiteBySchema(schema);
    if (!site) return [];
    tenantSiteId = site.id;
  } catch {
    return [];
  }

  const role = await getRoleForCurrentUser();
  if (!role) return [];

  return getEffectiveFeatureSlugs(tenantSiteId, role);
}
