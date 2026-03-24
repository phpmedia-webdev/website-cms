/**
 * GET /api/events/resources/usage?from=YYYY-MM-DD&to=YYYY-MM-DD&resource_type=&resource_id=&limit=
 * Dynamic usage estimates for admin analytics tab.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { computeResourceUsageAnalytics } from "@/lib/resources/resource-usage-analytics";
import { withRateLimit } from "@/lib/api/middleware";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

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
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    if (!isYmd(from) || !isYmd(to)) {
      return NextResponse.json(
        { error: "Query params from and to are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    const resource_type = searchParams.get("resource_type");
    const resource_id = searchParams.get("resource_id");
    const limitRaw = searchParams.get("limit");
    const limit =
      limitRaw && /^\d+$/.test(limitRaw) ? Math.min(500, Math.max(1, parseInt(limitRaw, 10))) : 100;

    const result = await computeResourceUsageAnalytics({
      fromInclusive: from,
      toInclusive: to,
      resourceTypeSlug: resource_type?.trim() || null,
      resourceId: resource_id?.trim() || null,
      limit,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/events/resources/usage error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getHandler);
