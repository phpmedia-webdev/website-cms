import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { getClientSchema } from "@/lib/supabase/schema";
import { getSiteMetadata } from "@/lib/supabase/settings";
import { getTenantEnabledFeatureSlugs, listTenantHiddenFeatureSlugs } from "@/lib/supabase/feature-registry";
import { getFeaturesForGatingTable } from "@/lib/admin/gating-features";
import { SiteSettingsTabsClient } from "./SiteSettingsTabsClient";

/**
 * Superadmin Site Settings: single tabbed page for current site (by schema).
 * Tabs: General (name, description, url, site mode, coming soon), Gating (feature toggles), API.
 */
export default async function SiteSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  const schema = getClientSchema();
  const [site, metadata, featuresForUI] = await Promise.all([
    getTenantSiteBySchema(schema),
    getSiteMetadata(),
    getFeaturesForGatingTable(),
  ]);

  if (!site) notFound();
  const [enabledSlugs, hiddenSlugs] = await Promise.all([
    getTenantEnabledFeatureSlugs(site.id),
    listTenantHiddenFeatureSlugs(site.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/super"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">Site Settings</h1>
        <p className="text-muted-foreground mt-1">
          General, gating, and API for {site.name}
        </p>
      </div>

      <SiteSettingsTabsClient
        site={site}
        initialMetadata={{ name: metadata.name, description: metadata.description, url: metadata.url }}
        featuresForGating={featuresForUI}
        initialEnabledSlugs={enabledSlugs}
        initialHiddenSlugs={hiddenSlugs}
      />
    </div>
  );
}
