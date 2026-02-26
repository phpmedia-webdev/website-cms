import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { deleteColorPalette, updateColorPalette } from "@/lib/supabase/color-palettes";
import type { ColorPalettePayload } from "@/types/color-palette";

/**
 * DELETE /api/admin/color-palettes/[id]
 * Delete a custom color palette
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const success = await deleteColorPalette(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete color palette" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Color palette deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting color palette:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/color-palettes/[id]
 * Update a custom color palette
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const payload = body as Partial<ColorPalettePayload>;

    const palette = await updateColorPalette(id, payload);

    if (!palette) {
      return NextResponse.json(
        { error: "Failed to update color palette" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      palette,
    });
  } catch (error: any) {
    console.error("Error updating color palette:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
