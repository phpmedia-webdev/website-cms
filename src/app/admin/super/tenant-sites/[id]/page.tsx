import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getTenantSiteById } from "@/lib/supabase/tenant-sites";
import {
  listFeatures,
  listTenantFeatureIds,
  orderedFeatures,
  featuresForRoleOrTenantUI,
} from "@/lib/supabase/feature-registry";
import { TenantFeaturesManager } from "@/components/superadmin/TenantFeaturesManager";
import { TenantSiteModeCard } from "@/components/superadmin/TenantSiteModeCard";
import { RelatedTenantUsersClient } from "@/components/superadmin/RelatedTenantUsersClient";

/**
 * Superadmin Tenant Site detail: site info + Features + Related Tenant Users.
 */
export default async function SuperadminTenantSiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isSuperadmin(user)) redirect("/admin/dashboard");

  const { id } = await params;
  const [site, allFeatures, tenantFeatureIdsFromDb] = await Promise.all([
    getTenantSiteById(id),
    listFeatures(true),
    listTenantFeatureIds(id),
  ]);
  if (!site) notFound();

  const featuresForUI = featuresForRoleOrTenantUI(allFeatures);
  const features = orderedFeatures(featuresForUI);
  // Default all features On when tenant has no saved list (stage for delivery by turning Off)
  const allFeatureIds = features.map((f) => f.id);
  const tenantFeatureIds =
    tenantFeatureIdsFromDb.length === 0 ? allFeatureIds : tenantFeatureIdsFromDb;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/super/tenant-sites"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Tenant Sites
        </Link>
        <h1 className="text-3xl font-bold mt-2">{site.name}</h1>
        <p className="text-muted-foreground mt-1">
          {site.schema_name}
          {site.deployment_url && ` · ${site.deployment_url}`}
        </p>
        <Link
          href={`/admin/super/tenant-sites/${id}/settings`}
          className="inline-block mt-2 text-sm text-primary hover:underline"
        >
          Settings →
        </Link>
      </div>

      <div className="rounded-md border p-4 space-y-2 text-sm">
        <p><span className="font-medium text-muted-foreground">Schema:</span> {site.schema_name}</p>
        <p><span className="font-medium text-muted-foreground">URL:</span> {site.deployment_url || "—"}</p>
        <p><span className="font-medium text-muted-foreground">Description:</span> {site.description || "—"}</p>
        <p><span className="font-medium text-muted-foreground">Status:</span> {site.status}</p>
      </div>

      <TenantSiteModeCard
        siteId={id}
        initialMode={site.site_mode}
        initialLocked={site.site_mode_locked}
        initialLockReason={site.site_mode_locked_reason}
        initialComingSoonMessage={site.coming_soon_message}
        initialComingSoonSnippetId={site.coming_soon_snippet_id}
      />

      <TenantFeaturesManager
        tenantId={id}
        features={features}
        initialFeatureIds={tenantFeatureIds}
      />

      <RelatedTenantUsersClient siteId={id} />
    </div>
  );
}
