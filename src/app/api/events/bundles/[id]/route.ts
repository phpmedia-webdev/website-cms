/**
 * GET /api/events/bundles/[id] — One bundle with items.
 * PUT /api/events/bundles/[id] — Update name / description.
 * DELETE /api/events/bundles/[id] — Delete bundle (cascades items).
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import {
  listResourceBundlesWithItems,
  updateResourceBundle,
  deleteResourceBundle,
} from "@/lib/supabase/participants-resources";
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

async function getHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Bundle ID required" }, { status: 400 });
    const all = await listResourceBundlesWithItems();
    const bundle = all.find((b) => b.id === id);
    if (!bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    return NextResponse.json({ data: bundle });
  } catch (error) {
    console.error("GET /api/events/bundles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function putHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Bundle ID required" }, { status: 400 });
    const body = await request.json();
    const patch: { name?: string; description?: string | null } = {};
    if (typeof body?.name === "string") patch.name = body.name.trim();
    if (body?.description === null) patch.description = null;
    else if (typeof body?.description === "string") patch.description = body.description.trim() || null;
    const result = await updateResourceBundle(id, patch);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("PUT /api/events/bundles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function deleteHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Bundle ID required" }, { status: 400 });
    const result = await deleteResourceBundle(id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("DELETE /api/events/bundles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(getHandler);
export const PUT = withRateLimit(putHandler);
export const DELETE = withRateLimit(deleteHandler);
