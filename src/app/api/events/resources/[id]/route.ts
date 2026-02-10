import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getResources, updateResource, deleteResource } from "@/lib/supabase/participants-resources";
import type { ResourceUpdate } from "@/lib/supabase/participants-resources";
import { getCalendarResourceTypes } from "@/lib/supabase/settings";
import { withRateLimit } from "@/lib/api/middleware";

async function requireAdmin() {
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const metadata = user.user_metadata as { type?: string } | undefined;
  const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";
  if (!isAdmin) return { error: "Forbidden" as const, status: 403 as const };
  return null;
}

/**
 * GET /api/events/resources/[id]
 * Get a single resource by ID. Admin only.
 */
async function getHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Resource ID required" }, { status: 400 });
  const resources = await getResources();
  const resource = resources.find((r) => r.id === id);
  if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  return NextResponse.json({ data: resource });
}

/**
 * PUT /api/events/resources/[id]
 * Update a resource. Body: { name?, resource_type?, metadata?, is_exclusive? }. Admin only.
 */
async function putHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Resource ID required" }, { status: 400 });
  const body = await request.json();
  const input: ResourceUpdate = {};
  if (typeof body?.name === "string") input.name = body.name.trim();
  if (body?.resource_type !== undefined) {
    const allowedTypes = await getCalendarResourceTypes();
    const allowedSlugs = allowedTypes.map((t) => t.slug);
    if (allowedSlugs.includes(body.resource_type)) input.resource_type = body.resource_type;
  }
  if (body?.metadata !== undefined) input.metadata = body.metadata;
  if (typeof body?.is_exclusive === "boolean") input.is_exclusive = body.is_exclusive;
  const result = await updateResource(id, input);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}

/**
 * DELETE /api/events/resources/[id]
 * Delete a resource. Admin only.
 */
async function deleteHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Resource ID required" }, { status: 400 });
  const result = await deleteResource(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}

export const GET = withRateLimit(getHandler);
export const PUT = withRateLimit(putHandler);
export const DELETE = withRateLimit(deleteHandler);
