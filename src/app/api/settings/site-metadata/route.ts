import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getSiteMetadata, updateSiteMetadata } from "@/lib/supabase/settings";

/**
 * GET /api/settings/site-metadata
 * Returns site name, description, and URL. Requires admin auth.
 */
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

    const metadata = await getSiteMetadata();
    return NextResponse.json(metadata);
  } catch (err) {
    console.error("Site metadata GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/site-metadata
 * Update site name, description, and/or URL. Requires admin auth.
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, url } = body as {
      name?: string;
      description?: string;
      url?: string;
    };

    const success = await updateSiteMetadata({
      ...(name !== undefined && { name: String(name) }),
      ...(description !== undefined && { description: String(description) }),
      ...(url !== undefined && { url: url === "" ? undefined : String(url).trim() || undefined }),
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update site metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Site metadata PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
