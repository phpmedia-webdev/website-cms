import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getResources, createResource } from "@/lib/supabase/participants-resources";
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
 * List all resources. Admin only.
 */
async function getHandler() {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const resources = await getResources();
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
    const input: ResourceInsert = {
      name,
      resource_type: resource_type as ResourceInsert["resource_type"],
      metadata: body?.metadata ?? null,
      is_exclusive: typeof body?.is_exclusive === "boolean" ? body.is_exclusive : true,
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
