import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import {
  listFeatures,
  listRoles,
  listRoleFeatureIds,
  featuresForRoleOrTenantUI,
  createRole,
} from "@/lib/supabase/feature-registry";

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
 * Create a new role (superadmin only). Body: { slug, label, description? }.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug : "";
    const label = typeof body.label === "string" ? body.label : "";
    const description = typeof body.description === "string" ? body.description : undefined;

    if (!slug.trim() && !label.trim()) {
      return NextResponse.json(
        { error: "slug and label are required" },
        { status: 400 }
      );
    }

    const role = await createRole({ slug: slug || label, label: label || slug, description });
    if (!role) {
      return NextResponse.json(
        { error: "Failed to create role (invalid slug or duplicate)" },
        { status: 400 }
      );
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("POST /api/admin/roles:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
