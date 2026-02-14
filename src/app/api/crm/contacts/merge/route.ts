import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { mergeContacts } from "@/lib/supabase/crm";

/**
 * POST /api/crm/contacts/merge
 * Merge secondary contact into primary. Not reversible.
 * Body: { primaryId: string, secondaryId: string }.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { primaryId, secondaryId } = body as { primaryId?: string; secondaryId?: string };
    if (!primaryId || typeof primaryId !== "string" || !secondaryId || typeof secondaryId !== "string") {
      return NextResponse.json(
        { error: "primaryId and secondaryId (strings) are required" },
        { status: 400 }
      );
    }
    const { success, error } = await mergeContacts(primaryId.trim(), secondaryId.trim());
    if (error) {
      return NextResponse.json(
        { error: error.message || "Merge failed" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success, primaryId });
  } catch (error) {
    console.error("Error merging contacts:", error);
    return NextResponse.json(
      { error: "Failed to merge contacts" },
      { status: 500 }
    );
  }
}
