/**
 * POST /api/members/support — Submit a support ticket (GPUM).
 * Ensures handle exists, gets or creates perpetual Support project for the member's contact,
 * creates a support_ticket task, adds the contact as creator follower. Returns { taskId }.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMemberByUserId } from "@/lib/supabase/members";
import {
  getOrCreateSupportProjectForContact,
  createTask,
  addTaskFollower,
  DEFAULT_TASK_PHASE_SLUG,
  DEFAULT_TASK_STATUS_SLUG,
  DEFAULT_TASK_TYPE_SLUG,
} from "@/lib/supabase/projects";
import {
  getTermBySlugAndType,
  setTaxonomyForContentServer,
} from "@/lib/supabase/taxonomy";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const member = await getMemberByUserId(user.id);
  if (!member?.contact_id) {
    return NextResponse.json(
      { error: "Member account or contact not found" },
      { status: 403 }
    );
  }
  let body: { title?: string; description?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }
  const description =
    typeof body.description === "string" ? body.description.trim() : null;

  try {
    // Ensure handle exists (required for ticket creation / thread)
    const ensureRes = await fetch(
      new URL("/api/members/ensure-handle", request.url).toString(),
      { method: "POST", headers: request.headers }
    );
    if (!ensureRes.ok) {
      const data = await ensureRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.error ?? "Failed to ensure handle" },
        { status: 500 }
      );
    }

    const support = await getOrCreateSupportProjectForContact(member.contact_id);
    if ("error" in support) {
      return NextResponse.json(
        { error: support.error },
        { status: 500 }
      );
    }

    if (support.created) {
      const term = await getTermBySlugAndType("support-ticket", "category");
      if (term?.id) {
        await setTaxonomyForContentServer(support.id, "project", [term.id]);
      }
    }

    const taskResult = await createTask({
      project_id: support.id,
      title,
      description: description ?? undefined,
      task_status_slug: DEFAULT_TASK_STATUS_SLUG,
      task_type_slug: DEFAULT_TASK_TYPE_SLUG,
      task_phase_slug: DEFAULT_TASK_PHASE_SLUG,
      contact_id: member.contact_id,
    });
    if ("error" in taskResult) {
      return NextResponse.json(
        { error: taskResult.error },
        { status: 500 }
      );
    }

    await addTaskFollower(taskResult.id, {
      role: "creator",
      contact_id: member.contact_id,
    });

    return NextResponse.json({
      taskId: taskResult.id,
      taskNumber: taskResult.task_number,
    });
  } catch (e) {
    console.error("POST /api/members/support:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to create support ticket",
      },
      { status: 500 }
    );
  }
}
