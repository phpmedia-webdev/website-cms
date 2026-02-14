import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { mergeContacts } from "@/lib/supabase/crm";

/**
 * POST /api/crm/contacts/merge
 * Merge secondary contact into primary. Not reversible.
 * Body: { primaryId: string, secondaryId: string, fieldChoices?: Record<string, 'primary' | 'secondary'> }.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { primaryId, secondaryId, fieldChoices } = body as {
      primaryId?: string;
      secondaryId?: string;
      fieldChoices?: Record<string, "primary" | "secondary">;
    };
    if (!primaryId || typeof primaryId !== "string" || !secondaryId || typeof secondaryId !== "string") {
      return NextResponse.json(
        { error: "primaryId and secondaryId (strings) are required" },
        { status: 400 }
      );
    }
    const choices =
      fieldChoices && typeof fieldChoices === "object" && !Array.isArray(fieldChoices)
        ? (fieldChoices as Record<string, "primary" | "secondary">)
        : undefined;
    const { success, error } = await mergeContacts(primaryId.trim(), secondaryId.trim(), choices);
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
