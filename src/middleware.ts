/**
 * Next.js middleware for route protection.
 * Validates Supabase Auth session before allowing access to protected routes.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUserFromRequest, validateTenantAccess } from "./lib/auth/supabase-auth";
import { requiresAAL2, isDevModeBypassEnabled } from "./lib/auth/mfa";
import { getSiteModeForEdge } from "./lib/site-mode";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    const user = await getCurrentUserFromRequest(request);
    if (user && validateTenantAccess(user)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Check if route is protected (all /admin/* except /admin/login)
  const isProtectedRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isAuthRoute = pathname.startsWith("/admin/login");
  const isSuperadminRoute = pathname.startsWith("/admin/super");

  // Get current user from Supabase Auth session
  const user = await getCurrentUserFromRequest(request);

  // If accessing protected route, validate authentication and tenant access
  if (isProtectedRoute) {
    if (!user) {
      // No user session, redirect to login
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Superadmin routes require superadmin role
    if (isSuperadminRoute) {
      if (user.metadata.type !== "superadmin" || user.metadata.role !== "superadmin") {
        // Not a superadmin, redirect to dashboard
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      // Superadmin can access any schema, skip tenant validation
    } else {
      // Regular admin routes: validate user has admin type (superadmin or admin)
      if (user.metadata.type !== "superadmin" && user.metadata.type !== "admin") {
        // Not an admin user, redirect to login
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Validate tenant access (ensures user can access this deployment's schema)
      // Superadmins bypass this check, but regular admins must match tenant_id
      if (user.metadata.type !== "superadmin" && !validateTenantAccess(user)) {
        // Invalid tenant access, redirect to login
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Check 2FA requirements (AAL2 enforcement)
    // Dev mode bypass - skip 2FA check in development if enabled
    const devBypass = isDevModeBypassEnabled();
    if (!devBypass) {
      const needsAAL2 = await requiresAAL2(user, pathname);
      if (needsAAL2) {
        // Get current AAL from session
        const { getAAL } = await import("./lib/auth/mfa");
        const currentAAL = await getAAL(user);
        if (currentAAL !== "aal2") {
          // Redirect to MFA challenge
          const challengeUrl = new URL("/admin/mfa/challenge", request.url);
          challengeUrl.searchParams.set("redirect", pathname);
          return NextResponse.redirect(challengeUrl);
        }
      }
    }
  }

  // For login page, redirect to dashboard if already logged in
  if (isAuthRoute) {
    if (user && validateTenantAccess(user)) {
      // Check if user is admin type
      if (user.metadata.type === "superadmin" || user.metadata.type === "admin") {
        // User is already logged in, redirect to dashboard
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }
    // Not logged in or not admin, allow access to login page
    return NextResponse.next();
  }

  // All other routes continue normally
  const res = NextResponse.next();
  if (isPublicRoute) {
    res.headers.set("Cache-Control", noStore);
  }
  return res;
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
