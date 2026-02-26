/**
 * GET /api/settings/snippets — list snippet content items for dropdown (e.g. Coming Soon message).
 * Admin auth; returns snippets from current tenant content library.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getSnippetOptions } from "@/lib/supabase/content";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const options = await getSnippetOptions();
    return NextResponse.json(options);
  } catch (err) {
    console.error("GET /api/settings/snippets:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch snippets" },
      { status: 500 }
    );
  }
}
