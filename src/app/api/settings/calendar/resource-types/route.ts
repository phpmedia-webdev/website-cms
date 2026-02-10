import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getCalendarResourceTypes,
  setCalendarResourceTypes,
  type CalendarResourceTypeOption,
} from "@/lib/supabase/settings";

/**
 * GET /api/settings/calendar/resource-types
 * Get calendar resource type picklist (authenticated).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const types = await getCalendarResourceTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("Error fetching calendar resource types:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource types" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/calendar/resource-types
 * Update calendar resource type picklist (authenticated).
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    if (!Array.isArray(body.types)) {
      return NextResponse.json(
        { error: "types must be an array" },
        { status: 400 }
      );
    }
    const types = body.types as CalendarResourceTypeOption[];
    const valid = types.every(
      (t) => t && typeof t.slug === "string" && typeof t.label === "string"
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Each type must have slug and label" },
        { status: 400 }
      );
    }
    const success = await setCalendarResourceTypes(types);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to save resource types (check for duplicate slugs)" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating calendar resource types:", error);
    return NextResponse.json(
      { error: "Failed to update resource types" },
      { status: 500 }
    );
  }
}
