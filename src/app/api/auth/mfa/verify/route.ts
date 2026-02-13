import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv, createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

type CookieOptions = { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" };

/**
 * POST /api/auth/mfa/verify
 * Verifies MFA code server-side. On success, sets AAL2 session cookies and redirects to
 * /admin/mfa/success (intermediate page) so the browser applies cookies before the final
 * redirect to dashboard. Some browsers don't apply Set-Cookie before following redirect.
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
        return NextResponse.redirect(new URL(`/mfa/challenge?error=missing&redirect=${encodeURIComponent(redirectTo)}`, requestUrl.origin), 303);
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
        return NextResponse.redirect(new URL(`/mfa/challenge?error=invalid&redirect=${encodeURIComponent(redirectTo)}`, requestUrl.origin), 303);
      }
      return NextResponse.json(
        { error: error.message || "Invalid verification code" },
        { status: 401 }
      );
    }

    // Set cookies on the SUCCESS PAGE document response instead of here, so they persist on Vercel.
    // Store cookies in one-time table; redirect to /mfa/success?t=TOKEN; success page sets cookies and renders.
    if (redirectTo && redirectTo.startsWith("/")) {
      const admin = createServerSupabaseClient();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { data: row, error: insertError } = await admin
        .from("mfa_upgrade_tokens")
        .insert({
          cookies: cookiesToSet.map((c) => ({
            name: c.name,
            value: c.value,
            options: c.options ?? {},
          })),
          expires_at: expiresAt,
        })
        .select("token")
        .single();

      if (insertError || !row?.token) {
        console.error("MFA verify: failed to store upgrade token", insertError);
        return NextResponse.redirect(
          new URL(`/mfa/challenge?error=server&redirect=${encodeURIComponent(redirectTo)}`, requestUrl.origin),
          303
        );
      }

      const successUrl = `/mfa/success?t=${row.token}&redirect=${encodeURIComponent(redirectTo)}`;
      return NextResponse.redirect(new URL(successUrl, requestUrl.origin), 303);
    }

    const response = NextResponse.json({ success: true });
    setCookiesOn(response);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
