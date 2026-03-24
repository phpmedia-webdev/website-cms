import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import {
  getResourcesAdmin,
  getResourcesAdminForPicker,
  createResource,
  type ResourcePickerContext,
} from "@/lib/supabase/participants-resources";
import type { ResourceInsert } from "@/lib/supabase/participants-resources";
import { getCalendarResourceTypes } from "@/lib/supabase/settings";
import { withRateLimit } from "@/lib/api/middleware";

async function requireAdmin() {
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const metadata = user.user_metadata as { type?: string } | undefined;
  const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";
  if (!isAdmin) return { error: "Forbidden" as const, status: 403 as const };
  return null;
}

/**
 * GET /api/events/resources
 * List resources. Admin only.
 *
 * Query: `context` — omit = full registry (Resource manager). `calendar` | `task` = picker lists only
 * rows allowed for that surface (migration 183: `is_schedulable_*`, not archived, not retired).
 */
async function getHandler(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("context")?.trim().toLowerCase() ?? "";
    let resources;
    if (!raw) {
      resources = await getResourcesAdmin();
    } else if (raw === "calendar" || raw === "task") {
      resources = await getResourcesAdminForPicker(raw as ResourcePickerContext);
    } else {
      return NextResponse.json(
        { error: "Invalid context. Use calendar, task, or omit for full registry." },
        { status: 400 }
      );
    }
    return NextResponse.json({ data: resources });
  } catch (error) {
    console.error("GET /api/events/resources error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/events/resources
 * Create a resource. Body: { name, resource_type, metadata?, is_exclusive? }. Admin only.
 */
async function postHandler(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const resource_type = body?.resource_type;
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const allowedTypes = await getCalendarResourceTypes();
    const allowedSlugs = allowedTypes.map((t) => t.slug);
    if (typeof resource_type !== "string" || !allowedSlugs.includes(resource_type)) {
      return NextResponse.json(
        { error: `resource_type must be one of: ${allowedSlugs.join(", ")}` },
        { status: 400 }
      );
    }
    const assetStatusRaw = typeof body?.asset_status === "string" ? body.asset_status.trim() : "";
    const allowedStatus = ["active", "maintenance", "retired"] as const;
    const asset_status =
      assetStatusRaw && (allowedStatus as readonly string[]).includes(assetStatusRaw)
        ? assetStatusRaw
        : "active";

    const input: ResourceInsert = {
      name,
      resource_type,
      metadata: body?.metadata ?? null,
      is_exclusive: typeof body?.is_exclusive === "boolean" ? body.is_exclusive : true,
      is_schedulable_calendar:
        typeof body?.is_schedulable_calendar === "boolean" ? body.is_schedulable_calendar : true,
      is_schedulable_tasks:
        typeof body?.is_schedulable_tasks === "boolean" ? body.is_schedulable_tasks : true,
      asset_status,
    };
    const result = await createResource(input);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ data: { id: result.id } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events/resources error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(getHandler);
export const POST = withRateLimit(postHandler);
