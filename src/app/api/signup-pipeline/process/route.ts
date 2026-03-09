import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { processSignup } from "@/lib/signup-pipeline";

/**
 * POST /api/signup-pipeline/process
 * Runs the signup pipeline for the current user (must be member). Call after signup when session exists.
 * Body: { signupCode?: string }. Returns { success, redirectTo?, errors? }.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.metadata?.type !== "member") {
    return NextResponse.json(
      { error: "Only members can run the signup pipeline" },
      { status: 403 }
    );
  }

  let signupCode: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.signupCode === "string") {
      signupCode = body.signupCode.trim() || null;
    }
  } catch {
    // leave signupCode null
  }

  const result = await processSignup({
    userId: user.id,
    email: user.email ?? "",
    displayName: user.display_name ?? undefined,
    signupCode,
  });

  return NextResponse.json({
    success: result.success,
    redirectTo: result.redirectTo ?? undefined,
    errors: result.errors,
  });
}
