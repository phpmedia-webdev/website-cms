/**
 * GET /api/crm/contacts/search?q=...&limit=20
 * Search contacts by name or email (autocomplete for invoice/order customer picker).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { searchContactsByNameOrEmail } from "@/lib/supabase/crm";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const limit = Number(searchParams.get("limit") ?? 20);

    const schema = getClientSchema();
    const contacts = await searchContactsByNameOrEmail(q, {
      limit,
      schema,
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("GET /api/crm/contacts/search:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
