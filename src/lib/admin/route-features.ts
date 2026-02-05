/**
 * Map admin pathname to the primary feature slug for route guards.
 * Used to decide if the current user has access to the current page.
 */

/**
 * Returns the feature slug required to access this path, or null if no guard (e.g. login, dashboard root).
 */
export function pathToFeatureSlug(pathname: string | null): string | null {
  if (!pathname || !pathname.startsWith("/admin")) return null;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return null;
  if (pathname === "/admin" || pathname === "/admin/") return null;
  // Dashboard is always allowed as the safe landing page when redirecting from a blocked route.
  if (pathname === "/admin/dashboard" || pathname.startsWith("/admin/dashboard/")) return null;

  if (pathname === "/admin/content" || pathname.startsWith("/admin/content/")) return "content";
  if (pathname === "/admin/media" || pathname.startsWith("/admin/media/")) return "media";
  if (pathname === "/admin/galleries" || pathname.startsWith("/admin/galleries/")) return "galleries";
  // CRM sub-routes: each has its own feature slug (order matters: more specific first)
  if (pathname.startsWith("/admin/crm/contacts")) return "contacts";
  if (pathname.startsWith("/admin/crm/forms")) return "forms";
  if (pathname.startsWith("/admin/crm/marketing")) return "marketing";
  if (pathname.startsWith("/admin/crm/lists")) return "marketing";
  if (pathname.startsWith("/admin/crm/memberships/code-generator")) return "code_generator";
  if (pathname.startsWith("/admin/crm/memberships")) return "memberships";
  if (pathname.startsWith("/admin/crm")) return "crm";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/super")) return "superadmin";

  return null;
}

/** Feature slugs that correspond to top-level sidebar sections (for filtering nav). */
export const SIDEBAR_FEATURE_MAP: Record<string, string> = {
  dashboard: "dashboard",
  content: "content",
  media: "media",
  galleries: "galleries",
  crm: "crm",
  contacts: "contacts",
  forms: "forms",
  marketing: "marketing",
  memberships: "memberships",
  code_generator: "code_generator",
  settings: "settings",
  superadmin: "superadmin",
};

/** Top-level slug that grants access to all sub-features. Sub-slug → parent slug. */
const FEATURE_PARENT_SLUG: Record<string, string> = {
  contacts: "crm",
  forms: "crm",
  marketing: "crm",
  memberships: "crm",
  code_generator: "crm",
  galleries: "media",
  library: "media",
};

/**
 * Whether the user can access a section.
 * Top-level ON = access to that slug and all its sub-items.
 * Sub-item visible/allowed if: user has top-level OR user has that sub-item's slug.
 */
export function canAccessFeature(
  effectiveSlugs: string[] | "all",
  requiredSlug: string
): boolean {
  if (effectiveSlugs === "all") return true;
  if (requiredSlug === "superadmin") return false; // superadmin section is gated by isSuperadmin, not features
  if (effectiveSlugs.includes(requiredSlug)) return true;
  const parentSlug = FEATURE_PARENT_SLUG[requiredSlug];
  if (parentSlug && effectiveSlugs.includes(parentSlug)) return true;
  return false;
}
