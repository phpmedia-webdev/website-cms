/**
 * GET /api/admin/authors
 * List tenant users assigned to the current site (for content author dropdown).
 * Requires admin or superadmin. Returns id (tenant_user id), display_name, email.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { listUsersByTenantSite } from "@/lib/supabase/tenant-users";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schema = getClientSchema();
  const site = await getTenantSiteBySchema(schema);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const users = await listUsersByTenantSite(site.id);
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      display_name: u.display_name ?? null,
      email: u.email,
    })),
  });
}
