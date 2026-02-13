/**
 * GET /admin/mfa/success
 * Intermediate step after MFA verify: reads short-lived upgrade cookie, sets Supabase
 * session (AAL2) on the response, then redirects. Uses next/headers cookies() for
 * setAll so cookies are written the same way as the auth callback and createServerSupabaseClientSSR.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

const MFA_UPGRADE_COOKIE = "sb-mfa-upgrade";

function decodeUpgradeCookie(value: string): { access_token: string; refresh_token: string } | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { access_token?: string; refresh_token?: string };
    if (typeof parsed.access_token === "string" && typeof parsed.refresh_token === "string") {
      return { access_token: parsed.access_token, refresh_token: parsed.refresh_token };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectTo = requestUrl.searchParams.get("redirect") || "/admin/dashboard";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin/dashboard";

  const upgradeCookie = request.cookies.get(MFA_UPGRADE_COOKIE)?.value;
  if (!upgradeCookie) {
    return NextResponse.redirect(new URL("/admin/mfa/challenge?error=missing&redirect=" + encodeURIComponent(safeRedirect), requestUrl.origin));
  }

  const tokens = decodeUpgradeCookie(upgradeCookie);
  if (!tokens) {
    return NextResponse.redirect(new URL("/admin/mfa/challenge?error=invalid&redirect=" + encodeURIComponent(safeRedirect), requestUrl.origin));
  }

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach((c) => {
          const opts = c.options as { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" } | undefined;
          cookieStore.set(c.name, c.value, {
            path: opts?.path ?? "/",
            maxAge: opts?.maxAge,
            httpOnly: opts?.httpOnly,
            secure: opts?.secure,
            sameSite: (opts?.sameSite as "lax" | "strict") ?? "lax",
          });
        });
      },
    },
    db: { schema: getClientSchema() },
  });

  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  if (error) {
    return NextResponse.redirect(new URL("/admin/mfa/challenge?error=invalid&redirect=" + encodeURIComponent(safeRedirect), requestUrl.origin));
  }

  const res = NextResponse.redirect(new URL(safeRedirect, requestUrl.origin), 303);
  // Clear the one-time upgrade cookie
  res.cookies.set(MFA_UPGRADE_COOKIE, "", { path: "/admin/mfa", maxAge: 0 });

  return res;
}
