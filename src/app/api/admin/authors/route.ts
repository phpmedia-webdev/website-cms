/**
 * GET /api/admin/authors
 * List tenant users assigned to the current site (for content author dropdown).
 * Requires admin or superadmin. Returns id (tenant_user id or auth user id), display_name, email.
 * When current user is superadmin and not in the site list, they are appended so they can be chosen as author.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { listUsersByTenantSite } from "@/lib/supabase/tenant-users";
import { getProfileByUserId } from "@/lib/supabase/profiles";

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

  const siteUsers = await listUsersByTenantSite(site.id);
  const users: { id: string; display_name: string | null; email: string }[] = siteUsers.map((u) => ({
    id: u.id,
    display_name: u.display_name ?? null,
    email: u.email,
  }));

  // Superadmin fallback: if current user is not in the site list, add them (by auth id) so they can be chosen as author.
  // Use profile display_name (Settings → My Profile) when set, else Auth display_name, else email.
  if (isSuperadminFromRole(role)) {
    const alreadyInList = siteUsers.some((u) => u.user_id === user.id);
    if (!alreadyInList) {
      const profile = await getProfileByUserId(user.id);
      const displayName =
        profile?.display_name?.trim() ||
        user.display_name?.trim() ||
        null;
      users.push({
        id: user.id,
        display_name: displayName,
        email: user.email ?? "",
      });
    }
  }

  return NextResponse.json({ users });
}
