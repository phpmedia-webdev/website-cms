/**
 * GET /api/tasks — List all tasks (admin). Query: project_id, status, task_type.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { listTasks } from "@/lib/supabase/projects";
import type { TaskStatus, TaskType } from "@/lib/supabase/projects";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required" as const, status: 403 as const };
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get("project_id") ?? undefined;
    const status = searchParams.get("status") as TaskStatus | null;
    const task_type = searchParams.get("task_type") as TaskType | null;

    const tasks = await listTasks({
      project_id: project_id || undefined,
      status: status ?? undefined,
      task_type: task_type ?? undefined,
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
