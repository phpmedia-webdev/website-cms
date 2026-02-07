import { NextResponse } from "next/server";
import { getTeamManagementContext } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema, updateTenantSite } from "@/lib/supabase/tenant-sites";
import { getMags } from "@/lib/supabase/crm";

/**
 * GET /api/crm/memberships/settings
 * Returns membership master switch state and MAG count for current tenant.
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
    const schema = getClientSchema();
    const site = await getTenantSiteBySchema(schema);
    if (!site) {
      return NextResponse.json(
        { error: "Tenant site not found" },
        { status: 404 }
      );
    }
    const mags = await getMags(true);
    return NextResponse.json({
      membership_enabled: site.membership_enabled ?? true,
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

/**
 * PATCH /api/crm/memberships/settings
 * Body: { membership_enabled: boolean }. Updates current tenant's master switch.
 * Requires tenant admin or superadmin. When turning OFF with MAGs exist, we still allow;
 * UI should show warning before calling.
 */
export async function PATCH(request: Request) {
  try {
    const context = await getTeamManagementContext();
    if (!context.canManage) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }
    const schema = getClientSchema();
    const site = await getTenantSiteBySchema(schema);
    if (!site) {
      return NextResponse.json(
        { error: "Tenant site not found" },
        { status: 404 }
      );
    }
    const body = await request.json();
    const enabled = body?.membership_enabled;
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "membership_enabled must be a boolean" },
        { status: 400 }
      );
    }
    const result = await updateTenantSite(site.id, { membership_enabled: enabled });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to update" },
        { status: 500 }
      );
    }
    const mags = await getMags(true);
    return NextResponse.json({
      membership_enabled: enabled,
      mag_count: mags.length,
      ...(enabled === false && mags.length > 0
        ? { warning: "Membership is now off. Gated content may be exposed. Consider making memberships inactive (draft) first." }
        : {}),
    });
  } catch (error) {
    console.error("PATCH /api/crm/memberships/settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
