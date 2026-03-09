import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/auth/callback
 * Handles email confirmation when the link uses token_hash and type in the query
 * (e.g. custom Supabase email template pointing to our app).
 * Verifies the OTP, sets session cookies, and redirects to next.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/login";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL(`/login?error=missing_params`, requestUrl.origin));
  }

  const cookiesToSet: { name: string; value: string; options?: { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" } }[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookies.forEach((c) => cookiesToSet.push({ name: c.name, value: c.value, options: c.options as { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" } }));
      },
    },
  });

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "signup" | "email" | "magiclink" | "recovery",
  });

  if (error) {
    console.error("Auth callback verifyOtp:", error.message);
    const { pushAuditLog, getClientAuditContext } = await import("@/lib/php-auth/audit-log");
    const ctx = getClientAuditContext(request);
    pushAuditLog({
      action: "login_failed",
      loginSource: "website-cms",
      metadata: { reason: "invalid_token", type },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      deviceType: ctx.deviceType,
      browser: ctx.browser,
    }).catch(() => {});
    return NextResponse.redirect(new URL(`/login?error=invalid_token`, requestUrl.origin));
  }

  const { pushAuditLog, getClientAuditContext } = await import("@/lib/php-auth/audit-log");
  const ctx = getClientAuditContext(request);
  const user = data?.session?.user;
  pushAuditLog({
    action: "login_success",
    loginSource: "website-cms",
    userId: user?.id,
    metadata: { source: "callback", type, email: user?.email },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    deviceType: ctx.deviceType,
    browser: ctx.browser,
  }).catch(() => {});

  // New member signup: run signup pipeline (ensure CRM, member row, code-dependent actions)
  let finalNext = next;
  if (type === "signup" && data?.session?.user) {
    const user = data.session.user;
    const metadata = user.user_metadata as { type?: string; display_name?: string } | undefined;
    if (metadata?.type === "member") {
      const { processSignup } = await import("@/lib/signup-pipeline");
      const result = await processSignup({
        userId: user.id,
        email: user.email ?? "",
        displayName: metadata?.display_name ?? undefined,
        signupCode: null,
      });
      if (result.errors?.length) {
        console.error("Signup pipeline after email confirm:", result.errors);
      }
      if (result.redirectTo?.startsWith("/")) {
        finalNext = result.redirectTo;
      }
    }
  }

  const redirectUrl = finalNext.startsWith("/") ? new URL(finalNext, requestUrl.origin) : new URL("/login", requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

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
}
