import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

type CookieOptions = { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" };

/** One-time cookie to pass tokens to /admin/mfa/success (avoids 302 + Set-Cookie race). */
const MFA_UPGRADE_COOKIE = "sb-mfa-upgrade";
const MFA_UPGRADE_MAX_AGE = 60;

/**
 * POST /api/auth/mfa/verify
 * Verifies MFA code server-side. When ?redirect= is present and verification succeeds,
 * sets a short-lived cookie with tokens and redirects to /admin/mfa/success?redirect=...
 * so the success handler can set the real session cookies in a normal GET (reliable on Vercel).
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

    // Redirect flow: pass tokens via short-lived cookie; success route sets real session and redirects
    if (redirectTo && redirectTo.startsWith("/")) {
      const payload = JSON.stringify({
        access_token: data!.access_token,
        refresh_token: data!.refresh_token ?? "",
      });
      const value = Buffer.from(payload, "utf8").toString("base64url");
      const successUrl = new URL("/admin/mfa/success", requestUrl.origin);
      successUrl.searchParams.set("redirect", redirectTo);
      // 303 See Other so browser follows with GET (307 would preserve POST → 405 on success route)
      const res = NextResponse.redirect(successUrl, 303);
      res.cookies.set(MFA_UPGRADE_COOKIE, value, {
        path: "/admin/mfa",
        maxAge: MFA_UPGRADE_MAX_AGE,
        httpOnly: true,
        secure: requestUrl.protocol === "https:",
        sameSite: "lax",
      });
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
