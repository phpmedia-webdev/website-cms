/**
 * GET /api/projects — List projects (admin). Query: status, required_mag_id, include_archived.
 * POST /api/projects — Create project (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  listProjects,
  createProject,
  type ProjectStatus,
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
    const status = searchParams.get("status") as ProjectStatus | null;
    const required_mag_id = searchParams.get("required_mag_id") ?? undefined;
    const include_archived = searchParams.get("include_archived") === "true";

    const projects = await listProjects({
      status: status ?? undefined,
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

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const input: ProjectInsert = {
      name,
      description: typeof body.description === "string" ? body.description : undefined,
      status: body.status as ProjectInsert["status"] | undefined,
      proposed_start_date: body.proposed_start_date ?? undefined,
      proposed_end_date: body.proposed_end_date ?? undefined,
      potential_sales: typeof body.potential_sales === "number" ? body.potential_sales : undefined,
      required_mag_id: body.required_mag_id ?? undefined,
      created_by: body.created_by ?? undefined,
    };

    const result = await createProject(input);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
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
