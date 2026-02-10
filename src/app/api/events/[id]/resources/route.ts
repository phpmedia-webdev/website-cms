import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import {
  getEventResourceIds,
  assignResourceToEvent,
  unassignResourceFromEvent,
} from "@/lib/supabase/participants-resources";
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

async function getHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  const resourceIds = await getEventResourceIds(id);
  return NextResponse.json({ data: resourceIds });
}

async function postHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  const body = await request.json();
  const resourceId = typeof body?.resource_id === "string" ? body.resource_id : null;
  if (!resourceId) return NextResponse.json({ error: "resource_id required" }, { status: 400 });
  const result = await assignResourceToEvent(id, resourceId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ data: { resource_id: resourceId } }, { status: 201 });
}

async function deleteHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  const body = await request.json();
  const resourceId = typeof body?.resource_id === "string" ? body.resource_id : null;
  if (!resourceId) return NextResponse.json({ error: "resource_id required" }, { status: 400 });
  const result = await unassignResourceFromEvent(id, resourceId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}

export const GET = withRateLimit(getHandler);
export const POST = withRateLimit(postHandler);
export const DELETE = withRateLimit(deleteHandler);
