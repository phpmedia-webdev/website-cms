import { NextResponse } from "next/server";
import { getTeamManagementContext } from "@/lib/auth/resolve-role";
import { isMembershipEnabledForCurrentTenant } from "@/lib/supabase/tenant-sites";
import { getMags } from "@/lib/supabase/crm";

/**
 * GET /api/crm/memberships/settings
 * Returns whether membership is enabled (from feature gate) and MAG count for current tenant.
 * Requires tenant admin or superadmin (canManage).
 */
export async function GET() {
  try {
    const context = await getTeamManagementContext();
    if (!context.canManage) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }
    const [membershipEnabled, mags] = await Promise.all([
      isMembershipEnabledForCurrentTenant(),
      getMags(true),
    ]);
    return NextResponse.json({
      membership_enabled: membershipEnabled,
      mag_count: mags.length,
    });
  } catch (error) {
    console.error("GET /api/crm/memberships/settings:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}
