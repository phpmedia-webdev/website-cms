import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getTenantSiteById } from "@/lib/supabase/tenant-sites";
import {
  listUsersByTenantSite,
  getTenantUserByEmail,
  getTenantUserById,
  createTenantUser,
  assignUserToSite,
  getAssignmentByAdminAndTenant,
  removeUserFromSite,
} from "@/lib/supabase/tenant-users";
import { inviteUserByEmail } from "@/lib/supabase/users";
import { pushAuditLog, getClientAuditContext } from "@/lib/php-auth/audit-log";
import { syncUserOrgRoleToPhpAuth } from "@/lib/php-auth/sync-user-org-role";
import { getRolesForAssignmentFromPhpAuth } from "@/lib/php-auth/fetch-roles";
import { legacySlugToPhpAuthSlug } from "@/lib/php-auth/role-mapping";

/**
 * GET /api/admin/tenant-sites/[id]/users
 * List users assigned to this tenant site. Superadmin only.
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
    const { id } = await params;
    const site = await getTenantSiteById(id);
    if (!site) {
      return NextResponse.json({ error: "Tenant site not found" }, { status: 404 });
    }
    const list = await listUsersByTenantSite(id);
    return NextResponse.json(list);
  } catch (error) {
    console.error("GET /api/admin/tenant-sites/[id]/users:", error);
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenant-sites/[id]/users
 * Add a user to this tenant site. Body: { email, display_name?, role_slug, is_owner?: boolean, invite?: boolean }.
 * If invite is true and email has no auth user, sends invite then creates tenant_user and assignment.
 * Superadmin only.
 */
export async function POST(
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
    const { id: tenantSiteId } = await params;
    const site = await getTenantSiteById(tenantSiteId);
    if (!site) {
      return NextResponse.json({ error: "Tenant site not found" }, { status: 404 });
    }
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : null;
    let roleSlug = typeof body?.role_slug === "string" ? body.role_slug.trim() : "";
    if (!roleSlug) {
      const roles = await getRolesForAssignmentFromPhpAuth();
      roleSlug = roles[0]?.slug ?? "";
    }
    const isOwner = body?.is_owner === true;
    const doInvite = body?.invite === true;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }
    if (!roleSlug) {
      return NextResponse.json(
        { error: "No roles available from PHP-Auth; role_slug required" },
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

    const assigned = await assignUserToSite(tenantUser.id, tenantSiteId, roleSlug, isOwner);
    if (!assigned) {
      return NextResponse.json(
        { error: "Failed to assign user to site" },
        { status: 500 }
      );
    }

    const ctx = getClientAuditContext(request);
    const phpAuthSlug = legacySlugToPhpAuthSlug(roleSlug);
    pushAuditLog({
      action: "role_assigned",
      loginSource: "website-cms",
      userId: tenantUser.user_id,
      resourceType: "tenant_user",
      resourceId: tenantUser.id,
      metadata: { email: tenantUser.email, roleSlug: phpAuthSlug, is_owner: isOwner },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      deviceType: ctx.deviceType,
      browser: ctx.browser,
    }).catch(() => {});
    syncUserOrgRoleToPhpAuth({
      supabaseUserId: tenantUser.user_id,
      email: tenantUser.email,
      roleSlug: phpAuthSlug,
      operation: "assign",
    }).catch(() => {});

    return NextResponse.json({
      tenant_user_id: tenantUser.id,
      email: tenantUser.email,
      role_slug: roleSlug,
      is_owner: isOwner,
      invited: doInvite,
    });
  } catch (error) {
    console.error("POST /api/admin/tenant-sites/[id]/users:", error);
    return NextResponse.json(
      { error: "Failed to add user" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tenant-sites/[id]/users
 * Update role and/or is_owner, or remove user. Body: { user_id: string, role_slug?: string, is_owner?: boolean }.
 * If role_slug is omitted and is_owner is omitted, remove assignment. Superadmin only.
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
    const { id: tenantSiteId } = await params;
    const site = await getTenantSiteById(tenantSiteId);
    if (!site) {
      return NextResponse.json({ error: "Tenant site not found" }, { status: 404 });
    }
    const body = await request.json();
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
    const roleSlug = typeof body?.role_slug === "string" ? body.role_slug.trim() : undefined;
    const isOwner = body?.is_owner;

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const assignment = await getAssignmentByAdminAndTenant(userId, tenantSiteId);
    if (!assignment) {
      return NextResponse.json(
        { error: "User is not assigned to this site" },
        { status: 404 }
      );
    }

    if (roleSlug === undefined && isOwner === undefined) {
      const tenantUser = await getTenantUserById(userId);
      const removed = await removeUserFromSite(userId, tenantSiteId);
      if (!removed) {
        return NextResponse.json(
          { error: "Failed to remove user from site" },
          { status: 500 }
        );
      }
      if (tenantUser) {
        const ctx = getClientAuditContext(request);
        pushAuditLog({
          action: "role_removed",
          loginSource: "website-cms",
          userId: tenantUser.user_id,
          resourceType: "tenant_user",
          resourceId: tenantUser.id,
          metadata: { email: tenantUser.email },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          deviceType: ctx.deviceType,
          browser: ctx.browser,
        }).catch(() => {});
        syncUserOrgRoleToPhpAuth({
          supabaseUserId: tenantUser.user_id,
          email: tenantUser.email,
          roleSlug: null,
          operation: "remove",
        }).catch(() => {});
      }
      return NextResponse.json({ removed: true });
    }

    const newRole = roleSlug ?? assignment.role_slug;
    const newIsOwner = typeof isOwner === "boolean" ? isOwner : assignment.is_owner;
    const updated = await assignUserToSite(userId, tenantSiteId, newRole, newIsOwner);
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update assignment" },
        { status: 500 }
      );
    }
    const tenantUser = await getTenantUserById(userId);
    if (tenantUser) {
      const ctx = getClientAuditContext(request);
      const phpAuthSlug = legacySlugToPhpAuthSlug(newRole);
      pushAuditLog({
        action: "role_updated",
        loginSource: "website-cms",
        userId: tenantUser.user_id,
        resourceType: "tenant_user",
        resourceId: tenantUser.id,
        metadata: { email: tenantUser.email, roleSlug: phpAuthSlug, is_owner: newIsOwner },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        deviceType: ctx.deviceType,
        browser: ctx.browser,
      }).catch(() => {});
      syncUserOrgRoleToPhpAuth({
        supabaseUserId: tenantUser.user_id,
        email: tenantUser.email,
        roleSlug: phpAuthSlug,
        operation: "update",
      }).catch(() => {});
    }
    return NextResponse.json({ role_slug: newRole, is_owner: newIsOwner });
  } catch (error) {
    console.error("PATCH /api/admin/tenant-sites/[id]/users:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
