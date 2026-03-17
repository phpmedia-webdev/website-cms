/**
 * GET /api/tasks/[id]/time-logs — List time log entries for a task.
 * POST /api/tasks/[id]/time-logs — Create a time log entry.
 * Admin only. Task visibility enforced via getTaskById.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getTaskById,
  listTaskTimeLogs,
  createTaskTimeLog,
  type TaskTimeLogInsert,
} from "@/lib/supabase/projects";

async function requireAdmin(): Promise<{ error: string; status: number } | null> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required", status: 403 };
  }
  return null;
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

    const logs = await listTaskTimeLogs(taskId);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /api/tasks/[id]/time-logs error:", error);
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

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const task = await getTaskById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await request.json();
    const logDate = typeof body.log_date === "string" ? body.log_date.trim() : "";
    const minutes = typeof body.minutes === "number" ? body.minutes : Number(body.minutes);
    if (!logDate) return NextResponse.json({ error: "log_date required" }, { status: 400 });
    if (!Number.isInteger(minutes) || minutes < 0) {
      return NextResponse.json({ error: "minutes must be a non-negative integer" }, { status: 400 });
    }

    // Record current user as author (admin or superadmin). "Who" is resolved via getDisplayLabelForUser (profile/Auth).
    const input: TaskTimeLogInsert = {
      log_date: logDate,
      minutes,
      note: typeof body.note === "string" ? body.note.trim() || null : null,
      user_id: body.user_id ?? user.id,
      contact_id: body.contact_id ?? null,
    };

    const result = await createTaskTimeLog(taskId, input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("POST /api/tasks/[id]/time-logs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
