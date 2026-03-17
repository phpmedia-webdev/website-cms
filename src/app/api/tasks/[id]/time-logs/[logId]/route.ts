/**
 * PATCH /api/tasks/[id]/time-logs/[logId] — Update a time log entry.
 * DELETE /api/tasks/[id]/time-logs/[logId] — Delete a time log entry.
 * Admin only. Verifies log belongs to task (task_id === id).
 */

import { NextResponse } from "next/server";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getTaskTimeLogById,
  updateTaskTimeLog,
  deleteTaskTimeLog,
  type TaskTimeLogUpdate,
} from "@/lib/supabase/projects";

async function requireAdmin(): Promise<{ error: string; status: number } | null> {
  const { getCurrentUser } = await import("@/lib/auth/supabase-auth");
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required", status: 403 };
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const { id: taskId, logId } = await params;
    if (!taskId || !logId) {
      return NextResponse.json({ error: "Task ID and log ID required" }, { status: 400 });
    }

    const log = await getTaskTimeLogById(logId);
    if (!log) return NextResponse.json({ error: "Time log not found" }, { status: 404 });
    if (log.task_id !== taskId) {
      return NextResponse.json({ error: "Time log does not belong to this task" }, { status: 403 });
    }

    const body = await request.json();
    const input: TaskTimeLogUpdate = {};
    if (typeof body.log_date === "string") input.log_date = body.log_date.trim();
    if (typeof body.minutes === "number") input.minutes = body.minutes;
    else if (body.minutes !== undefined) input.minutes = Number(body.minutes);
    if (body.note !== undefined) input.note = typeof body.note === "string" ? body.note.trim() || null : null;
    if (input.minutes !== undefined && (!Number.isInteger(input.minutes) || input.minutes < 0)) {
      return NextResponse.json({ error: "minutes must be a non-negative integer" }, { status: 400 });
    }

    const result = await updateTaskTimeLog(logId, input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/tasks/[id]/time-logs/[logId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const { id: taskId, logId } = await params;
    if (!taskId || !logId) {
      return NextResponse.json({ error: "Task ID and log ID required" }, { status: 400 });
    }

    const log = await getTaskTimeLogById(logId);
    if (!log) return NextResponse.json({ error: "Time log not found" }, { status: 404 });
    if (log.task_id !== taskId) {
      return NextResponse.json({ error: "Time log does not belong to this task" }, { status: 403 });
    }

    const result = await deleteTaskTimeLog(logId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id]/time-logs/[logId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
