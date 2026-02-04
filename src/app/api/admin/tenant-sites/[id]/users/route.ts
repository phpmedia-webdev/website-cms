import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getTenantSiteById } from "@/lib/supabase/tenant-sites";
import {
  listUsersByTenantSite,
  getTenantUserByEmail,
  createTenantUser,
  assignUserToSite,
} from "@/lib/supabase/tenant-users";
import { inviteUserByEmail } from "@/lib/supabase/users";

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
 * Add a user to this tenant site. Body: { email, display_name?, role_slug, invite?: boolean }.
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
        const { user: authUser, error: inviteError } = await inviteUserByEmail(email, {
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

    const assigned = await assignUserToSite(tenantUser.id, tenantSiteId, roleSlug);
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
    console.error("POST /api/admin/tenant-sites/[id]/users:", error);
    return NextResponse.json(
      { error: "Failed to add user" },
      { status: 500 }
    );
  }
}
