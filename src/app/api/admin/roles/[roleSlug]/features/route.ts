import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import { setRoleFeatureIds, getSuperadminFeatureId } from "@/lib/supabase/feature-registry";

/**
 * PATCH /api/admin/roles/[roleSlug]/features
 * Body: { featureIds: string[] }
 * Superadmin only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roleSlug: string }> }
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

    const { roleSlug } = await params;
    if (!roleSlug?.trim()) {
      return NextResponse.json(
        { error: "Missing role slug" },
        { status: 400 }
      );
    }

    const body = await request.json();
    let featureIds = Array.isArray(body?.featureIds)
      ? (body.featureIds as string[]).filter((id) => typeof id === "string" && id.length > 0)
      : [];
    const superadminId = await getSuperadminFeatureId();
    if (superadminId) {
      featureIds = featureIds.filter((id) => id !== superadminId);
    }

    const ok = await setRoleFeatureIds(roleSlug.trim(), featureIds);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to update role features" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/roles/[roleSlug]/features:", error);
    return NextResponse.json(
      { error: "Failed to update role features" },
      { status: 500 }
    );
  }
}
