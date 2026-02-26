import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import { createTenantSite } from "@/lib/supabase/tenant-sites";

/**
 * POST /api/admin/tenants
 * Body: { name, slug, schema_name, deployment_url?, description?, status?, site_mode?, github_repo?, notes? }
 * Superadmin only. Returns created tenant (with id).
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isSuperadminAsync())) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const schema_name = typeof body?.schema_name === "string" ? body.schema_name.trim() : "";

    if (!name || !slug || !schema_name) {
      return NextResponse.json(
        { error: "name, slug, and schema_name are required" },
        { status: 400 }
      );
    }

    const tenant = await createTenantSite({
      name,
      slug,
      schema_name,
      deployment_url: body.deployment_url ?? null,
      description: body.description ?? null,
      status: body.status ?? "active",
      site_mode: body.site_mode ?? "coming_soon",
      github_repo: body.github_repo ?? null,
      notes: body.notes ?? null,
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Failed to create tenant (e.g. slug or schema_name already in use)" },
        { status: 500 }
      );
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("POST /api/admin/tenants:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}
