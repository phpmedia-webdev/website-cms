import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";

/**
 * POST /api/auth/mfa/challenge
 * Creates an MFA challenge server-side so challenge and verify use the same IP (Supabase
 * requires "Challenge and verify IP addresses match"). The client sends session cookies;
 * we create the challenge from the server and return challengeId.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { factorId } = body as { factorId?: string };

    if (!factorId) {
      return NextResponse.json(
        { error: "factorId is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClientSSR();
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to create challenge" },
        { status: 401 }
      );
    }

    if (!data?.id) {
      return NextResponse.json(
        { error: "No challenge ID returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({ challengeId: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Challenge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
