/**
 * GET /api/tasks/[id]/followers — List followers for a task.
 * POST /api/tasks/[id]/followers — Add a follower (body: role, contact_id? | user_id?).
 * DELETE /api/tasks/[id]/followers — Remove a follower (body: id = follower row id).
 * Admin only. Task visibility enforced via getTaskById.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getTaskById,
  getTaskFollowers,
  addTaskFollower,
  deleteTaskFollower,
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

    const followers = await getTaskFollowers(taskId);
    return NextResponse.json(followers);
  } catch (error) {
    console.error("GET /api/tasks/[id]/followers error:", error);
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
    const role = body.role as string | undefined;
    if (!role || !["creator", "responsible", "follower"].includes(role)) {
      return NextResponse.json({ error: "role must be creator, responsible, or follower" }, { status: 400 });
    }
    const contactId = typeof body.contact_id === "string" ? body.contact_id : undefined;
    const userId = typeof body.user_id === "string" ? body.user_id : undefined;
    const result = await addTaskFollower(taskId, {
      role: role as "creator" | "responsible" | "follower",
      user_id: userId ?? null,
      contact_id: contactId ?? null,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("POST /api/tasks/[id]/followers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : undefined;
    if (!id) return NextResponse.json({ error: "Follower id required" }, { status: 400 });

    const result = await deleteTaskFollower(id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id]/followers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
