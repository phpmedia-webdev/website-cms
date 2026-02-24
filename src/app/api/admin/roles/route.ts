import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getRolesForAssignmentFromPhpAuth } from "@/lib/php-auth/fetch-roles";
import {
  listFeatures,
  listRoles,
  listRoleFeatureIds,
  featuresForRoleOrTenantUI,
} from "@/lib/supabase/feature-registry";

/**
 * GET /api/admin/roles
 * Returns roles, features, and per-role feature IDs (superadmin only).
 * ?for=assignment → returns only roles for dropdown (from PHP-Auth), no features.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    const forAssignment =
      new URL(request.url).searchParams.get("for") === "assignment";
    if (forAssignment) {
      const roles = await getRolesForAssignmentFromPhpAuth();
      return NextResponse.json({ roles });
    }

    const [roles, allFeatures] = await Promise.all([
      listRoles(),
      listFeatures(false), // only enabled features (role assignment shows canonical list)
    ]);
    const features = featuresForRoleOrTenantUI(allFeatures);

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

/**
 * POST /api/admin/roles
 * M5: Role creation is in PHP-Auth. This endpoint is disabled.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Role creation is in PHP-Auth. Create and manage roles in the PHP-Auth app; they will be available here for assignment.",
    },
    { status: 410 }
  );
}
