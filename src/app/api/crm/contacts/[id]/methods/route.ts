import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  listContactMethods,
  replaceContactMethods,
} from "@/lib/supabase/contact-methods";
import { syncContactOrganizationPhoneMatches } from "@/lib/supabase/organizations";

/**
 * GET /api/crm/contacts/[id]/methods
 * List normalized phone/email methods for a contact.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const methods = await listContactMethods(id);
    return NextResponse.json({ methods });
  } catch (error) {
    console.error("Error fetching contact methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact methods" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/contacts/[id]/methods
 * Replace all phone/email rows for the contact.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const methods = Array.isArray(body.methods) ? body.methods : [];
    const { error } = await replaceContactMethods(id, methods);
    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to update contact methods" },
        { status: 500 }
      );
    }
    const phoneValues = methods
      .filter((method: { method_type?: string; value?: string }) => method.method_type === "phone")
      .map((method: { value?: string }) => String(method.value ?? ""))
      .filter((value: string) => value.trim().length > 0);
    if (phoneValues.length > 0) {
      await syncContactOrganizationPhoneMatches(id, phoneValues);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating contact methods:", error);
    return NextResponse.json(
      { error: "Failed to update contact methods" },
      { status: 500 }
    );
  }
}
