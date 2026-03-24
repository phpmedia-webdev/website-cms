import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import {
  getEventResourceRows,
  assignResourceToEvent,
  replaceEventResourceAssignments,
} from "@/lib/supabase/participants-resources";
import { getEventById, getResourceConflicts } from "@/lib/supabase/events";
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
  const assignments = await getEventResourceRows(id);
  return NextResponse.json({ data: { assignments } });
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
  const resourceId = typeof body?.resource_id === "string" ? body.resource_id.trim() : "";
  if (!resourceId) return NextResponse.json({ error: "resource_id required" }, { status: 400 });
  const bundleRaw = body?.bundle_instance_id;
  let opts: { bundleInstanceId?: string | null } | undefined;
  if (Object.prototype.hasOwnProperty.call(body, "bundle_instance_id")) {
    if (bundleRaw === null) opts = { bundleInstanceId: null };
    else if (typeof bundleRaw === "string" && bundleRaw.trim()) {
      opts = { bundleInstanceId: bundleRaw.trim() };
    }
  }
  const eventRow = await getEventById(id);
  if (!eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const evStart = new Date(eventRow.start_date);
  const evEnd = new Date(eventRow.end_date);
  const rc = await getResourceConflicts(evStart, evEnd, [resourceId], id);
  if (rc.length > 0) {
    return NextResponse.json(
      {
        error: "Exclusive resource is already assigned to another event in this time range",
        resource_conflicts: rc,
      },
      { status: 409 }
    );
  }

  const result =
    opts === undefined
      ? await assignResourceToEvent(id, resourceId)
      : await assignResourceToEvent(id, resourceId, undefined, opts);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ data: { resource_id: resourceId } }, { status: 201 });
}

async function putHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin();
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  const body = await request.json();
  const raw = body?.assignments;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "assignments array required" }, { status: 400 });
  }
  const assignments: Array<{ resource_id: string; bundle_instance_id: string | null }> = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const resource_id = typeof (row as { resource_id?: string }).resource_id === "string"
      ? (row as { resource_id: string }).resource_id.trim()
      : "";
    if (!resource_id) continue;
    const b = (row as { bundle_instance_id?: unknown }).bundle_instance_id;
    const bundle_instance_id =
      b === null || b === undefined
        ? null
        : typeof b === "string" && b.trim()
          ? b.trim()
          : null;
    assignments.push({ resource_id, bundle_instance_id });
  }

  const eventRow = await getEventById(id);
  if (!eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const resourceIds = [...new Set(assignments.map((a) => a.resource_id))];
  const evStart = new Date(eventRow.start_date);
  const evEnd = new Date(eventRow.end_date);
  const resourceConflicts = await getResourceConflicts(evStart, evEnd, resourceIds, id);
  if (resourceConflicts.length > 0) {
    return NextResponse.json(
      {
        error: "Exclusive resource is already assigned to another event in this time range",
        resource_conflicts: resourceConflicts,
      },
      { status: 409 }
    );
  }

  const result = await replaceEventResourceAssignments(id, assignments);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ data: { ok: true } });
}

export const GET = withRateLimit(getHandler);
export const POST = withRateLimit(postHandler);
export const PUT = withRateLimit(putHandler);
