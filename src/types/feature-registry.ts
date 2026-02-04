/**
 * Types for feature registry and role feature mapping (public schema).
 */

export interface FeatureRegistry {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  parent_id: string | null;
  group_slug: string | null;
  display_order: number;
  is_core: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminRole {
  slug: string;
  label: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleFeature {
  role_slug: string;
  feature_id: string;
  is_enabled: boolean;
  created_at: string;
}

