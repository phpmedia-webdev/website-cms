/**
 * Types for tenant site registry (public.tenant_sites).
 */

export interface TenantSite {
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
  coming_soon_message: string | null;
  coming_soon_snippet_id: string | null;
  membership_enabled: boolean;
  github_repo: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface TenantSiteInsert {
  name: string;
  slug: string;
  schema_name: string;
  deployment_url?: string | null;
  description?: string | null;
  status?: string;
  site_mode?: string;
  coming_soon_message?: string | null;
  coming_soon_snippet_id?: string | null;
  github_repo?: string | null;
  notes?: string | null;
}

export interface TenantSiteUpdate {
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
  coming_soon_message?: string | null;
  coming_soon_snippet_id?: string | null;
  membership_enabled?: boolean;
  github_repo?: string | null;
  notes?: string | null;
}
