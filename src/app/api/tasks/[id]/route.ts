/**
 * GET /api/tasks/[id] — Get task (admin).
 * PUT /api/tasks/[id] — Update task (admin). Auto-extends project due_date when task due_date > project due_date.
 * DELETE /api/tasks/[id] — Delete task (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getTaskById,
  updateTask,
  deleteTask,
  getTaskFollowers,
  type TaskUpdate,
} from "@/lib/supabase/projects";
import { logTaskStatusChange } from "@/lib/supabase/crm";
import { getTaskStatusLabelForSlug } from "@/lib/tasks/task-customizer-labels";
import { getClientSchema } from "@/lib/supabase/schema";

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
    if (body?.task_status_slug !== undefined) input.task_status_slug = body.task_status_slug;
    if (body?.task_type_slug !== undefined) input.task_type_slug = body.task_type_slug;
    if (body?.task_phase_slug !== undefined) input.task_phase_slug = body.task_phase_slug;
    if (body?.priority_term_id !== undefined) input.priority_term_id = body.priority_term_id;
    if (body?.planned_time !== undefined) input.planned_time = body.planned_time;
    else if (body?.proposed_time !== undefined) input.planned_time = body.proposed_time;
    if (body?.actual_time !== undefined) input.actual_time = body.actual_time;
    if (body?.due_date !== undefined) input.due_date = body.due_date;
    if (body?.start_date !== undefined) input.start_date = body.start_date;
    if (body?.responsible_id !== undefined) input.responsible_id = body.responsible_id;
    if (body?.contact_id !== undefined) {
      if (body.contact_id === null || body.contact_id === "") {
        input.contact_id = null;
      } else if (typeof body.contact_id === "string") {
        input.contact_id = body.contact_id.trim() || null;
      }
    }
    if (body?.project_id !== undefined) {
      if (body.project_id === null || body.project_id === "") {
        input.project_id = null;
      } else if (typeof body.project_id === "string") {
        input.project_id = body.project_id.trim();
      }
    }

    const existing = await getTaskById(id);
    const result = await updateTask(id, input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    const newStatusSlug = input.task_status_slug;
    if (
      existing &&
      newStatusSlug !== undefined &&
      newStatusSlug != null &&
      String(newStatusSlug).trim().toLowerCase() !==
        String(existing.task_status_slug).trim().toLowerCase()
    ) {
      const followers = await getTaskFollowers(id);
      const contactIdsSet = new Set<string>();
      if (existing.contact_id) contactIdsSet.add(existing.contact_id);
      for (const f of followers) {
        if (f.contact_id) contactIdsSet.add(f.contact_id);
      }
      const contactIds = Array.from(contactIdsSet);
      if (contactIds.length > 0) {
        const schema = getClientSchema();
        const statusLabel = await getTaskStatusLabelForSlug(String(newStatusSlug), schema);
        await logTaskStatusChange(id, existing.title, statusLabel, contactIds);
      }
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
