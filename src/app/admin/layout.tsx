import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { AdminLayoutWrapper } from "@/components/admin/AdminLayoutWrapper";
import { getRoleForCurrentUser, getEffectiveFeatureSlugsForCurrentUser, getRoleFeatureSlugsForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema, getTenantSiteById } from "@/lib/supabase/tenant-sites";
import { getEffectiveFeatureSlugs, getTenantEnabledFeatureSlugs, listRoleFeatureSlugs } from "@/lib/supabase/feature-registry";
import { getViewAsFromCookies } from "@/lib/admin/view-as";

// Ensure layout always reads cookies and never serves cached "all" when view-as is active
export const dynamic = "force-dynamic";

/**
 * Admin layout for all /admin/* routes.
 *
 * Fetches site name, role, and effective feature slugs for the header, sidebar, and route guards.
 * When superadmin has "View as Role + Site" active (cookie), overrides with that tenant+role for testing.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  // Superadmin visibility (sidebar): use central role (getRoleForCurrentUser) so PHP-Auth is SSOT when configured.
  let userIsSuperadmin = false;
  if (user) {
    try {
      const role = await getRoleForCurrentUser();
      userIsSuperadmin = isSuperadminFromRole(role);
    } catch {
      userIsSuperadmin = false;
    }
  }

  let siteName: string | null = null;
  let role: string | null = null;
  let effectiveFeatureSlugs: string[] | "all" = [];
  let roleFeatureSlugs: string[] | "all" = [];
  /** When set, sidebar uses this for display only (ghost state) so superadmin sees gate state; guards still use effectiveFeatureSlugs. */
  let sidebarDisplayFeatureSlugs: string[] | null = null;
  let viewAsActive = false;
  let viewAsSiteName: string | null = null;
  let viewAsRole: string | null = null;

  if (user) {
    const cookieStore = await cookies();
    const viewAs = userIsSuperadmin ? getViewAsFromCookies(cookieStore) : null;

    if (viewAs) {
      const viewAsSite = await getTenantSiteById(viewAs.siteId);
      if (viewAsSite) {
        viewAsActive = true;
        viewAsSiteName = viewAsSite.name;
        viewAsRole = viewAs.roleSlug;
        siteName = viewAsSite.name;
        role = viewAs.roleSlug;
        try {
          const [effSlugs, roleSlugs] = await Promise.all([
            getEffectiveFeatureSlugs(viewAs.siteId, viewAs.roleSlug),
            listRoleFeatureSlugs(viewAs.roleSlug),
          ]);
          effectiveFeatureSlugs = Array.isArray(effSlugs) ? effSlugs : [];
          roleFeatureSlugs = Array.isArray(roleSlugs) ? roleSlugs : [];
        } catch {
          effectiveFeatureSlugs = [];
          roleFeatureSlugs = [];
        }
      }
    }

    if (!viewAsActive) {
      try {
        role = await getRoleForCurrentUser();
        const schema = getClientSchema();
        const site = await getTenantSiteBySchema(schema);
        siteName = site?.name ?? null;
        [effectiveFeatureSlugs, roleFeatureSlugs] = await Promise.all([
          getEffectiveFeatureSlugsForCurrentUser(),
          getRoleFeatureSlugsForCurrentUser(),
        ]);
        if (userIsSuperadmin && site) {
          sidebarDisplayFeatureSlugs = await getTenantEnabledFeatureSlugs(site.id);
        }
      } catch {
        if (userIsSuperadmin) {
          role = "superadmin";
          effectiveFeatureSlugs = "all";
          roleFeatureSlugs = "all";
        }
      }
    }
  } else {
    // No user (login/forgot/reset pages): still resolve tenant site name for branding
    try {
      const schema = getClientSchema();
      const site = await getTenantSiteBySchema(schema);
      siteName = site?.name ?? null;
    } catch {
      siteName = null;
    }
  }

  const canManageTeam = !!user && (userIsSuperadmin || role === "admin");

  return (
    <AdminLayoutWrapper
      isSuperadmin={userIsSuperadmin}
      siteName={siteName}
      role={role}
      effectiveFeatureSlugs={effectiveFeatureSlugs}
      roleFeatureSlugs={roleFeatureSlugs}
      sidebarDisplayFeatureSlugs={sidebarDisplayFeatureSlugs}
      viewAsActive={viewAsActive}
      viewAsSiteName={viewAsSiteName}
      viewAsRole={viewAsRole}
      canManageTeam={canManageTeam}
    >
      {children}
    </AdminLayoutWrapper>
  );
}
