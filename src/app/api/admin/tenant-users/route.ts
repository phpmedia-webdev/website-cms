import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { listAllAssignments } from "@/lib/supabase/tenant-users";

/**
 * GET /api/admin/tenant-users
 * List all tenant user assignments (all sites). For global Tenant Users table. Superadmin only.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }
    const list = await listAllAssignments();
    return NextResponse.json(list);
  } catch (error) {
    console.error("GET /api/admin/tenant-users:", error);
    return NextResponse.json(
      { error: "Failed to list tenant users" },
      { status: 500 }
    );
  }
}
