import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { ensureMemberInCrm } from "@/lib/automations/on-member-signup";

/**
 * POST /api/automations/on-member-signup
 * Ensures the current user (must be a member) exists in the CRM with status "New".
 * Called after member signup when session is already available (e.g. immediate session without email confirm).
 */
export async function POST() {
  const user = await getCurrentSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.metadata.type !== "member") {
    return NextResponse.json(
      { error: "Only members can run this automation" },
      { status: 403 }
    );
  }

  const result = await ensureMemberInCrm({
    userId: user.id,
    email: user.email,
    displayName: user.display_name ?? undefined,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error, created: false },
      { status: 500 }
    );
  }

  return NextResponse.json({
    contactId: result.contact?.id ?? null,
    created: result.created,
  });
}
