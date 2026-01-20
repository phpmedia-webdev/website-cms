/**
 * Next.js middleware for route protection.
 * Validates authentication before allowing access to protected routes.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateSession } from "./lib/auth/api-client";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session token from cookies
  const token = request.cookies.get("cms_session_token")?.value;

  // Redirect /admin to /admin/dashboard if authenticated, or /admin/login if not
  if (pathname === "/admin") {
    if (token) {
      const session = await validateSession(token);
      if (session) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Check if route is protected (all /admin/* except /admin/login)
  const isProtectedRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isAuthRoute = pathname.startsWith("/admin/login");

  // If accessing protected route without token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing protected route with token, validate it
  if (isProtectedRoute && token) {
    const session = await validateSession(token);
    if (!session) {
      // Invalid token, clear cookie and redirect to login
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("cms_session_token");
      return response;
    }
  }

  // If accessing auth route with valid token, redirect to dashboard
  if (isAuthRoute && token) {
    const session = await validateSession(token);
    if (session) {
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
