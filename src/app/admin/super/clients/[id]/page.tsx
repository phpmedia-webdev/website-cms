import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getClientTenantById } from "@/lib/supabase/client-tenants";
import { listFeatures, listTenantFeatureIds, orderedFeatures } from "@/lib/supabase/feature-registry";
import { TenantFeaturesManager } from "@/components/superadmin/TenantFeaturesManager";

/**
 * Superadmin Client detail: tenant info + Features section. Admins tab to be added later.
 */
export default async function SuperadminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isSuperadmin(user)) redirect("/admin/dashboard");

  const { id } = await params;
  const [tenant, allFeatures, tenantFeatureIds] = await Promise.all([
    getClientTenantById(id),
    listFeatures(true),
    listTenantFeatureIds(id),
  ]);
  if (!tenant) notFound();

  const features = orderedFeatures(allFeatures);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/super/clients"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Clients
        </Link>
        <h1 className="text-3xl font-bold mt-2">{tenant.name}</h1>
        <p className="text-muted-foreground mt-1">
          {tenant.schema_name}
          {tenant.deployment_url && ` · ${tenant.deployment_url}`}
        </p>
      </div>

      <div className="rounded-md border p-4 space-y-2 text-sm">
        <p><span className="font-medium text-muted-foreground">Schema:</span> {tenant.schema_name}</p>
        <p><span className="font-medium text-muted-foreground">URL:</span> {tenant.deployment_url || "—"}</p>
        <p><span className="font-medium text-muted-foreground">Description:</span> {tenant.description || "—"}</p>
        <p><span className="font-medium text-muted-foreground">Status:</span> {tenant.status}</p>
        <p><span className="font-medium text-muted-foreground">Site mode:</span> {tenant.site_mode}</p>
      </div>

      <TenantFeaturesManager
        tenantId={id}
        features={features}
        initialFeatureIds={tenantFeatureIds}
      />
    </div>
  );
}
