/**
 * POST /api/events/bundles/[id]/items — Add resource to bundle { resource_id, sort_order? }.
 * DELETE /api/events/bundles/[id]/items — Remove member { resource_id }.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { addResourceBundleItem, removeResourceBundleItem } from "@/lib/supabase/participants-resources";
import { withRateLimit } from "@/lib/api/middleware";

async function requireAdmin() {
  const supabase = await createServerSupabaseClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const metadata = user.user_metadata as { type?: string } | undefined;
  const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";
  if (!isAdmin) return { error: "Forbidden" as const, status: 403 as const };
  return null;
}

async function postHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { id: bundleId } = await params;
    if (!bundleId) return NextResponse.json({ error: "Bundle ID required" }, { status: 400 });
    const body = await request.json();
    const resourceId = typeof body?.resource_id === "string" ? body.resource_id.trim() : "";
    if (!resourceId) return NextResponse.json({ error: "resource_id required" }, { status: 400 });
    const sortOrder =
      typeof body?.sort_order === "number" && Number.isFinite(body.sort_order)
        ? Math.floor(body.sort_order)
        : undefined;
    const result = await addResourceBundleItem(bundleId, resourceId, sortOrder);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events/bundles/[id]/items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function deleteHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { id: bundleId } = await params;
    if (!bundleId) return NextResponse.json({ error: "Bundle ID required" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const resourceId = typeof body?.resource_id === "string" ? body.resource_id.trim() : "";
    if (!resourceId) return NextResponse.json({ error: "resource_id required" }, { status: 400 });
    const result = await removeResourceBundleItem(bundleId, resourceId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("DELETE /api/events/bundles/[id]/items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(postHandler);
export const DELETE = withRateLimit(deleteHandler);
