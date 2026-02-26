import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import { getRoleBySlug, deleteRole } from "@/lib/supabase/feature-registry";

type RouteParams = { params: Promise<{ roleSlug: string }> };

/**
 * DELETE /api/admin/roles/[roleSlug]
 * Delete a role (superadmin only). System roles (Admin, Editor, Creator, Viewer) cannot be deleted.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isSuperadminAsync())) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    const { roleSlug } = await params;
    const role = await getRoleBySlug(roleSlug);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const deleted = await deleteRole(roleSlug);
    if (!deleted) {
      return NextResponse.json(
        { error: "Cannot delete system role" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/roles/[roleSlug]:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
