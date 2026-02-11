import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { updateContactsStatusBulk } from "@/lib/supabase/crm";
import { getCrmContactStatuses } from "@/lib/supabase/settings";

/**
 * POST /api/crm/contacts/bulk-status
 * Set status for selected contacts. Body: { contactIds: string[], status: string }.
 * status must be a valid slug from CRM contact status settings.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { contactIds, status } = body as { contactIds?: string[]; status?: string };
    if (!Array.isArray(contactIds) || contactIds.length === 0 || typeof status !== "string" || !status.trim()) {
      return NextResponse.json(
        { error: "contactIds (non-empty array) and status (string) are required" },
        { status: 400 }
      );
    }
    const allowed = await getCrmContactStatuses();
    const slug = status.trim().toLowerCase();
    if (!allowed.some((s) => s.slug === slug)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: " + allowed.map((s) => s.slug).join(", ") },
        { status: 400 }
      );
    }
    const { success, error } = await updateContactsStatusBulk(contactIds, slug);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to update status" }, { status: 500 });
    }
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error bulk updating contact status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
