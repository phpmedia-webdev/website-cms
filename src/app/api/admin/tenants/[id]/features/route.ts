import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import {
  listFeatures,
  getTenantEnabledFeatureSlugs,
  setTenantFeatureSlugs,
  SUPERADMIN_FEATURE_SLUG,
  featuresForRoleOrTenantUI,
  orderedFeatures,
} from "@/lib/supabase/feature-registry";
import { getFeatureRegistryFromPhpAuth } from "@/lib/php-auth/fetch-features";

export type TenantFeatureItem = { slug: string; label: string; order: number };

/**
 * GET /api/admin/tenants/[id]/features
 * Returns feature list (from PHP-Auth when configured, else local) and enabled slugs for this tenant.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const { id: tenantId } = await params;
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant id" }, { status: 400 });
    }
    const [phpAuthFeatures, enabledSlugs] = await Promise.all([
      getFeatureRegistryFromPhpAuth(),
      getTenantEnabledFeatureSlugs(tenantId),
    ]);
    const features: TenantFeatureItem[] =
      phpAuthFeatures.length > 0
        ? phpAuthFeatures
            .filter((f) => f.slug !== SUPERADMIN_FEATURE_SLUG)
            .map((f) => ({
              slug: f.slug,
              label: f.label,
              order: f.order ?? 0,
            }))
            .sort((a, b) => a.order - b.order)
        : orderedFeatures(featuresForRoleOrTenantUI(await listFeatures(true))).map(
            (f) => ({ slug: f.slug, label: f.label, order: f.display_order })
          );
    return NextResponse.json({ features, enabledSlugs });
  } catch (error) {
    console.error("GET /api/admin/tenants/[id]/features:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant features" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tenants/[id]/features
 * Body: { featureSlugs: string[] }. Superadmin only. Saves to tenant_feature_slugs.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const { id: tenantId } = await params;
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant id" }, { status: 400 });
    }
    const body = await request.json();
    let featureSlugs = Array.isArray(body?.featureSlugs)
      ? (body.featureSlugs as string[]).filter(
          (s) => typeof s === "string" && s.trim().length > 0
        )
      : [];
    featureSlugs = featureSlugs.filter((s) => s !== SUPERADMIN_FEATURE_SLUG);
    const ok = await setTenantFeatureSlugs(tenantId, featureSlugs);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to update tenant features" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/tenants/[id]/features:", error);
    return NextResponse.json(
      { error: "Failed to update tenant features" },
      { status: 500 }
    );
  }
}
