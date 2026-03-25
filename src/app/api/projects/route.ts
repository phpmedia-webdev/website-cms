/**
 * GET /api/projects — List projects (admin). Query: status_term_id, required_mag_id, include_archived.
 * POST /api/projects — Create project (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  listProjects,
  listProjectsForEventLinking,
  createProject,
  addProjectMember,
  type ProjectInsert,
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

export async function GET(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { searchParams } = new URL(request.url);
    const forEventLink = searchParams.get("for_event_link") === "true";

    if (forEventLink) {
      const projects = await listProjectsForEventLinking();
      return NextResponse.json({ projects });
    }

    const status_term_id = searchParams.get("status_term_id") ?? undefined;
    const required_mag_id = searchParams.get("required_mag_id") ?? undefined;
    const include_archived = searchParams.get("include_archived") === "true";

    const projects = await listProjects({
      status_term_id: status_term_id || undefined,
      required_mag_id: required_mag_id || undefined,
      include_archived,
    });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const input: ProjectInsert = {
      name,
      description: typeof body.description === "string" ? body.description : undefined,
      status_term_id: typeof body.status_term_id === "string" ? body.status_term_id : undefined,
      project_type_term_id:
        typeof body.project_type_term_id === "string" ? body.project_type_term_id : undefined,
      start_date: body.start_date ?? undefined,
      due_date: body.due_date ?? undefined,
      completed_date: body.completed_date ?? undefined,
      planned_time:
        typeof body.planned_time === "number"
          ? body.planned_time
          : typeof body.proposed_time === "number"
            ? body.proposed_time
            : undefined,
      potential_sales: typeof body.potential_sales === "number" ? body.potential_sales : undefined,
      required_mag_id: body.required_mag_id ?? undefined,
      contact_id: body.contact_id ?? undefined,
      client_organization_id: body.client_organization_id ?? undefined,
      created_by: body.created_by ?? user.id,
    };

    const result = await createProject(input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    const addMemberResult = await addProjectMember(result.id, { user_id: user.id });
    if ("error" in addMemberResult) {
      console.error("Add creator as project member:", addMemberResult.error);
    }
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
