import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { isSuperadminAsync } from "@/lib/auth/resolve-role";
import { listCodeSnippets, createCodeSnippet } from "@/lib/supabase/code-snippets";

/**
 * GET /api/admin/code-snippets — list all (superadmin only). Query: type (optional filter).
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isSuperadminAsync())) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const items = await listCodeSnippets(type ?? null);
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/admin/code-snippets:", error);
    return NextResponse.json(
      { error: "Failed to fetch code snippets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/code-snippets — create (superadmin only). Body: { title, type?, description?, code }.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isSuperadminAsync())) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { title, type, description, code } = body;
    if (!title || typeof code !== "string") {
      return NextResponse.json(
        { error: "title and code are required" },
        { status: 400 }
      );
    }
    const created = await createCodeSnippet({
      title: String(title).trim(),
      type: type != null ? String(type) : null,
      description: description != null ? String(description) : null,
      code,
    });
    if (!created) {
      return NextResponse.json(
        { error: "Failed to create snippet" },
        { status: 500 }
      );
    }
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST /api/admin/code-snippets:", error);
    return NextResponse.json(
      { error: "Failed to create code snippet" },
      { status: 500 }
    );
  }
}
