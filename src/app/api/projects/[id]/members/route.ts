/**
 * GET /api/projects/[id]/members — List project members.
 * POST /api/projects/[id]/members — Add a member (body: user_id? | contact_id?, role_term_id?).
 * DELETE /api/projects/[id]/members — Remove a member (body: id = member row id).
 * Admin only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import {
  getProjectById,
  listProjectMembers,
  getProjectRoleTerms,
  addProjectMember,
  removeProjectMember,
} from "@/lib/supabase/projects";
import { getContactById } from "@/lib/supabase/crm";
import { getProfileByUserId } from "@/lib/supabase/profiles";

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const { id: projectId } = await params;
    if (!projectId) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

    const project = await getProjectById(projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const members = await listProjectMembers(projectId);
    const withLabels = new URL(request.url).searchParams.get("with_labels") === "1";
    if (!withLabels) {
      return NextResponse.json(members);
    }

    const projectRoleTerms = await getProjectRoleTerms();
    const membersWithLabels = await Promise.all(
      members.map(async (m) => {
        let label = "—";
        if (m.contact_id) {
          const c = await getContactById(m.contact_id);
          label = c?.full_name ?? c?.email ?? m.contact_id;
        } else if (m.user_id) {
          const p = await getProfileByUserId(m.user_id);
          label = p?.display_name ?? m.user_id;
        }
        const roleTerm = projectRoleTerms.find((t) => t.id === m.role_term_id);
        return {
          ...m,
          label,
          role_label: roleTerm?.name ?? null,
        };
      })
    );
    return NextResponse.json(membersWithLabels);
  } catch (error) {
    console.error("GET /api/projects/[id]/members error:", error);
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

    const { id: projectId } = await params;
    if (!projectId) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

    const project = await getProjectById(projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.user_id === "string" ? body.user_id : undefined;
    const contactId = typeof body.contact_id === "string" ? body.contact_id : undefined;
    const roleTermId = typeof body.role_term_id === "string" ? body.role_term_id : body.role_term_id === null ? null : undefined;

    const result = await addProjectMember(projectId, {
      user_id: userId ?? null,
      contact_id: contactId ?? null,
      role_term_id: roleTermId,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("POST /api/projects/[id]/members error:", error);
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
    if (!id) return NextResponse.json({ error: "Member id required" }, { status: 400 });

    const result = await removeProjectMember(id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/members error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
