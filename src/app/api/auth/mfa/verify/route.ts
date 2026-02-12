import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

type CookieOptions = { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" };

/**
 * POST /api/auth/mfa/verify
 * Verifies MFA code server-side and sets the upgraded session (AAL2) in the response cookies.
 * Uses an explicit cookie carrier (like auth/callback) so cookies are attached to the
 * response we return, fixing "flash and reset" on Vercel.
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

    const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
    const cookiesToSet: { name: string; value: string; options?: CookieOptions }[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookies.forEach((c) =>
            cookiesToSet.push({
              name: c.name,
              value: c.value,
              options: c.options as CookieOptions,
            })
          );
        },
      },
      db: { schema: getClientSchema() },
    });

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

    const response = NextResponse.json({ success: true });
    cookiesToSet.forEach((c) => {
      response.cookies.set(c.name, c.value, {
        path: c.options?.path ?? "/",
        maxAge: c.options?.maxAge,
        httpOnly: c.options?.httpOnly,
        secure: c.options?.secure,
        sameSite: c.options?.sameSite ?? "lax",
      });
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
