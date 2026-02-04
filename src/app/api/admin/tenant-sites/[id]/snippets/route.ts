/**
 * GET /api/admin/tenant-sites/[id]/snippets — list snippet content for this tenant (superadmin).
 * Returns snippets from the tenant's content schema for Coming Soon snippet dropdown.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getTenantSiteById } from "@/lib/supabase/tenant-sites";
import { getSnippetOptions } from "@/lib/supabase/content";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.metadata.type !== "superadmin" || user.metadata.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const site = await getTenantSiteById(id);
    if (!site) {
      return NextResponse.json({ error: "Tenant site not found" }, { status: 404 });
    }
    const options = await getSnippetOptions(site.schema_name);
    return NextResponse.json(options);
  } catch (err) {
    console.error("GET /api/admin/tenant-sites/[id]/snippets:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch snippets" },
      { status: 500 }
    );
  }
}
