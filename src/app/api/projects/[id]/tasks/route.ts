/**
 * GET /api/projects/[id]/tasks — List tasks for a project (admin). Query: status_slug, type_slug.
 * POST /api/projects/[id]/tasks — Create task in project (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  addTaskFollower,
  deleteTask,
  getProjectById,
  listTasks,
  createTask,
} from "@/lib/supabase/projects";
import { buildTaskInsertFromBody } from "@/lib/tasks/task-create-input";

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
    const status_slug = searchParams.get("status_slug")?.trim().toLowerCase() ?? undefined;
    const type_slug = searchParams.get("type_slug")?.trim().toLowerCase() ?? undefined;

    const tasks = await listTasks({
      project_ids: [projectId],
      status_slugs: status_slug ? [status_slug] : null,
      type_slugs: type_slug ? [type_slug] : null,
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
    const user = await getCurrentUser();
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const parsed = buildTaskInsertFromBody(body, projectId);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    parsed.input.creator_id = user.id;

    const result = await createTask(parsed.input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    const creatorFollow = await addTaskFollower(result.id, {
      role: "creator",
      user_id: user.id,
      contact_id: null,
    });
    if ("error" in creatorFollow) {
      await deleteTask(result.id);
      return NextResponse.json(
        { error: "Failed to assign creator on task creation. No task was created." },
        { status: 500 }
      );
    }
    return NextResponse.json({ id: result.id, task_number: result.task_number }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/tasks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
