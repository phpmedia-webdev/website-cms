import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getTeamManagementContext } from "@/lib/auth/resolve-role";
import { listRoles } from "@/lib/supabase/feature-registry";
import {
  listUsersByTenantSite,
  getTenantUserByEmail,
  createTenantUser,
  assignUserToSite,
  removeUserFromSite,
  getAssignmentByAdminAndTenant,
} from "@/lib/supabase/tenant-users";
import { inviteUserByEmail } from "@/lib/supabase/users";

/**
 * GET /api/settings/team
 * List users for the current tenant site and roles for dropdown.
 * Requires canManage (tenant admin or superadmin).
 */
export async function GET() {
  try {
    const context = await getTeamManagementContext();
    if (!context.canManage || !context.tenantSiteId) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required for this site" },
        { status: 403 }
      );
    }
    const [users, roles] = await Promise.all([
      listUsersByTenantSite(context.tenantSiteId),
      listRoles(),
    ]);
    return NextResponse.json({
      users,
      roles: roles.map((r) => ({ slug: r.slug, label: r.label || r.slug })),
    });
  } catch (error) {
    console.error("GET /api/settings/team:", error);
    return NextResponse.json(
      { error: "Failed to list team" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/team
 * Add a user to the current tenant site. Body: { email, display_name?, role_slug, invite?: boolean }.
 * Does not accept is_owner (superadmin only via admin API).
 */
export async function POST(request: Request) {
  try {
    const context = await getTeamManagementContext();
    if (!context.canManage || !context.tenantSiteId) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required for this site" },
        { status: 403 }
      );
    }
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : null;
    const roleSlug = typeof body?.role_slug === "string" ? body.role_slug.trim() : "viewer";
    const doInvite = body?.invite === true;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    let tenantUser = await getTenantUserByEmail(email);

    if (!tenantUser) {
      if (doInvite) {
        const origin = request.headers.get("origin") ?? new URL(request.url).origin;
        const redirectTo = `${origin}/admin/login/reset-password`;
        const { user: authUser, error: inviteError } = await inviteUserByEmail(email, {
          redirectTo,
          data: { display_name: displayName ?? email.split("@")[0] },
        });
        if (inviteError || !authUser) {
          return NextResponse.json(
            { error: inviteError?.message ?? "Failed to send invite" },
            { status: 400 }
          );
        }
        tenantUser = await createTenantUser({
          user_id: authUser.id,
          email,
          display_name: displayName,
        });
      } else {
        return NextResponse.json(
          { error: "User not found. Use invite: true to invite by email." },
          { status: 400 }
        );
      }
    }

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Failed to create or find tenant user" },
        { status: 500 }
      );
    }

    const assigned = await assignUserToSite(tenantUser.id, context.tenantSiteId, roleSlug);
    if (!assigned) {
      return NextResponse.json(
        { error: "Failed to assign user to site" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tenant_user_id: tenantUser.id,
      email: tenantUser.email,
      role_slug: roleSlug,
      invited: doInvite,
    });
  } catch (error) {
    console.error("POST /api/settings/team:", error);
    return NextResponse.json(
      { error: "Failed to add user" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/team
 * Update role or remove user. Body: { user_id: string (tenant user id), role_slug?: string }.
 * If role_slug omitted, remove assignment. Owners cannot be removed by tenant admins (403); only superadmin can.
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    const context = await getTeamManagementContext();
    if (!context.canManage || !context.tenantSiteId) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required for this site" },
        { status: 403 }
      );
    }
    const body = await request.json();
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
    const roleSlug = typeof body?.role_slug === "string" ? body.role_slug.trim() : undefined;

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const assignment = await getAssignmentByAdminAndTenant(userId, context.tenantSiteId);
    if (!assignment) {
      return NextResponse.json(
        { error: "User is not assigned to this site" },
        { status: 404 }
      );
    }

    if (assignment.is_owner && !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
    if (assignment.is_owner && !isSuperadmin(user!)) {
      return NextResponse.json(
        { error: "Only a superadmin can change or remove an Owner" },
        { status: 403 }
      );
    }

    if (roleSlug === undefined || roleSlug === "") {
      const removed = await removeUserFromSite(userId, context.tenantSiteId);
      if (!removed) {
        return NextResponse.json(
          { error: "Failed to remove user from site" },
          { status: 500 }
        );
      }
      return NextResponse.json({ removed: true });
    }

    const updated = await assignUserToSite(
      userId,
      context.tenantSiteId,
      roleSlug,
      assignment.is_owner
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }
    return NextResponse.json({ role_slug: roleSlug });
  } catch (error) {
    console.error("PATCH /api/settings/team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}
