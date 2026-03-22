import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { searchDirectoryEntries } from "@/lib/supabase/directory";
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

/**
 * GET /api/directory?q=&limit=
 * Unified picker list: CRM contacts + team users for current tenant site. Admin only.
 */
async function getHandler(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    const data = await searchDirectoryEntries({
      search: q,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/directory error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(getHandler);
