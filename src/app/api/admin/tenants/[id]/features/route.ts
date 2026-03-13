import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import {
  getTenantEnabledFeatureSlugs,
  setTenantFeatureSlugs,
  setTenantHiddenFeatureSlugs,
  listTenantHiddenFeatureSlugs,
  SUPERADMIN_FEATURE_SLUG,
} from "@/lib/supabase/feature-registry";
import { getFeaturesForGatingTable } from "@/lib/admin/gating-features";

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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isSuperadminAsync())) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const { id: tenantId } = await params;
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant id" }, { status: 400 });
    }
    const [features, enabledSlugs, hiddenSlugs] = await Promise.all([
      getFeaturesForGatingTable(),
      getTenantEnabledFeatureSlugs(tenantId),
      listTenantHiddenFeatureSlugs(tenantId),
    ]);
    return NextResponse.json({ features, enabledSlugs, hiddenSlugs });
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
 * Body: { featureSlugs?: string[], hiddenFeatureSlugs?: string[] }. Superadmin only.
 * When hiddenFeatureSlugs is provided, slugs in it are also removed from featureSlugs (Display OFF syncs Gate OFF).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isSuperadminAsync())) {
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
    const hasHiddenInBody = Array.isArray(body?.hiddenFeatureSlugs);
    const hiddenSlugs = hasHiddenInBody
      ? (body.hiddenFeatureSlugs as string[]).filter(
          (s) => typeof s === "string" && s.trim().length > 0
        )
      : [];
    featureSlugs = featureSlugs.filter((s) => s !== SUPERADMIN_FEATURE_SLUG);
    if (hiddenSlugs.length > 0) {
      const hiddenSet = new Set(hiddenSlugs);
      featureSlugs = featureSlugs.filter((s) => !hiddenSet.has(s));
    }
    const okFeatures = await setTenantFeatureSlugs(tenantId, featureSlugs);
    if (!okFeatures) {
      return NextResponse.json(
        { error: "Failed to update tenant features" },
        { status: 500 }
      );
    }
    if (hasHiddenInBody) {
      const okHidden = await setTenantHiddenFeatureSlugs(tenantId, hiddenSlugs);
      if (!okHidden) {
        return NextResponse.json(
          { error: "Failed to update hidden features" },
          { status: 500 }
        );
      }
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
