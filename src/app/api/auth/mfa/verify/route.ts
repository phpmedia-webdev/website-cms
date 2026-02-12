import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";

/**
 * POST /api/auth/mfa/verify
 * Verifies MFA code server-side and sets the upgraded session (AAL2) in the response cookies.
 * This ensures the browser receives the new session before redirect, fixing the "flash and
 * reset" issue on Vercel where client-side verify persisted cookies after redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { factorId, challengeId, code } = body as {
      factorId?: string;
      challengeId?: string;
      code?: string;
    };

    if (!factorId || !challengeId || !code || code.length !== 6) {
      return NextResponse.json(
        { error: "factorId, challengeId, and a 6-digit code are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClientSSR();
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Invalid verification code" },
        { status: 401 }
      );
    }

    // Session is upgraded to AAL2; cookies were set via createServerSupabaseClientSSR setAll
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
