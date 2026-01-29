import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getNewContactsCount } from "@/lib/supabase/crm";

/**
 * GET /api/crm/contacts/new-count
 * Returns count of contacts with status "New" for sidebar badge (work to do).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const count = await getNewContactsCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching new contacts count:", error);
    return NextResponse.json(
      { error: "Failed to fetch count" },
      { status: 500 }
    );
  }
}
