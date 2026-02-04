import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { listFeatures, listRoles, listRoleFeatureIds } from "@/lib/supabase/feature-registry";

/**
 * GET /api/admin/roles
 * Returns roles, features, and per-role feature IDs (superadmin only).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    const [roles, features] = await Promise.all([
      listRoles(),
      listFeatures(true),
    ]);

    const roleFeatureIds: Record<string, string[]> = {};
    for (const role of roles) {
      roleFeatureIds[role.slug] = await listRoleFeatureIds(role.slug);
    }

    return NextResponse.json({
      roles,
      features,
      roleFeatureIds,
    });
  } catch (error) {
    console.error("GET /api/admin/roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles and features" },
      { status: 500 }
    );
  }
}
