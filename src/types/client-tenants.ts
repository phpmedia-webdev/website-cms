/**
 * Types for client/tenant registry (public.client_tenants).
 */

export interface ClientTenant {
  id: string;
  name: string;
  slug: string;
  schema_name: string;
  deployment_url: string | null;
  description: string | null;
  status: string;
  site_mode: string;
  site_mode_locked: boolean;
  site_mode_locked_by: string | null;
  site_mode_locked_at: string | null;
  site_mode_locked_reason: string | null;
  github_repo: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface ClientTenantInsert {
  name: string;
  slug: string;
  schema_name: string;
  deployment_url?: string | null;
  description?: string | null;
  status?: string;
  site_mode?: string;
  github_repo?: string | null;
  notes?: string | null;
}

export interface ClientTenantUpdate {
  name?: string;
  slug?: string;
  schema_name?: string;
  deployment_url?: string | null;
  description?: string | null;
  status?: string;
  site_mode?: string;
  site_mode_locked?: boolean;
  site_mode_locked_by?: string | null;
  site_mode_locked_at?: string | null;
  site_mode_locked_reason?: string | null;
  github_repo?: string | null;
  notes?: string | null;
}
