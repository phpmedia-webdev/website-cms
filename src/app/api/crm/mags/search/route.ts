import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { searchMags } from "@/lib/supabase/crm";

/**
 * GET /api/crm/mags/search?q=...
 * Search MAGs by name/uid (authenticated, admin context).
 * Returns all MAGs including draft so admin can assign draft for dev testing.
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
    const results = await searchMags(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching MAGs:", error);
    return NextResponse.json({ error: "Failed to search MAGs" }, { status: 500 });
  }
}
