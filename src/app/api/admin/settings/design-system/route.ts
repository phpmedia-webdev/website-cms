import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { updateDesignSystemConfig } from "@/lib/supabase/settings";
import type { DesignSystemConfig } from "@/types/design-system";

/**
 * API route for updating design system settings
 * POST /api/admin/settings/design-system
 *
 * Requires: Admin or superadmin (central role when PHP-Auth configured).
 * Body: DesignSystemConfig (partial)
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const config = body as Partial<DesignSystemConfig>;

    // Validate required fields if provided
    if (config.fonts?.primary && !config.fonts.primary.family) {
      return NextResponse.json(
        { error: "Primary font family is required" },
        { status: 400 }
      );
    }

    if (config.fonts?.secondary && !config.fonts.secondary.family) {
      return NextResponse.json(
        { error: "Secondary font family is required" },
        { status: 400 }
      );
    }

    // Update design system config
    const success = await updateDesignSystemConfig(config);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update design system settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Design system settings updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating design system settings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
