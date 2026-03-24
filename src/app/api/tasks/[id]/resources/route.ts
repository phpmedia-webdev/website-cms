/**
 * GET /api/tasks/[id]/resources — List resource assignments (enriched with registry name/type).
 * POST /api/tasks/[id]/resources — Assign resource (body: resource_id, optional bundle_instance_id).
 * DELETE /api/tasks/[id]/resources — Unassign by resource_id OR by bundle_instance_id (body).
 * Admin only. Task must exist.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getTaskById } from "@/lib/supabase/projects";
import {
  getResourcesAdmin,
  getTaskResourceRows,
  assignResourceToTask,
  unassignResourceFromTask,
  unassignBundleInstanceFromTask,
  replaceTaskResourceAssignments,
} from "@/lib/supabase/participants-resources";
import type { TaskResourceAssignmentDto } from "@/lib/tasks/task-resources-api";

async function requireAdmin(): Promise<{ error: string; status: number } | null> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required", status: 403 };
  }
  return null;
}

async function listEnriched(taskId: string): Promise<TaskResourceAssignmentDto[]> {
  const [rows, catalog] = await Promise.all([
    getTaskResourceRows(taskId),
    getResourcesAdmin(),
  ]);
  const byId = new Map(catalog.map((r) => [r.id, r]));
  return rows.map((row) => {
    const meta = byId.get(row.resource_id);
    return {
      resource_id: row.resource_id,
      bundle_instance_id: row.bundle_instance_id,
      name: meta?.name?.trim() ? meta.name.trim() : "Unknown resource",
      resource_type: meta?.resource_type ?? "",
    };
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const { id: taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const task = await getTaskById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const data = await listEnriched(taskId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/tasks/[id]/resources error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const { id: taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const task = await getTaskById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await request.json();
    const resourceId = typeof body?.resource_id === "string" ? body.resource_id.trim() : "";
    if (!resourceId) {
      return NextResponse.json({ error: "resource_id required" }, { status: 400 });
    }

    let assignOpts: { bundleInstanceId?: string | null } | undefined;
    if (Object.prototype.hasOwnProperty.call(body, "bundle_instance_id")) {
      const b = body.bundle_instance_id;
      if (b === null) {
        assignOpts = { bundleInstanceId: null };
      } else if (typeof b === "string" && b.trim()) {
        assignOpts = { bundleInstanceId: b.trim() };
      } else if (typeof b === "string" && !b.trim()) {
        return NextResponse.json({ error: "bundle_instance_id must be non-empty or null" }, { status: 400 });
      } else if (b !== undefined) {
        return NextResponse.json({ error: "bundle_instance_id must be string or null" }, { status: 400 });
      }
    }

    const result =
      assignOpts === undefined
        ? await assignResourceToTask(taskId, resourceId)
        : await assignResourceToTask(taskId, resourceId, undefined, assignOpts);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: { resource_id: resourceId } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/resources error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const { id: taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const task = await getTaskById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await request.json();
    const raw = body?.assignments;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: "assignments array required" }, { status: 400 });
    }
    const assignments: Array<{ resource_id: string; bundle_instance_id: string | null }> = [];
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const resource_id =
        typeof (row as { resource_id?: string }).resource_id === "string"
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
    const result = await replaceTaskResourceAssignments(taskId, assignments);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("PUT /api/tasks/[id]/resources error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const { id: taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const task = await getTaskById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const resourceId = typeof body?.resource_id === "string" ? body.resource_id.trim() : "";
    const bundleId =
      typeof body?.bundle_instance_id === "string" ? body.bundle_instance_id.trim() : "";

    if (resourceId && bundleId) {
      return NextResponse.json(
        { error: "Send either resource_id or bundle_instance_id, not both" },
        { status: 400 }
      );
    }
    if (!resourceId && !bundleId) {
      return NextResponse.json(
        { error: "resource_id or bundle_instance_id required" },
        { status: 400 }
      );
    }

    if (bundleId) {
      const result = await unassignBundleInstanceFromTask(taskId, bundleId);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ data: { ok: true } });
    }

    const result = await unassignResourceFromTask(taskId, resourceId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("DELETE /api/tasks/[id]/resources error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
