/**
 * Feature registry + role feature access helpers (public schema).
 * Caller must enforce superadmin access for mutations.
 * Role slug: app layer uses PHP-Auth slug (website-cms-admin etc.); DB may still use legacy (admin). We normalize for query.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import type { AdminRole, FeatureRegistry } from "@/types/feature-registry";
import { phpAuthSlugToLegacySlug } from "@/lib/php-auth/role-mapping";

/** Slug for the Superadmin feature. Global, not toggleable in Roles or Tenant Features UI. */
export const SUPERADMIN_FEATURE_SLUG = "superadmin";

/** System roles that cannot be deleted (Admin, Editor, Creator, Viewer). */
export const SYSTEM_ROLE_SLUGS = ["admin", "editor", "creator", "viewer"] as const;

export function isSystemRole(slug: string): boolean {
  return (SYSTEM_ROLE_SLUGS as readonly string[]).includes(slug);
}

/** Exclude Superadmin from lists used for role/tenant feature toggles (it is always available). */
export function featuresForRoleOrTenantUI(features: FeatureRegistry[]): FeatureRegistry[] {
  return features.filter((f) => f.slug !== SUPERADMIN_FEATURE_SLUG);
}

/** Resolve Superadmin feature ID (for filtering out of role/tenant feature writes). */
export async function getSuperadminFeatureId(): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("feature_registry")
    .select("id")
    .eq("slug", SUPERADMIN_FEATURE_SLUG)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/** Order features: roots first, then each root's children, by display_order then label. */
export function orderedFeatures(features: FeatureRegistry[]): FeatureRegistry[] {
  const byOrderThenLabel = (a: FeatureRegistry, b: FeatureRegistry) =>
    a.display_order !== b.display_order
      ? a.display_order - b.display_order
      : (a.label || a.slug).localeCompare(b.label || b.slug);
  const roots = features.filter((f) => !f.parent_id).sort(byOrderThenLabel);
  const result: FeatureRegistry[] = [];
  for (const r of roots) {
    result.push(r);
    const children = features.filter((f) => f.parent_id === r.id).sort(byOrderThenLabel);
    result.push(...children);
  }
  const used = new Set(result.map((f) => f.id));
  const orphans = features.filter((f) => !used.has(f.id)).sort(byOrderThenLabel);
  result.push(...orphans);
  return result;
}

export async function listFeatures(includeDisabled = false): Promise<FeatureRegistry[]> {
  const supabase = createServerSupabaseClient();
  let q = supabase
    .from("feature_registry")
    .select("*")
    .order("display_order", { ascending: true })
    .order("label", { ascending: true });
  if (!includeDisabled) {
    q = q.eq("is_enabled", true);
  }
  const { data, error } = await q;
  if (error) {
    console.error("listFeatures:", error);
    return [];
  }
  return (data as FeatureRegistry[]) ?? [];
}

export async function listRoles(): Promise<AdminRole[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("admin_roles")
    .select("*")
    .order("slug", { ascending: true });
  if (error) {
    console.error("listRoles:", error);
    return [];
  }
  return (data as AdminRole[]) ?? [];
}

export async function getRoleBySlug(roleSlug: string): Promise<AdminRole | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("admin_roles")
    .select("*")
    .eq("slug", roleSlug)
    .maybeSingle();
  if (error) {
    console.error("getRoleBySlug:", error);
    return null;
  }
  return (data as AdminRole) ?? null;
}

export type CreateRoleInput = { slug: string; label: string; description?: string | null };

/** Create a new role (is_system: false). Caller must enforce superadmin. */
export async function createRole(input: CreateRoleInput): Promise<AdminRole | null> {
  const supabase = createServerSupabaseClient();
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, "_");
  if (!/^[a-z0-9_]+$/.test(slug)) return null;
  if (isSystemRole(slug)) return null;
  const { data, error } = await supabase
    .from("admin_roles")
    .insert({
      slug,
      label: input.label.trim() || slug,
      description: input.description?.trim() || null,
      is_system: false,
    })
    .select()
    .single();
  if (error) {
    console.error("createRole:", error);
    return null;
  }
  return data as AdminRole;
}

/** Delete a role only if it is not a system role. Caller must enforce superadmin. */
export async function deleteRole(roleSlug: string): Promise<boolean> {
  const role = await getRoleBySlug(roleSlug);
  if (!role) return false;
  if (role.is_system || isSystemRole(role.slug)) return false;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("admin_roles").delete().eq("slug", roleSlug);
  if (error) {
    console.error("deleteRole:", error);
    return false;
  }
  return true;
}

export async function listRoleFeatureIds(roleSlug: string): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const querySlug = roleSlug.startsWith("website-cms-") ? phpAuthSlugToLegacySlug(roleSlug) : roleSlug;
  const { data, error } = await supabase
    .from("role_features")
    .select("feature_id")
    .eq("role_slug", querySlug)
    .eq("is_enabled", true);
  if (error) {
    console.error("listRoleFeatureIds:", error);
    return [];
  }
  return (data ?? []).map((row: { feature_id: string }) => row.feature_id);
}

