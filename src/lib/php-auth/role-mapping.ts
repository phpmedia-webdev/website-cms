/**
 * Use the PHP-Auth role slug as the single reference in website-cms.
 * PHP-Auth is SSOT for roles, permissions, and feature assignments; the slug is unique for this application type.
 * We do not maintain a separate "internal" slug — we use and reference the PHP-Auth slug everywhere.
 *
 * If validate-user returns roleName (e.g. "Website-CMS-Admin") we convert to PHP-Auth slug (website-cms-admin).
 * If it returns roleSlug we use it as-is.
 *
 * Official PHP-Auth slugs for website-cms application type:
 *   Website-CMS-SuperAdmin / website-cms-superadmin
 *   Website-CMS-Admin       / website-cms-admin
 *   Website-CMS-Editor      / website-cms-editor
 *   Website-CMS-Creator     / website-cms-creator
 *   Website-CMS-GPUM        / website-cms-gpum  (CRM members only — authenticated members, not admin users)
 * (Viewer not in list; if PHP-Auth adds it, use website-cms-viewer.)
 */

/** PHP-Auth role slugs for website-cms (use these everywhere instead of legacy admin/editor/creator/viewer/superadmin). */
export const PHP_AUTH_ROLE_SLUG = {
  SUPERADMIN: "website-cms-superadmin",
  ADMIN: "website-cms-admin",
  EDITOR: "website-cms-editor",
  CREATOR: "website-cms-creator",
  VIEWER: "website-cms-viewer",
  GPUM: "website-cms-gpum",
} as const;

/** All website-cms PHP-Auth role slugs. */
export const PHP_AUTH_ROLE_SLUGS = Object.values(PHP_AUTH_ROLE_SLUG);

/** Admin-style roles (sidebar, dashboard, team management). GPUM is excluded — it is for CRM members, not admin users. */
export const PHP_AUTH_ADMIN_ROLE_SLUGS = [
  PHP_AUTH_ROLE_SLUG.SUPERADMIN,
  PHP_AUTH_ROLE_SLUG.ADMIN,
  PHP_AUTH_ROLE_SLUG.EDITOR,
  PHP_AUTH_ROLE_SLUG.CREATOR,
  PHP_AUTH_ROLE_SLUG.VIEWER,
] as const;

/** True if the role is the member role (CRM members who authenticate as members, not admin dashboard users). */
export function isMemberRole(roleSlug: string): boolean {
  return (roleSlug ?? "").trim() === PHP_AUTH_ROLE_SLUG.GPUM;
}

/** Map role name (from validate-user roleName) to PHP-Auth slug. */
const ROLE_NAME_TO_PHP_AUTH_SLUG: Record<string, string> = {
  "Website-CMS-SuperAdmin": PHP_AUTH_ROLE_SLUG.SUPERADMIN,
  "Website-CMS-Admin": PHP_AUTH_ROLE_SLUG.ADMIN,
  "Website-CMS-Editor": PHP_AUTH_ROLE_SLUG.EDITOR,
  "Website-CMS-Creator": PHP_AUTH_ROLE_SLUG.CREATOR,
  "Website-CMS-GPUM": PHP_AUTH_ROLE_SLUG.GPUM,
  "Website-CMS-Viewer": PHP_AUTH_ROLE_SLUG.VIEWER,
  // Legacy/display names (if API sends these)
  Superadmin: PHP_AUTH_ROLE_SLUG.SUPERADMIN,
  "Website CMS Superadmin": PHP_AUTH_ROLE_SLUG.SUPERADMIN,
  Admin: PHP_AUTH_ROLE_SLUG.ADMIN,
  Editor: PHP_AUTH_ROLE_SLUG.EDITOR,
  Creator: PHP_AUTH_ROLE_SLUG.CREATOR,
  Viewer: PHP_AUTH_ROLE_SLUG.VIEWER,
  GPUM: PHP_AUTH_ROLE_SLUG.GPUM,
};

/**
 * Normalize to PHP-Auth role slug. Use this slug everywhere in website-cms (no separate internal slug).
 * - If validate-user returns roleSlug, pass it through; if it's already a known PHP-Auth slug we return as-is.
 * - If it returns roleName, we convert to PHP-Auth slug.
 */
export function toPhpAuthRoleSlug(roleNameOrSlug: string): string {
  const trimmed = (roleNameOrSlug ?? "").trim();
  const mapped = ROLE_NAME_TO_PHP_AUTH_SLUG[trimmed];
  if (mapped) return mapped;
  if (PHP_AUTH_ROLE_SLUGS.includes(trimmed)) return trimmed;
  return trimmed.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-") || trimmed;
}

/** Map legacy website-cms role_slug (from tenant_user_assignments fallback) to PHP-Auth slug so app always uses PHP-Auth slug. */
const LEGACY_SLUG_TO_PHP_AUTH: Record<string, string> = {
  superadmin: PHP_AUTH_ROLE_SLUG.SUPERADMIN,
  admin: PHP_AUTH_ROLE_SLUG.ADMIN,
  editor: PHP_AUTH_ROLE_SLUG.EDITOR,
  creator: PHP_AUTH_ROLE_SLUG.CREATOR,
  viewer: PHP_AUTH_ROLE_SLUG.VIEWER,
  gpum: PHP_AUTH_ROLE_SLUG.GPUM,
};

/** Convert legacy role_slug (from DB fallback) to PHP-Auth slug. Use when dual-read fallback returns legacy slug. */
export function legacySlugToPhpAuthSlug(legacySlug: string): string {
  const s = (legacySlug ?? "").trim().toLowerCase();
  return LEGACY_SLUG_TO_PHP_AUTH[s] ?? toPhpAuthRoleSlug(legacySlug);
}

/** Reverse: PHP-Auth slug → legacy slug for DB queries during transition (admin_roles, role_features still use legacy). Remove when DB is migrated to PHP-Auth slugs. */
export function phpAuthSlugToLegacySlug(phpAuthSlug: string): string {
  const s = (phpAuthSlug ?? "").trim();
  const legacy: Record<string, string> = {
    [PHP_AUTH_ROLE_SLUG.SUPERADMIN]: "superadmin",
    [PHP_AUTH_ROLE_SLUG.ADMIN]: "admin",
    [PHP_AUTH_ROLE_SLUG.EDITOR]: "editor",
    [PHP_AUTH_ROLE_SLUG.CREATOR]: "creator",
    [PHP_AUTH_ROLE_SLUG.VIEWER]: "viewer",
    [PHP_AUTH_ROLE_SLUG.GPUM]: "gpum",
  };
  return legacy[s] ?? s;
}

/**
 * @deprecated Use toPhpAuthRoleSlug. Kept for backward compatibility during transition.
 */
export function phpAuthRoleNameToSlug(roleNameOrSlug: string): string {
  return toPhpAuthRoleSlug(roleNameOrSlug);
}
