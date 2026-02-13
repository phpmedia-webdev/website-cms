/**
 * GET /admin/mfa/success
 * Intermediate step after MFA verify: reads short-lived upgrade cookie, sets Supabase
 * session (AAL2) on the response, then redirects. Ensures cookies are set in a normal
 * GET so the next request (dashboard) has the session (avoids 302 + Set-Cookie race).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

const MFA_UPGRADE_COOKIE = "sb-mfa-upgrade";
const MFA_UPGRADE_MAX_AGE = 60;

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
  const cookiesToSet: { name: string; value: string; path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" }[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookies.forEach((c) => {
          const opts = c.options as { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" } | undefined;
          cookiesToSet.push({
            name: c.name,
            value: c.value,
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

  const res = NextResponse.redirect(new URL(safeRedirect, requestUrl.origin));
  cookiesToSet.forEach((c) => {
    res.cookies.set(c.name, c.value, {
      path: c.path ?? "/",
      maxAge: c.maxAge,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite ?? "lax",
    });
  });
  // Clear the one-time upgrade cookie
  res.cookies.set(MFA_UPGRADE_COOKIE, "", { path: "/admin/mfa", maxAge: 0 });

  return res;
}
