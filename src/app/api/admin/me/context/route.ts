/**
 * GET /api/admin/me/context — current user context (isSuperadmin, canApproveReject for comment moderation).
 * Requires admin or superadmin (central role when PHP-Auth configured).
 * canApproveReject: true when user has "approve_reject" permission (PHP-Auth role assignment) or is admin/superadmin when PHP-Auth not configured.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole, hasPermission, PERMISSION_APPROVE_REJECT } from "@/lib/auth/resolve-role";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const canApproveReject = await hasPermission(PERMISSION_APPROVE_REJECT);
  return NextResponse.json({
    isSuperadmin: isSuperadminFromRole(role),
    canApproveReject,
  });
}
