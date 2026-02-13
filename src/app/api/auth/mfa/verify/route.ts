import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

type CookieOptions = { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" };

/**
 * POST /api/auth/mfa/verify
 * Verifies MFA code server-side. On success, sets Supabase AAL2 session cookies on the
 * redirect response and redirects directly to the target (e.g. /admin/dashboard).
 * Skips the success page since cookies are set in this response.
 * Accepts JSON body or application/x-www-form-urlencoded (for form POST).
 */
export async function POST(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const redirectTo = requestUrl.searchParams.get("redirect");

    let factorId: string | null = null;
    let challengeId: string | null = null;
    let code: string | null = null;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      factorId = (formData.get("factorId") as string)?.trim() ?? null;
      challengeId = (formData.get("challengeId") as string)?.trim() ?? null;
      code = (formData.get("code") as string)?.trim() ?? null;
    } else {
      const body = await request.json();
      const b = body as { factorId?: string; challengeId?: string; code?: string };
      factorId = b.factorId?.trim() ?? null;
      challengeId = b.challengeId?.trim() ?? null;
      code = b.code?.trim() ?? null;
    }

    if (!factorId || !challengeId || !code || code.length !== 6) {
      if (redirectTo && redirectTo.startsWith("/")) {
        return NextResponse.redirect(new URL(`/admin/mfa/challenge?error=missing&redirect=${encodeURIComponent(redirectTo)}`, requestUrl.origin), 303);
      }
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
          // MFA_TRACE: Supabase auth client requested these cookies (from mfa.verify)
          console.log("MFA_TRACE [verify] setAll called, count:", cookies.length, "names:", cookies.map((c) => c.name));
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
      code,
    });

    const setCookiesOn = (res: NextResponse) => {
      cookiesToSet.forEach((c) => {
        res.cookies.set(c.name, c.value, {
          path: c.options?.path ?? "/",
          maxAge: c.options?.maxAge,
          httpOnly: c.options?.httpOnly,
          secure: c.options?.secure,
          sameSite: c.options?.sameSite ?? "lax",
        });
      });
    };

    if (error) {
      if (redirectTo && redirectTo.startsWith("/")) {
        return NextResponse.redirect(new URL(`/admin/mfa/challenge?error=invalid&redirect=${encodeURIComponent(redirectTo)}`, requestUrl.origin), 303);
      }
      return NextResponse.json(
        { error: error.message || "Invalid verification code" },
        { status: 401 }
      );
    }

    // Redirect flow: set AAL2 cookies on response and redirect directly to target
    if (redirectTo && redirectTo.startsWith("/")) {
      const targetUrl = new URL(redirectTo, requestUrl.origin);
      const res = NextResponse.redirect(targetUrl, 303);
      setCookiesOn(res);
      return res;
    }

    const response = NextResponse.json({ success: true });
    setCookiesOn(response);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
