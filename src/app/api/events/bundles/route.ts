/**
 * GET /api/events/bundles — List resource bundles with member resources (admin).
 * POST /api/events/bundles — Create bundle { name, description? }.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import {
  listResourceBundlesWithItems,
  listResourceBundlesWithItemsForPicker,
  createResourceBundle,
  type ResourcePickerContext,
} from "@/lib/supabase/participants-resources";
import { withRateLimit } from "@/lib/api/middleware";

async function requireAdmin() {
  const supabase = await createServerSupabaseClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const metadata = user.user_metadata as { type?: string } | undefined;
  const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";
  if (!isAdmin) return { error: "Forbidden" as const, status: 403 as const };
  return null;
}

async function getHandler(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("context")?.trim().toLowerCase() ?? "";
    let data;
    if (!raw) {
      data = await listResourceBundlesWithItems();
    } else if (raw === "calendar" || raw === "task") {
      data = await listResourceBundlesWithItemsForPicker(raw as ResourcePickerContext);
    } else {
      return NextResponse.json(
        { error: "Invalid context. Use calendar, task, or omit for full bundle definitions." },
        { status: 400 }
      );
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/events/bundles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function postHandler(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const description =
      body?.description === undefined || body?.description === null
        ? null
        : typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    const result = await createResourceBundle({ name, description });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ data: { id: result.id } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events/bundles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(getHandler);
export const POST = withRateLimit(postHandler);
