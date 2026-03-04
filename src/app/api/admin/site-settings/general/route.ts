/**
 * PUT /api/admin/site-settings/general — update current site general fields (superadmin only).
 * Syncs tenant_sites (name, description, deployment_url) and site metadata (site.name, site.description, site.url).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import { getTenantSiteBySchema, updateTenantSite } from "@/lib/supabase/tenant-sites";
import { getClientSchema } from "@/lib/supabase/schema";
import { updateSiteMetadata } from "@/lib/supabase/settings";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isSuperadminAsync())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const schema = getClientSchema();
  const site = await getTenantSiteBySchema(schema);
  if (!site) {
    return NextResponse.json({ error: "No site for current schema" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as {
    name?: string;
    description?: string;
    deployment_url?: string | null;
  };

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const description = typeof body.description === "string" ? body.description.trim() : undefined;
  const deployment_url =
    body.deployment_url === null || body.deployment_url === ""
      ? null
      : typeof body.deployment_url === "string"
        ? body.deployment_url.trim() || null
        : undefined;

  const tenantPayload: { name?: string; description?: string | null; deployment_url?: string | null } = {};
  if (name !== undefined) tenantPayload.name = name;
  if (description !== undefined) tenantPayload.description = description;
  if (deployment_url !== undefined) tenantPayload.deployment_url = deployment_url;

  if (Object.keys(tenantPayload).length > 0) {
    const res = await updateTenantSite(site.id, tenantPayload);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
  }

  const meta: { name?: string; description?: string; url?: string } = {};
  if (name !== undefined) meta.name = name;
  if (description !== undefined) meta.description = description ?? "";
  if (deployment_url !== undefined) meta.url = deployment_url ?? undefined;
  if (Object.keys(meta).length > 0) {
    const ok = await updateSiteMetadata(meta);
    if (!ok) return NextResponse.json({ error: "Failed to sync site metadata" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
