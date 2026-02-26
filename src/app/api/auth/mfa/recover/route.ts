import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { isPhpAuthConfigured } from "@/lib/php-auth/config";

/**
 * POST /api/auth/mfa/recover
 * Removes all MFA factors for the current user. Allowed only for superadmins.
 * When PHP-Auth is configured, superadmin is determined by central role; otherwise by user_metadata.
 */
export async function POST() {
  try {
    const ssr = await createServerSupabaseClientSSR();
    const {
      data: { user },
      error: userError,
    } = await ssr.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to recover MFA" },
        { status: 401 }
      );
    }

    if (isPhpAuthConfigured()) {
      const role = await getRoleForCurrentUser();
      if (!isSuperadminFromRole(role)) {
        return NextResponse.json(
          { error: "MFA recovery is only available for superadmins" },
          { status: 403 }
        );
      }
    } else {
      const metadata = (user.user_metadata || {}) as { type?: string; role?: string };
      if (metadata.type !== "superadmin" || metadata.role !== "superadmin") {
        return NextResponse.json(
          { error: "MFA recovery is only available for superadmins" },
          { status: 403 }
        );
      }
    }

    const admin = createServerSupabaseClient();
    const { data: factorsData, error: listError } = await admin.auth.admin.mfa.listFactors({
      userId: user.id,
    });

    if (listError) {
      return NextResponse.json(
        { error: listError.message || "Failed to list factors" },
        { status: 400 }
      );
    }

    const factors = factorsData?.factors ?? [];
    for (const factor of factors) {
      await admin.auth.admin.mfa.deleteFactor({
        userId: user.id,
        id: factor.id,
      });
    }

    return NextResponse.json({
      success: true,
      removed: factors.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
