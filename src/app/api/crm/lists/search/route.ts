import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { searchMarketingLists } from "@/lib/supabase/crm";

/**
 * GET /api/crm/lists/search?q=...
 * Search marketing lists by name/slug (authenticated).
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    if (q.length < 1) {
      return NextResponse.json([]);
    }
    const results = await searchMarketingLists(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching lists:", error);
    return NextResponse.json({ error: "Failed to search lists" }, { status: 500 });
  }
}
