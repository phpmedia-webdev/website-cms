import { cookies } from "next/headers";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { AdminLayoutWrapper } from "@/components/admin/AdminLayoutWrapper";
import { getRoleForCurrentUser, getEffectiveFeatureSlugsForCurrentUser } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema, getTenantSiteById } from "@/lib/supabase/tenant-sites";
import { getEffectiveFeatureSlugs } from "@/lib/supabase/feature-registry";
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

  const userIsSuperadmin = user ? isSuperadmin(user) : false;

  let siteName: string | null = null;
  let role: string | null = null;
  let effectiveFeatureSlugs: string[] | "all" = [];
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
          const slugs = await getEffectiveFeatureSlugs(viewAs.siteId, viewAs.roleSlug);
          effectiveFeatureSlugs = Array.isArray(slugs) ? slugs : [];
        } catch {
          effectiveFeatureSlugs = [];
        }
      }
    }

    if (!viewAsActive) {
      try {
        role = await getRoleForCurrentUser();
        const schema = getClientSchema();
        const site = await getTenantSiteBySchema(schema);
        siteName = site?.name ?? null;
        effectiveFeatureSlugs = await getEffectiveFeatureSlugsForCurrentUser();
      } catch {
        if (userIsSuperadmin) {
          role = "superadmin";
          effectiveFeatureSlugs = "all";
        }
      }
    }
  }

  return (
    <AdminLayoutWrapper
      isSuperadmin={userIsSuperadmin}
      siteName={siteName}
      role={role}
      effectiveFeatureSlugs={effectiveFeatureSlugs}
      viewAsActive={viewAsActive}
      viewAsSiteName={viewAsSiteName}
      viewAsRole={viewAsRole}
    >
      {children}
    </AdminLayoutWrapper>
  );
}
