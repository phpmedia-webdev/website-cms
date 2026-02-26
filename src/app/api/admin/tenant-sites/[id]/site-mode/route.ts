/**
 * GET /api/admin/tenant-sites/[id]/site-mode — site mode and lock for this tenant site.
 * PATCH /api/admin/tenant-sites/[id]/site-mode — update site mode and/or lock (superadmin only).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import {
  getTenantSiteById,
  updateTenantSite,
} from "@/lib/supabase/tenant-sites";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isSuperadminAsync())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const site = await getTenantSiteById(id);
  if (!site) {
    return NextResponse.json({ error: "Tenant site not found" }, { status: 404 });
  }
  return NextResponse.json({
    mode: site.site_mode?.trim() || "live",
    site_mode_locked: !!site.site_mode_locked,
    site_mode_locked_reason: site.site_mode_locked_reason ?? undefined,
    coming_soon_message: site.coming_soon_message ?? undefined,
    coming_soon_snippet_id: site.coming_soon_snippet_id ?? undefined,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isSuperadminAsync())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const site = await getTenantSiteById(id);
  if (!site) {
    return NextResponse.json({ error: "Tenant site not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => ({})) as {
    mode?: string;
    site_mode_locked?: boolean;
    site_mode_locked_reason?: string | null;
    coming_soon_message?: string | null;
    coming_soon_snippet_id?: string | null;
  };
  let responseMode: string | undefined;
  if (body.mode !== undefined) {
    const newMode =
      String(body.mode).trim().toLowerCase() === "coming_soon"
        ? "coming_soon"
        : "live";
    const modeUpdated = await updateTenantSite(id, { site_mode: newMode });
    if (!modeUpdated.ok) {
      return NextResponse.json(
        { error: modeUpdated.error ?? "Failed to update site mode" },
        { status: 500 }
      );
    }
    responseMode = newMode;
  }
  if (body.site_mode_locked !== undefined) {
    const lockUpdated = await updateTenantSite(id, {
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
    if (!lockUpdated.ok) {
      return NextResponse.json(
        { error: lockUpdated.error ?? "Failed to update site mode lock" },
        { status: 500 }
      );
    }
  }
  if (body.coming_soon_message !== undefined) {
    const result = await updateTenantSite(id, {
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
    const result = await updateTenantSite(id, {
      coming_soon_snippet_id: body.coming_soon_snippet_id?.trim() || null,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to save coming soon snippet" },
        { status: 500 }
      );
    }
  }
  const updated = await getTenantSiteById(id);
  return NextResponse.json({
    mode: responseMode ?? updated?.site_mode?.trim() ?? "live",
    site_mode_locked: !!updated?.site_mode_locked,
    site_mode_locked_reason: updated?.site_mode_locked_reason ?? undefined,
    coming_soon_message: updated?.coming_soon_message ?? undefined,
    coming_soon_snippet_id: updated?.coming_soon_snippet_id ?? undefined,
  });
}
