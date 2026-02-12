/**
 * Next.js middleware for route protection.
 * Validates Supabase Auth session before allowing access to protected routes.
 * Uses a single response as cookie carrier so Supabase session refresh (setAll) is
 * written to the response and forwarded on redirects, avoiding ERR_TOO_MANY_REDIRECTS.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUserFromRequest, validateTenantAccess } from "./lib/auth/supabase-auth";
import { requiresAAL2, isDevModeBypassEnabled } from "./lib/auth/mfa";
import { getSiteModeForEdge } from "./lib/site-mode";

/** Response with getSetCookie (Fetch spec; not on all TS libs). */
type ResponseWithGetSetCookie = Response & { getSetCookie?(): string[] };

/** Copy Set-Cookie headers from carrier onto target (e.g. redirect) so session stays in sync. */
function copyCookiesTo(target: NextResponse, carrier: NextResponse): void {
  const setCookies = (carrier as ResponseWithGetSetCookie).getSetCookie?.() ?? [];
  setCookies.forEach((cookie) => target.headers.append("Set-Cookie", cookie));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cookie carrier: Supabase session refresh writes here; we return this or copy to redirects
  const cookieCarrier = NextResponse.next({ request: { headers: request.headers } });

  // Coming soon: read from DB (tenant_sites.site_mode) when NEXT_PUBLIC_CLIENT_SCHEMA is set; otherwise live
  const siteMode = await getSiteModeForEdge();
  const isComingSoonMode = siteMode === "coming_soon";

  // Allow access to admin routes, API routes, and coming-soon page even in coming soon mode
  const isAdminRoute = pathname.startsWith("/admin");
  const isAPIRoute = pathname.startsWith("/api");
  const isComingSoonRoute = pathname === "/coming-soon";
  const isPublicRoute = !isAdminRoute && !isAPIRoute;

  /** No cache so site mode toggle (live ↔ coming soon) takes effect immediately. */
  const noStore = "no-store, no-cache, must-revalidate, max-age=0";

  // If in coming soon mode, redirect all public routes to /coming-soon
  if (isComingSoonMode && isPublicRoute && !isComingSoonRoute) {
    const res = NextResponse.redirect(new URL("/coming-soon", request.url));
    res.headers.set("Cache-Control", noStore);
    return res;
  }

  // If in live mode but user hit /coming-soon (e.g. back button, "Back to website"), send to home
  if (isComingSoonRoute && !isComingSoonMode) {
    const res = NextResponse.redirect(new URL("/", request.url));
    res.headers.set("Cache-Control", noStore);
    return res;
  }

  // Redirect /admin to /admin/dashboard if authenticated, or /admin/login if not
  if (pathname === "/admin") {
    const { user } = await getCurrentUserFromRequest(request, cookieCarrier);
    if (user && validateTenantAccess(user)) {
      const res = NextResponse.redirect(new URL("/admin/dashboard", request.url));
      copyCookiesTo(res, cookieCarrier);
      return res;
    }
    const res = NextResponse.redirect(new URL("/admin/login", request.url));
    copyCookiesTo(res, cookieCarrier);
    return res;
  }

  // Check if route is protected (all /admin/* except /admin/login)
  const isProtectedRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isAuthRoute = pathname.startsWith("/admin/login");
  const isSuperadminRoute = pathname.startsWith("/admin/super");

  // Get current user and session from Supabase Auth (writes refresh cookies to cookieCarrier; session.aal for 2FA)
  const { user, session } = await getCurrentUserFromRequest(request, cookieCarrier);

  // If accessing protected route, validate authentication and tenant access
  if (isProtectedRoute) {
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      copyCookiesTo(res, cookieCarrier);
      return res;
    }

    if (isSuperadminRoute) {
      if (user.metadata.type !== "superadmin" || user.metadata.role !== "superadmin") {
        const res = NextResponse.redirect(new URL("/admin/dashboard", request.url));
        copyCookiesTo(res, cookieCarrier);
        return res;
      }
    } else {
      if (user.metadata.type !== "superadmin" && user.metadata.type !== "admin") {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        const res = NextResponse.redirect(loginUrl);
        copyCookiesTo(res, cookieCarrier);
        return res;
      }
      if (user.metadata.type !== "superadmin" && !validateTenantAccess(user)) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        const res = NextResponse.redirect(loginUrl);
        copyCookiesTo(res, cookieCarrier);
        return res;
      }
    }

    // Don't redirect to MFA challenge when already on challenge or enroll (avoids redirect loop)
    const isMfaChallengeOrEnroll =
      pathname.startsWith("/admin/mfa/challenge") || pathname.startsWith("/admin/mfa/enroll");
    const devBypass = isDevModeBypassEnabled();
    const currentAAL = session?.aal ?? "aal1";
    if (!devBypass && !isMfaChallengeOrEnroll) {
      const needsAAL2 = await requiresAAL2(user, pathname);
      if (needsAAL2 && currentAAL !== "aal2") {
        const challengeUrl = new URL("/admin/mfa/challenge", request.url);
        challengeUrl.searchParams.set("redirect", pathname);
        const res = NextResponse.redirect(challengeUrl);
        copyCookiesTo(res, cookieCarrier);
        return res;
      }
    }
  }

  const isMemberRoute = pathname.startsWith("/members");
  if (isMemberRoute) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      copyCookiesTo(res, cookieCarrier);
      return res;
    }
    const type = user.metadata?.type;
    if (type !== "member" && type !== "admin" && type !== "superadmin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      copyCookiesTo(res, cookieCarrier);
      return res;
    }
    return cookieCarrier;
  }

  if (isAuthRoute) {
    if (user && validateTenantAccess(user)) {
      if (user.metadata.type === "superadmin" || user.metadata.type === "admin") {
        const res = NextResponse.redirect(new URL("/admin/dashboard", request.url));
        copyCookiesTo(res, cookieCarrier);
        return res;
      }
    }
    return cookieCarrier;
  }

  if (isPublicRoute) {
    cookieCarrier.headers.set("Cache-Control", noStore);
  }
  return cookieCarrier;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