export async function setRoleFeatureIds(roleSlug: string, featureIds: string[]): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error: deleteError } = await supabase.from("role_features").delete().eq("role_slug", roleSlug);
  if (deleteError) {
    console.error("setRoleFeatureIds:delete", deleteError);
    return false;
  }
  if (featureIds.length === 0) return true;
  const payload = featureIds.map((featureId) => ({
    role_slug: roleSlug,
    feature_id: featureId,
    is_enabled: true,
  }));
  const { error: insertError } = await supabase.from("role_features").insert(payload);
  if (insertError) {
    console.error("setRoleFeatureIds:insert", insertError);
    return false;
  }
  return true;
}

/** Tenant feature toggles (superadmin sets per tenant). */
export async function listTenantFeatureIds(tenantId: string): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_features")
    .select("feature_id")
    .eq("tenant_id", tenantId);
  if (error) {
    console.error("listTenantFeatureIds:", error);
    return [];
  }
  return (data ?? []).map((row: { feature_id: string }) => row.feature_id);
}

export async function setTenantFeatureIds(tenantId: string, featureIds: string[]): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error: deleteError } = await supabase.from("tenant_features").delete().eq("tenant_id", tenantId);
  if (deleteError) {
    console.error("setTenantFeatureIds:delete", deleteError);
    return false;
  }
  if (featureIds.length === 0) return true;
  const payload = featureIds.map((featureId) => ({
    tenant_id: tenantId,
    feature_id: featureId,
  }));
  const { error: insertError } = await supabase.from("tenant_features").insert(payload);
  if (insertError) {
    console.error("setTenantFeatureIds:insert", insertError);
    return false;
  }
  return true;
}

/** M5 C5: Tenant feature gating by slug (PHP-Auth feature_registry). */
export async function listTenantFeatureSlugs(tenantId: string): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_feature_slugs")
    .select("feature_slug")
    .eq("tenant_id", tenantId);
  if (error) {
    console.error("listTenantFeatureSlugs:", error);
    return [];
  }
  return (data ?? []).map((row: { feature_slug: string }) => row.feature_slug);
}

/** M5 C5: Set tenant enabled features by slug. Replaces existing rows for this tenant. */
export async function setTenantFeatureSlugs(tenantId: string, slugs: string[]): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error: deleteError } = await supabase
    .from("tenant_feature_slugs")
    .delete()
    .eq("tenant_id", tenantId);
  if (deleteError) {
    console.error("setTenantFeatureSlugs:delete", deleteError);
    return false;
  }
  const trimmed = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (trimmed.length === 0) return true;
  const payload = trimmed.map((feature_slug) => ({ tenant_id: tenantId, feature_slug }));
  const { error: insertError } = await supabase.from("tenant_feature_slugs").insert(payload);
  if (insertError) {
    console.error("setTenantFeatureSlugs:insert", insertError);
    return false;
  }
  return true;
}

/** Role feature slugs (from role_features + feature_registry). Used for effective-feature intersection. */
export async function listRoleFeatureSlugs(roleSlug: string): Promise<string[]> {
  const ids = await listRoleFeatureIds(roleSlug);
  if (ids.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("feature_registry")
    .select("slug")
    .in("id", ids);
  if (error) {
    console.error("listRoleFeatureSlugs:", error);
    return [];
  }
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

/**
 * Effective features for a user = tenant features ∩ role features.
 * Use for sidebar and route guards. Returns feature IDs the user is allowed to access.
 */
export async function getEffectiveFeatures(
  tenantId: string,
  roleSlug: string
): Promise<string[]> {
  const [tenantIds, roleIds] = await Promise.all([
    listTenantFeatureIds(tenantId),
    listRoleFeatureIds(roleSlug),
  ]);
  const roleSet = new Set(roleIds);
  return tenantIds.filter((id) => roleSet.has(id));
}

/**
 * Effective feature slugs for a user (tenant ∩ role). Use for sidebar and route guards.
 * M5 C5: Prefers tenant_feature_slugs when non-empty; else falls back to tenant_features (ids → slugs).
 */
export async function getEffectiveFeatureSlugs(
  tenantId: string,
  roleSlug: string
): Promise<string[]> {
  const [tenantSlugs, roleSlugs] = await Promise.all([
    getTenantFeatureSlugsForEffective(tenantId),
    listRoleFeatureSlugs(roleSlug),
  ]);
  const roleSet = new Set(roleSlugs);
  return tenantSlugs.filter((slug) => roleSet.has(slug));
}

/** Tenant-enabled feature slugs: from tenant_feature_slugs if any; else resolve tenant_features IDs to slugs. */
export async function getTenantEnabledFeatureSlugs(tenantId: string): Promise<string[]> {
  const slugList = await listTenantFeatureSlugs(tenantId);
  if (slugList.length > 0) return slugList;
  const ids = await listTenantFeatureIds(tenantId);
  if (ids.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("feature_registry")
    .select("slug")
    .in("id", ids);
  if (error) {
    console.error("getTenantEnabledFeatureSlugs:", error);
    return [];
  }
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

async function getTenantFeatureSlugsForEffective(tenantId: string): Promise<string[]> {
  return getTenantEnabledFeatureSlugs(tenantId);
}
