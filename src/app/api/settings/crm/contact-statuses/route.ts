import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getCrmContactStatuses,
  setCrmContactStatuses,
  type CrmContactStatusOption,
} from "@/lib/supabase/settings";

/**
 * GET /api/settings/crm/contact-statuses
 * Get CRM contact status picklist (authenticated).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const statuses = await getCrmContactStatuses();
    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Error fetching contact statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact statuses" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/crm/contact-statuses
 * Update CRM contact status picklist (authenticated).
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    if (!Array.isArray(body.statuses)) {
      return NextResponse.json(
        { error: "statuses must be an array" },
        { status: 400 }
      );
    }
    const statuses = body.statuses as CrmContactStatusOption[];
    const valid = statuses.every(
      (s) =>
        s &&
        typeof s.slug === "string" &&
        typeof s.label === "string" &&
        typeof s.color === "string"
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Each status must have slug, label, and color" },
        { status: 400 }
      );
    }
    const success = await setCrmContactStatuses(statuses);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to save contact statuses" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating contact statuses:", error);
    return NextResponse.json(
      { error: "Failed to update contact statuses" },
      { status: 500 }
    );
  }
}
