/**
 * GET /api/settings/site-mode — current site mode and lock (admin auth).
 * PATCH /api/settings/site-mode — update site mode (admin); superadmin can set lock.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import {
  getTenantSiteBySchema,
  updateTenantSite,
  createTenantSite,
} from "@/lib/supabase/tenant-sites";

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
    let schema: string;
    try {
      schema = getClientSchema();
    } catch {
      return NextResponse.json(
        { mode: process.env.NEXT_PUBLIC_SITE_MODE || "live", site_mode_locked: false }
      );
    }
    const site = await getTenantSiteBySchema(schema);
    if (!site) {
      return NextResponse.json({
        mode: process.env.NEXT_PUBLIC_SITE_MODE || "live",
        site_mode_locked: false,
      });
    }
    return NextResponse.json({
      mode: site.site_mode?.trim() || "live",
      site_mode_locked: !!site.site_mode_locked,
      site_mode_locked_reason: site.site_mode_locked_reason ?? undefined,
      coming_soon_message: site.coming_soon_message ?? undefined,
      coming_soon_snippet_id: site.coming_soon_snippet_id ?? undefined,
    });
  } catch (err) {
    console.error("GET site-mode:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    let schema: string;
    try {
      schema = getClientSchema();
    } catch {
      return NextResponse.json(
        { error: "No tenant schema (NEXT_PUBLIC_CLIENT_SCHEMA) configured" },
        { status: 400 }
      );
    }
    let site = await getTenantSiteBySchema(schema);
    if (!site) {
      // Dev / single-tenant: schema exists but no tenant_sites row yet — create one so the toggle works
      const bodyPreview = await request.clone().json().catch(() => ({})) as { mode?: string };
      const initialMode =
        String(bodyPreview.mode).trim().toLowerCase() === "coming_soon"
          ? "coming_soon"
          : "live";
      const slug = schema.replace(/_/g, "-").toLowerCase();
      const created = await createTenantSite({
        name: schema,
        slug,
        schema_name: schema,
        site_mode: initialMode,
        status: "active",
      });
      if (!created) {
        return NextResponse.json(
          { error: "Tenant site not found for this schema. Create it in Superadmin → Tenant Sites first." },
          { status: 404 }
        );
      }
      site = created;
    }
    const body = await request.json().catch(() => ({})) as {
      mode?: string;
      site_mode_locked?: boolean;
      site_mode_locked_reason?: string | null;
      coming_soon_message?: string | null;
      coming_soon_snippet_id?: string | null;
    };
    const isSuperadmin = isSuperadminFromRole(role);

    let responseMode: string | undefined;
    if (body.mode !== undefined) {
      const newMode =
        String(body.mode).trim().toLowerCase() === "coming_soon"
          ? "coming_soon"
          : "live";
      if (site.site_mode_locked && !isSuperadmin) {
        return NextResponse.json(
          { error: "Site mode is locked by superadmin" },
          { status: 403 }
        );
      }
      const updated = await updateTenantSite(site.id, { site_mode: newMode });
      if (!updated.ok) {
        return NextResponse.json(
          { error: updated.error ?? "Failed to update site mode" },
          { status: 500 }
        );
      }
      responseMode = newMode;
    }
    if (body.coming_soon_message !== undefined) {
      const result = await updateTenantSite(site.id, {
        coming_soon_message: body.coming_soon_message?.trim() || null,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error ?? "Failed to save coming soon message" },
          { status: 500 }
        );
      }
    }
    if (body.coming_soon_snippet_id !== undefined) {
      const result = await updateTenantSite(site.id, {
        coming_soon_snippet_id: body.coming_soon_snippet_id?.trim() || null,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error ?? "Failed to save coming soon snippet" },
          { status: 500 }
        );
      }
    }
    if (body.site_mode_locked !== undefined && isSuperadmin) {
      await updateTenantSite(site.id, {
        site_mode_locked: !!body.site_mode_locked,
        ...(body.site_mode_locked
          ? {
              site_mode_locked_by: user.id,
              site_mode_locked_at: new Date().toISOString(),
              site_mode_locked_reason:
                body.site_mode_locked_reason?.trim() || null,
            }
          : {
              site_mode_locked_by: null,
              site_mode_locked_at: null,
              site_mode_locked_reason: null,
            }),
      });
    }

    const siteNow = await getTenantSiteBySchema(schema);
    return NextResponse.json({
      mode: responseMode ?? siteNow?.site_mode?.trim() ?? "live",
      site_mode_locked: !!siteNow?.site_mode_locked,
      site_mode_locked_reason: siteNow?.site_mode_locked_reason ?? undefined,
      coming_soon_message: siteNow?.coming_soon_message ?? undefined,
      coming_soon_snippet_id: siteNow?.coming_soon_snippet_id ?? undefined,
    });
  } catch (err) {
    console.error("PATCH site-mode:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
