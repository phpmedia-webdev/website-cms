import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  listOrganizationsWithMemberCount,
  createOrganization,
  syncOrganizationContactPhoneMatches,
} from "@/lib/supabase/organizations";

/**
 * GET /api/crm/organizations
 * List organizations with optional search and member count.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const orgs = await listOrganizationsWithMemberCount({ search });
    return NextResponse.json({ organizations: orgs });
  } catch (error) {
    console.error("Error listing organizations:", error);
    return NextResponse.json(
      { error: "Failed to list organizations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/organizations
 * Create an organization.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name, email, phone, avatar_url, company_domain, type, industry } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }
    const { organization, error } = await createOrganization({
      name: name.trim(),
      email: email ?? null,
      phone: phone ?? null,
      avatar_url: avatar_url ?? null,
      company_domain: company_domain ?? null,
      type: type ?? null,
      industry: industry ?? null,
    });
    if (error) {
      return NextResponse.json(
        { error: (error as Error).message ?? "Failed to create organization" },
        { status: 500 }
      );
    }
    if (organization?.id) {
      await syncOrganizationContactPhoneMatches(organization.id);
    }
    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
