/**
 * Tenant users and assignments (public.tenant_users, public.tenant_user_assignments).
 * Caller must enforce superadmin or tenant admin access as appropriate.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import type {
  TenantUser,
  TenantUserInsert,
  TenantUserUpdate,
  TenantUserWithAssignment,
} from "@/types/tenant-users";

export async function listTenantUsers(status?: string | null): Promise<TenantUser[]> {
  const supabase = createServerSupabaseClient();
  let q = supabase
    .from("tenant_users")
    .select("*")
    .order("email", { ascending: true });
  if (status?.trim()) {
    q = q.eq("status", status.trim());
  }
  const { data, error } = await q;
  if (error) {
    console.error("listTenantUsers:", error);
    return [];
  }
  return (data as TenantUser[]) ?? [];
}

export async function getTenantUserById(id: string): Promise<TenantUser | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as TenantUser;
}

export async function getTenantUserByAuthUserId(authUserId: string): Promise<TenantUser | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .select("*")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (error || !data) return null;
  return data as TenantUser;
}

export async function getTenantUserByEmail(email: string): Promise<TenantUser | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as TenantUser;
}

export async function createTenantUser(row: TenantUserInsert): Promise<TenantUser | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .insert({
      user_id: row.user_id,
      email: row.email.trim().toLowerCase(),
      display_name: row.display_name?.trim() || null,
      status: row.status?.trim() || "active",
      notes: row.notes?.trim() || null,
    })
    .select()
    .single();
  if (error) {
    console.error("createTenantUser:", error);
    return null;
  }
  return data as TenantUser;
}

export async function updateTenantUser(id: string, row: TenantUserUpdate): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (row.email !== undefined) payload.email = row.email.trim().toLowerCase();
  if (row.display_name !== undefined) payload.display_name = row.display_name?.trim() || null;
  if (row.status !== undefined) payload.status = row.status?.trim();
  if (row.notes !== undefined) payload.notes = row.notes?.trim() || null;
  if (Object.keys(payload).length === 0) return true;
  const { error } = await supabase.from("tenant_users").update(payload).eq("id", id);
  if (error) {
    console.error("updateTenantUser:", error);
    return false;
  }
  return true;
}

/** List users assigned to a tenant site (with role and is_owner). */
export async function listUsersByTenantSite(tenantSiteId: string): Promise<TenantUserWithAssignment[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_user_assignments")
    .select(`
      admin_id,
      tenant_id,
      role_slug,
      is_owner,
      created_at,
      tenant_users!inner (
        id,
        user_id,
        email,
        display_name,
        status
      )
    `)
    .eq("tenant_id", tenantSiteId);
  if (error) {
    console.error("listUsersByTenantSite:", error);
    return [];
  }
  const rows = (data ?? []) as Array<{
    admin_id: string;
    tenant_id: string;
    role_slug: string;
    is_owner: boolean;
    created_at: string;
    tenant_users: TenantUser | null;
  }>;
  return rows
    .filter((r) => r.tenant_users)
    .map((r) => ({
      id: (r.tenant_users as TenantUser).id,
      user_id: (r.tenant_users as TenantUser).user_id,
      email: (r.tenant_users as TenantUser).email,
      display_name: (r.tenant_users as TenantUser).display_name,
      status: (r.tenant_users as TenantUser).status,
      tenant_id: r.tenant_id,
      role_slug: r.role_slug,
      is_owner: r.is_owner ?? false,
    }));
}

/** Assign a tenant user to a site with a role. Idempotent: upserts. Only superadmin should pass isOwner true. */
export async function assignUserToSite(
  tenantUserId: string,
  tenantSiteId: string,
  roleSlug: string,
  isOwner?: boolean
): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("tenant_user_assignments").upsert(
    {
      admin_id: tenantUserId,
      tenant_id: tenantSiteId,
      role_slug: roleSlug.trim(),
      is_owner: isOwner === true,
    },
    { onConflict: "admin_id,tenant_id" }
  );
  if (error) {
    console.error("assignUserToSite:", error);
    return false;
  }
  return true;
}

/** Remove a tenant user from a site. */
export async function removeUserFromSite(
  tenantUserId: string,
  tenantSiteId: string
): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("tenant_user_assignments")
    .delete()
    .eq("admin_id", tenantUserId)
    .eq("tenant_id", tenantSiteId);
  if (error) {
    console.error("removeUserFromSite:", error);
    return false;
  }
  return true;
}

/** Get role for a tenant user on a specific site. Returns null if not assigned. */
export async function getRoleForUserOnSite(
  tenantUserId: string,
  tenantSiteId: string
): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_user_assignments")
    .select("role_slug")
    .eq("admin_id", tenantUserId)
    .eq("tenant_id", tenantSiteId)
    .maybeSingle();
  if (error || !data) return null;
  return data.role_slug as string;
}

/** Get assignment (role + is_owner) for a tenant user on a site. Returns null if not assigned. */
export async function getAssignmentByAdminAndTenant(
  adminId: string,
  tenantSiteId: string
): Promise<{ role_slug: string; is_owner: boolean } | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_user_assignments")
    .select("role_slug, is_owner")
    .eq("admin_id", adminId)
    .eq("tenant_id", tenantSiteId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    role_slug: data.role_slug as string,
    is_owner: data.is_owner === true,
  };
}

/** List all assignments across all sites (for global Tenant Users table). Each row = one user-site-role. */
export async function listAllAssignments(): Promise<TenantUserWithAssignment[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_user_assignments")
    .select(`
      admin_id,
      tenant_id,
      role_slug,
      is_owner,
      created_at,
      tenant_users!inner (
        id,
        user_id,
        email,
        display_name,
        status
      ),
      tenant_sites!inner (
        name
      )
    `)
    .order("tenant_id", { ascending: true })
    .order("role_slug", { ascending: true });
  if (error) {
    console.error("listAllAssignments:", error);
    return [];
  }
  const rows = (data ?? []) as Array<{
    admin_id: string;
    tenant_id: string;
    role_slug: string;
    is_owner: boolean;
    created_at: string;
    tenant_users: TenantUser | null;
    tenant_sites: { name: string } | null;
  }>;
  return rows
    .filter((r) => r.tenant_users)
    .map((r) => ({
      id: (r.tenant_users as TenantUser).id,
      user_id: (r.tenant_users as TenantUser).user_id,
      email: (r.tenant_users as TenantUser).email,
      display_name: (r.tenant_users as TenantUser).display_name,
      status: (r.tenant_users as TenantUser).status,
      tenant_id: r.tenant_id,
      tenant_name: r.tenant_sites?.name ?? undefined,
      role_slug: r.role_slug,
      is_owner: r.is_owner ?? false,
    }));
}
