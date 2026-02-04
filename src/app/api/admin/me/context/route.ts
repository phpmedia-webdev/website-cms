/**
 * GET /api/admin/me/context — current user context (e.g. isSuperadmin).
 * Requires admin auth.
 */

import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.metadata.type !== "admin" && user.metadata.type !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ isSuperadmin: isSuperadmin(user) });
}
