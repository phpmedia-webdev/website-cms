/**
 * GET /api/tasks/[id] — Get task (admin).
 * PUT /api/tasks/[id] — Update task (admin). Auto-extends project end when due_date > project proposed_end_date.
 * DELETE /api/tasks/[id] — Delete task (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getTaskById,
  updateTask,
  deleteTask,
  type TaskUpdate,
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
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/tasks/[id] error:", error);
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
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const body = await request.json();
    const input: TaskUpdate = {};
    if (typeof body?.title === "string") input.title = body.title.trim();
    if (body?.description !== undefined) input.description = body.description;
    if (body?.status !== undefined) input.status = body.status;
    if (body?.task_type !== undefined) input.task_type = body.task_type;
    if (body?.priority !== undefined) input.priority = body.priority;
    if (body?.proposed_time !== undefined) input.proposed_time = body.proposed_time;
    if (body?.actual_time !== undefined) input.actual_time = body.actual_time;
    if (body?.due_date !== undefined) input.due_date = body.due_date;
    if (body?.start_date !== undefined) input.start_date = body.start_date;
    if (body?.responsible_id !== undefined) input.responsible_id = body.responsible_id;

    const result = await updateTask(id, input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/tasks/[id] error:", error);
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
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const result = await deleteTask(id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
