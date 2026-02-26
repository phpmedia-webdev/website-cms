import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getTenantSiteById } from "@/lib/supabase/tenant-sites";
import {
  listFeatures,
  getTenantEnabledFeatureSlugs,
  featuresForRoleOrTenantUI,
  orderedFeatures,
  SUPERADMIN_FEATURE_SLUG,
} from "@/lib/supabase/feature-registry";
import { getFeatureRegistryFromPhpAuth } from "@/lib/php-auth/fetch-features";
import { TenantFeaturesManager } from "@/components/superadmin/TenantFeaturesManager";
import { TenantSiteModeCard } from "@/components/superadmin/TenantSiteModeCard";
import { RelatedTenantUsersClient } from "@/components/superadmin/RelatedTenantUsersClient";

/**
 * Superadmin Tenant Site detail: site info + Features + Related Tenant Users.
 * M5 C5: Features from PHP-Auth when configured; gating by slug (tenant_feature_slugs).
 */
export default async function SuperadminTenantSiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  const { id } = await params;
  const [site, phpAuthFeatures, localFeatures, enabledSlugs] = await Promise.all([
    getTenantSiteById(id),
    getFeatureRegistryFromPhpAuth(),
    listFeatures(true),
    getTenantEnabledFeatureSlugs(id),
  ]);
  if (!site) notFound();

  const featuresForUI =
    phpAuthFeatures.length > 0
      ? phpAuthFeatures
          .filter((f) => f.slug !== SUPERADMIN_FEATURE_SLUG)
          .map((f) => ({ slug: f.slug, label: f.label, order: f.order ?? 0 }))
          .sort((a, b) => a.order - b.order)
      : orderedFeatures(featuresForRoleOrTenantUI(localFeatures)).map((f) => ({
          slug: f.slug,
          label: f.label,
          order: f.display_order,
        }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/super"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
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
        features={featuresForUI}
        initialEnabledSlugs={enabledSlugs}
      />

      <RelatedTenantUsersClient siteId={id} siteName={site.name} />
    </div>
  );
}
