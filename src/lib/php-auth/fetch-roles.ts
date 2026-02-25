/**
 * M5: Fetch roles from PHP-Auth for role picker (Superadmin Users, Settings → Users).
 * SSOT only — no fallback. Returns [] when PHP-Auth is not configured, request fails, or returns no roles.
 *
 * Calls GET {AUTH_BASE_URL}/api/external/roles (optionally ?scope=...) with header X-API-Key only.
 * If AUTH_ROLES_SCOPE is set, appends ?scope=<value>; otherwise omits scope so PHP-Auth derives from the API key
 * (avoids 403 when the Application type in PHP-Auth is not yet "website-cms"). Response: { success: true, data: { roles: [ ... ] } }.
 * See docs/reference/php-auth-external-roles-api.md.
 */

import { getPhpAuthConfig } from "./config";
import { type RoleOption, isMemberRole } from "./role-mapping";

/** Application-type scope in PHP-Auth for this app. Used only when AUTH_ROLES_SCOPE is set. */
export const PHP_AUTH_WEBSITE_CMS_SCOPE = "website-cms";

export interface PhpAuthRoleItem {
  id?: string;
  name?: string;
  slug: string;
  label: string;
}

/** Feature or permission item in roles API response (slug, label, parentSlug, isEnabled). */
export interface PhpAuthFeatureOrPermissionItem {
  slug: string;
  label: string;
  /** Parent feature or permission slug; null for top-level. Use to build hierarchy. */
  parentSlug: string | null;
  isEnabled?: boolean;
}

/** Tree node for hierarchical display (sort order: roots first, then children under parent). */
export interface PhpAuthFeatureOrPermissionTreeNode {
  slug: string;
  label: string;
  isEnabled?: boolean;
  children: PhpAuthFeatureOrPermissionTreeNode[];
}

/** Role with features and permissions for read-only display (Superadmin Roles list/detail). */
export interface PhpAuthRoleWithDetails extends PhpAuthRoleItem {
  features: PhpAuthFeatureOrPermissionItem[];
  permissions: PhpAuthFeatureOrPermissionItem[];
}

