/**
 * Next.js middleware for route protection.
 * Validates Supabase Auth session before allowing access to protected routes.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUserFromRequest, validateTenantAccess } from "./lib/auth/supabase-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  }

  // If accessing auth route with valid session, redirect to dashboard
  if (isAuthRoute && user && validateTenantAccess(user)) {
    // Check if user is admin type
    if (user.metadata.type === "superadmin" || user.metadata.type === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return NextResponse.next();
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
