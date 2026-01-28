import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMarketingLists, createMarketingList } from "@/lib/supabase/crm";

/**
 * GET /api/crm/lists
 * List all marketing lists (authenticated).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const lists = await getMarketingLists();
    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching marketing lists:", error);
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
  }
}

/**
 * POST /api/crm/lists
 * Create a marketing list (authenticated).
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { list, error } = await createMarketingList(body);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to create list" }, { status: 500 });
    }
    return NextResponse.json(list);
  } catch (error) {
    console.error("Error creating marketing list:", error);
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
  }
}
