/**
 * GET /api/projects/[id] — Get project (admin).
 * PUT /api/projects/[id] — Update project (admin).
 * DELETE /api/projects/[id] — Delete project (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getProjectById,
  updateProject,
  deleteProject,
  type ProjectUpdate,
} from "@/lib/supabase/projects";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required" as const, status: 403 as const };
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
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
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const body = await request.json();
    const input: ProjectUpdate = {};
    if (typeof body?.name === "string") input.name = body.name.trim();
    if (body?.description !== undefined) input.description = body.description;
    if (body?.status !== undefined) input.status = body.status;
    if (body?.proposed_start_date !== undefined)
      input.proposed_start_date = body.proposed_start_date;
    if (body?.proposed_end_date !== undefined)
      input.proposed_end_date = body.proposed_end_date;
    if (body?.potential_sales !== undefined)
      input.potential_sales = body.potential_sales;
    if (body?.required_mag_id !== undefined)
      input.required_mag_id = body.required_mag_id;
    if (body?.archived_at !== undefined) input.archived_at = body.archived_at;

    const result = await updateProject(id, input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const result = await deleteProject(id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
