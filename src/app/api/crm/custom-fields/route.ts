import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getCrmCustomFields, createCrmCustomField } from "@/lib/supabase/crm";

/**
 * GET /api/crm/custom-fields
 * List all CRM custom field definitions (authenticated).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const fields = await getCrmCustomFields();
    return NextResponse.json(fields);
  } catch (error) {
    console.error("Error fetching CRM custom fields:", error);
    return NextResponse.json({ error: "Failed to fetch custom fields" }, { status: 500 });
  }
}

/**
 * POST /api/crm/custom-fields
 * Create a CRM custom field definition (authenticated).
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { field, error } = await createCrmCustomField(body);
    if (error) {
      return NextResponse.json({ error: error.message || "Failed to create custom field" }, { status: 500 });
    }
    return NextResponse.json(field);
  } catch (error) {
    console.error("Error creating CRM custom field:", error);
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
  }
}
