/**
 * Types for tenant users and assignments (public.tenant_users, public.tenant_user_assignments).
 */

export interface TenantUser {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface TenantUserInsert {
  user_id: string;
  email: string;
  display_name?: string | null;
  status?: string;
  notes?: string | null;
}

export interface TenantUserUpdate {
  email?: string;
  display_name?: string | null;
  status?: string;
  notes?: string | null;
}

/** One row in tenant_user_assignments: user assigned to a site with a role. */
export interface TenantUserAssignment {
  admin_id: string;
  tenant_id: string;
  role_slug: string;
  is_owner: boolean;
  created_at: string;
}

/** For list views: tenant user plus site name and role (from join). */
export interface TenantUserWithAssignment {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  status: string;
  tenant_id: string;
  tenant_name?: string;
  role_slug: string;
  is_owner?: boolean;
}
