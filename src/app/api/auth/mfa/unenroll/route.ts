import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";

/**
 * POST /api/auth/mfa/unenroll
 * Unenrolls an MFA factor using the admin (service role) API so AAL2 is not required.
 * Use when the user cannot pass MFA (e.g. lost device) but is authenticated (AAL1).
 * Only the current user can unenroll their own factors.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { factorId } = body as { factorId?: string };

    if (!factorId || typeof factorId !== "string") {
      return NextResponse.json(
        { error: "factorId is required" },
        { status: 400 }
      );
    }

    const ssr = await createServerSupabaseClientSSR();
    const {
      data: { user },
      error: userError,
    } = await ssr.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to remove an authenticator" },
        { status: 401 }
      );
    }

    const metadata = (user.user_metadata || {}) as { type?: string; role?: string };
    const isSuperadmin = metadata.type === "superadmin" && metadata.role === "superadmin";

    const admin = createServerSupabaseClient();
    const { data: factorsData, error: listError } = await admin.auth.admin.mfa.listFactors({
      userId: user.id,
    });
    if (!listError && factorsData?.factors?.length === 1 && factorsData.factors.some((f) => f.id === factorId)) {
      if (isSuperadmin) {
        return NextResponse.json(
          {
            error:
              "You cannot remove your last MFA factor. If you lost your device, use the recovery flow at /admin/login/recover",
          },
          { status: 400 }
        );
      }
    }

    const { data, error } = await admin.auth.admin.mfa.deleteFactor({
      userId: user.id,
      id: factorId,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to remove authenticator" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unenroll failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