function parseFeatureOrPermissionList(arr: unknown): PhpAuthFeatureOrPermissionItem[] {
  if (!Array.isArray(arr)) return [];
  const result: PhpAuthFeatureOrPermissionItem[] = [];
  for (const item of arr) {
    if (item === null || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (!slug) continue;
    const label = typeof row.label === "string" ? row.label.trim() : (typeof row.name === "string" ? (row.name as string).trim() : slug);
    const isEnabled = typeof row.isEnabled === "boolean" ? row.isEnabled : typeof (row as Record<string, unknown>).is_enabled === "boolean" ? (row as Record<string, unknown>).is_enabled as boolean : true;
    const parentSlugRaw = row.parentSlug ?? (row as Record<string, unknown>).parent_slug ?? row.parent_id;
    const parentSlug =
      parentSlugRaw === null || parentSlugRaw === undefined
        ? null
        : typeof parentSlugRaw === "string" && parentSlugRaw.trim() !== ""
          ? parentSlugRaw.trim()
          : null;
    result.push({ slug, label: label || slug, parentSlug, isEnabled });
  }
  return result;
}

/**
 * Build a tree from a flat list of features or permissions (with parentSlug).
 * Preserves array order: roots first (parentSlug null), then children under each parent in original order.
 */
export function buildFeatureOrPermissionTree(
  items: PhpAuthFeatureOrPermissionItem[]
): PhpAuthFeatureOrPermissionTreeNode[] {
  if (!items.length) return [];
  const bySlug = new Map<string, PhpAuthFeatureOrPermissionTreeNode>();
  for (const item of items) {
    bySlug.set(item.slug, {
      slug: item.slug,
      label: item.label,
      isEnabled: item.isEnabled,
      children: [],
    });
  }
  const roots: PhpAuthFeatureOrPermissionTreeNode[] = [];
  const order = items.map((i) => i.slug);
  for (const item of items) {
    const node = bySlug.get(item.slug)!;
    if (item.parentSlug === null || item.parentSlug === "" || !bySlug.has(item.parentSlug)) {
      roots.push(node);
    } else {
      const parent = bySlug.get(item.parentSlug);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  const sortByOrder = (a: PhpAuthFeatureOrPermissionTreeNode, b: PhpAuthFeatureOrPermissionTreeNode) =>
    order.indexOf(a.slug) - order.indexOf(b.slug);
  roots.sort(sortByOrder);
  for (const node of bySlug.values()) {
    if (node.children.length) node.children.sort(sortByOrder);
  }
  return roots;
}

function parseRolesResponse(data: unknown): RoleOption[] | null {
  if (data === null || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const roles = d.roles ?? d.data;
  if (!Array.isArray(roles)) return null;
  const result: RoleOption[] = [];
  for (const r of roles) {
    if (r === null || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : (typeof row.name === "string" ? row.name.trim() : slug);
    if (slug) result.push({ slug, label: label || slug });
  }
  return result.length ? result : null;
}

/**
 * Fetch roles for this app from PHP-Auth (scope website-cms). SSOT only — no fallback.
 * Excludes GPUM so the result is suitable for admin assignment dropdowns.
 * Returns [] when PHP-Auth is not configured, request fails, or returns no roles.
 */
export async function getRolesForAssignmentFromPhpAuth(): Promise<RoleOption[]> {
  const config = getPhpAuthConfig();
  if (!config) return [];

  const scope =
    process.env.AUTH_ROLES_SCOPE !== undefined && process.env.AUTH_ROLES_SCOPE !== ""
      ? process.env.AUTH_ROLES_SCOPE
      : PHP_AUTH_WEBSITE_CMS_SCOPE;
  let url = `${config.baseUrl}/${config.rolesPath}?scope=${encodeURIComponent(scope)}`;
  if (process.env.AUTH_ROLES_NOCACHE === "1" || process.env.AUTH_ROLES_NOCACHE === "true") {
    url += `&_t=${Date.now()}`;
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const rawText = await res.text();
    if (!res.ok) return [];
    let json: Record<string, unknown> | null = null;
    try {
      json = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
    } catch {
      return [];
    }
    if (!json) return [];
    const top = json as Record<string, unknown>;
    const data = top.data ?? top;
    let roles = Array.isArray(data) ? parseRolesResponse({ roles: data }) : parseRolesResponse(data);
    if (!roles?.length && Array.isArray(top.roles)) {
      roles = parseRolesResponse({ roles: top.roles });
    }
    if (!roles || roles.length === 0) return [];
    return roles.filter((r) => !isMemberRole(r.slug));
  } catch {
    return [];
  }
}

/**
 * Fetch roles with features and permissions for read-only display (Superadmin Roles list and detail).
 * Same endpoint as getRolesForAssignmentFromPhpAuth; parses full role shape including features and permissions arrays.
 * Excludes GPUM. Returns [] when not configured or request fails.
 *
 * Parser alignment (PHP-Auth contract): Response is { success, data } with data.roles = array.
 * Each role: { id, name, slug, label, features, permissions }. Features/permissions: [ { slug, label, isEnabled }, ... ].
 */
export async function getRolesWithDetailsFromPhpAuth(): Promise<PhpAuthRoleWithDetails[]> {
  const config = getPhpAuthConfig();
  if (!config) return [];

  const scope =
    process.env.AUTH_ROLES_SCOPE !== undefined && process.env.AUTH_ROLES_SCOPE !== ""
      ? process.env.AUTH_ROLES_SCOPE
      : PHP_AUTH_WEBSITE_CMS_SCOPE;
  let url = `${config.baseUrl}/${config.rolesPath}?scope=${encodeURIComponent(scope)}`;
  if (process.env.AUTH_ROLES_NOCACHE === "1" || process.env.AUTH_ROLES_NOCACHE === "true") {
    url += `&_t=${Date.now()}`;
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rawText = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
    } catch {
      return [];
    }
    if (!json) return [];

    const top = json as Record<string, unknown>;
    // Response: { success, data: { roles: [ { id, name, slug, label, features, permissions }, ... ] } }
    const data = top.data as Record<string, unknown> | undefined;
    const rolesRaw: unknown[] = Array.isArray(data?.roles)
      ? data.roles
      : Array.isArray(top.roles)
        ? (top.roles as unknown[])
        : [];
    if (!rolesRaw.length) return [];

    const result: PhpAuthRoleWithDetails[] = [];
    for (const r of rolesRaw) {
      if (r === null || typeof r !== "object") continue;
      const row = r as Record<string, unknown>;
      const slug = typeof row.slug === "string" ? row.slug.trim() : "";
      if (!slug || isMemberRole(slug)) continue;
      const label = typeof row.label === "string" ? row.label.trim() : (typeof row.name === "string" ? (row.name as string).trim() : slug);
      const features = parseFeatureOrPermissionList(row.features);
      const permissions = parseFeatureOrPermissionList(row.permissions);
      result.push({
        id: typeof row.id === "string" ? row.id : undefined,
        name: typeof row.name === "string" ? (row.name as string) : undefined,
        slug,
        label: label || slug,
        features,
        permissions,
      });
    }
    return result;
  } catch {
    return [];
  }
}
