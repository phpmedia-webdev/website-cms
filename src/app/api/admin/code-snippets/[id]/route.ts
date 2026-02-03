import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import {
  getCodeSnippetById,
  updateCodeSnippet,
  deleteCodeSnippet,
} from "@/lib/supabase/code-snippets";

/**
 * GET /api/admin/code-snippets/[id] — get one (superadmin only).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const { id } = await params;
    const item = await getCodeSnippetById(id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error("GET /api/admin/code-snippets/[id]:", error);
    return NextResponse.json(
      { error: "Failed to fetch code snippet" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/code-snippets/[id] — update (superadmin only). Body: { title?, type?, description?, code? }.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const { id } = await params;
    const body = await request.json();
    const ok = await updateCodeSnippet(id, {
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      type: body.type !== undefined ? (body.type == null ? null : String(body.type)) : undefined,
      description:
        body.description !== undefined
          ? (body.description == null ? null : String(body.description))
          : undefined,
      code: body.code !== undefined ? String(body.code) : undefined,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to update snippet" },
        { status: 500 }
      );
    }
    const item = await getCodeSnippetById(id);
    return NextResponse.json(item ?? { id });
  } catch (error) {
    console.error("PATCH /api/admin/code-snippets/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update code snippet" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/code-snippets/[id] — delete (superadmin only).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const { id } = await params;
    const ok = await deleteCodeSnippet(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to delete snippet" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/code-snippets/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete code snippet" },
      { status: 500 }
    );
  }
}
