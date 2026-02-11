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
  if (pathname === "/admin/media" || pathname.startsWith("/admin/media/")) return "library";
  if (pathname === "/admin/galleries" || pathname.startsWith("/admin/galleries/")) return "galleries";
  // CRM sub-routes: more specific first
  if (pathname.startsWith("/admin/crm/contacts")) return "contacts";
  if (pathname.startsWith("/admin/crm/forms/submissions")) return "form_submissions";
  if (pathname.startsWith("/admin/crm/forms")) return "forms";
  if (pathname.startsWith("/admin/crm/marketing")) return "marketing";
  if (pathname.startsWith("/admin/crm/lists")) return "lists";
  if (pathname.startsWith("/admin/crm/memberships/code-generator")) return "code_generator";
  if (pathname.startsWith("/admin/crm/memberships")) return "memberships";
  if (pathname.startsWith("/admin/crm/omnichat")) return "omnichat";
  if (pathname.startsWith("/admin/crm")) return "crm";
  // Events / Calendar
  if (pathname.startsWith("/admin/events/resources")) return "resources";
  if (pathname.startsWith("/admin/events")) return "events";
  if (pathname.startsWith("/admin/settings/profile")) return null; // My Profile always allowed for logged-in
  if (pathname.startsWith("/admin/settings/general")) return "general";
  if (pathname.startsWith("/admin/settings/style")) return "style";
  if (pathname.startsWith("/admin/settings/taxonomy")) return "taxonomy";
  if (pathname.startsWith("/admin/settings/customizer")) return "customizer";
  if (pathname.startsWith("/admin/settings/users")) return "users";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/support/knowledge-base")) return "knowledge_base";
  if (pathname.startsWith("/admin/support/quick-support")) return "quick_support";
  if (pathname.startsWith("/admin/support")) return "support";
  if (pathname.startsWith("/admin/super")) return "superadmin";

  return null;
}

/** Feature slugs that correspond to top-level sidebar sections (for filtering nav). */
export const SIDEBAR_FEATURE_MAP: Record<string, string> = {
  dashboard: "dashboard",
  omnichat: "omnichat",
  content: "content",
  media: "media",
  library: "library",
  galleries: "galleries",
  crm: "crm",
  contacts: "contacts",
  forms: "forms",
  form_submissions: "form_submissions",
  marketing: "marketing",
  lists: "lists",
  memberships: "memberships",
  code_generator: "code_generator",
  calendar: "calendar",
  events: "events",
  resources: "resources",
  settings: "settings",
  general: "general",
  style: "style",
  taxonomy: "taxonomy",
  customizer: "customizer",
  users: "users",
  support: "support",
  quick_support: "quick_support",
  knowledge_base: "knowledge_base",
  workhub: "workhub",
  superadmin: "superadmin",
};

/** Top-level slug that grants access to all sub-features. Sub-slug → parent slug. */
const FEATURE_PARENT_SLUG: Record<string, string> = {
  contacts: "crm",
  forms: "crm",
  form_submissions: "crm",
  memberships: "crm",
  code_generator: "crm",
  omnichat: "crm",
  lists: "marketing",
  galleries: "media",
  library: "media",
  events: "calendar",
  resources: "calendar",
  quick_support: "support",
  knowledge_base: "support",
  workhub: "support",
  general: "settings",
  style: "settings",
  taxonomy: "settings",
  customizer: "settings",
  users: "settings",
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
