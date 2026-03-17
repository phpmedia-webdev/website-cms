/**
 * GET /api/projects/[id]/tasks — List tasks for a project (admin). Query: status, task_type.
 * POST /api/projects/[id]/tasks — Create task in project (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getProjectById,
  listTasks,
  createTask,
  type TaskStatus,
  type TaskType,
  type TaskInsert,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TaskStatus | null;
    const task_type = searchParams.get("task_type") as TaskType | null;

    const tasks = await listTasks({
      project_id: projectId,
      status: status ?? undefined,
      task_type: task_type ?? undefined,
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/projects/[id]/tasks error:", error);
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
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const input: TaskInsert = {
      project_id: projectId,
      title,
      description: typeof body.description === "string" ? body.description : undefined,
      status: body.status as TaskInsert["status"] | undefined,
      task_type: body.task_type as TaskInsert["task_type"] | undefined,
      priority: body.priority as TaskInsert["priority"] | undefined,
      proposed_time: typeof body.proposed_time === "number" ? body.proposed_time : undefined,
      actual_time: typeof body.actual_time === "number" ? body.actual_time : undefined,
      due_date: body.due_date ?? undefined,
      start_date: body.start_date ?? undefined,
      creator_id: body.creator_id ?? undefined,
      responsible_id: body.responsible_id ?? undefined,
    };

    const result = await createTask(input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/tasks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
