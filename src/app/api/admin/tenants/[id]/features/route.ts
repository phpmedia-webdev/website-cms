import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { listTenantFeatureIds, setTenantFeatureIds } from "@/lib/supabase/feature-registry";

/**
 * GET /api/admin/tenants/[id]/features
 * Returns feature IDs enabled for this tenant (superadmin only).
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
    const featureIds = await listTenantFeatureIds(tenantId);
    return NextResponse.json({ featureIds });
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
 * Body: { featureIds: string[] }. Superadmin only.
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
    const featureIds = Array.isArray(body?.featureIds)
      ? (body.featureIds as string[]).filter((id) => typeof id === "string" && id.length > 0)
      : [];
    const ok = await setTenantFeatureIds(tenantId, featureIds);
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
