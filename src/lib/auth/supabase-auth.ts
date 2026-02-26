/**
 * Supabase Auth utilities for multi-tenant authentication.
 * Handles user authentication, tenant validation, and role checking.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";

/** Decode JWT payload without verifying. Works in Edge (atob) and Node (Buffer). */
function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(base64, "base64").toString("utf8")
        : decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Get AAL from a session (e.g. from getSession()). Reads from JWT payload when present,
 * so AAL is correct after MFA verify (Supabase stores AAL in the token, not always on session object).
 */
export function getAALFromSession(
  session: { access_token?: string; aal?: string } | null
): "aal1" | "aal2" | null {
  if (!session) return null;
  if (session.access_token) {
    const payload = decodeJwtPayload(session.access_token);
    if (payload && typeof payload.aal === "string" && (payload.aal === "aal1" || payload.aal === "aal2")) {
      return payload.aal as "aal1" | "aal2";
    }
  }
  return (session.aal === "aal2" ? "aal2" : "aal1") as "aal1" | "aal2";
}
import { getClientSchema } from "@/lib/supabase/schema";

/**
 * User metadata structure for CMS authentication.
 */
export interface UserMetadata {
  type: "superadmin" | "admin" | "member";
  role?: "superadmin" | "client_admin" | "editor" | "viewer" | string;
  tenant_id?: string;
  allowed_schemas?: string[];
}

/**
 * Authenticated user with metadata.
 */
export interface AuthUser {
  id: string;
  email: string;
  /** Display name from user_metadata, for "Welcome, {displayName}" etc. */
  display_name?: string | null;
  metadata: UserMetadata;
}

/**
 * Get the current authenticated user from Supabase Auth session.
 * Works in server components and API routes (uses cookies from next/headers).
 * 
 * For middleware usage, use getCurrentUserFromRequest() instead.
 * 
 * @returns Authenticated user with metadata or null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // For server components and API routes, use SSR client for proper cookie handling
    const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
    const supabase = await createServerSupabaseClientSSR();
    
    // Get user from Supabase Auth (may throw if refresh token is invalid/expired)
    let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
    let error: { message?: string } | null = null;
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
      error = result.error;
    } catch (authError) {
      const msg = (authError as Error)?.message ?? "";
      if (!msg.includes("Refresh Token") && !msg.includes("refresh_token")) {
        console.error("Error getting current user:", authError);
      }
      return null;
    }

    if (error || !user) {
      return null;
    }

    // Extract metadata
    const metadata = user.user_metadata as unknown as UserMetadata;
    
    // Validate metadata structure
    if (!metadata || !metadata.type) {
      return null;
    }

    const displayName =
      typeof (user.user_metadata as { display_name?: string })?.display_name === "string"
        ? (user.user_metadata as { display_name: string }).display_name
        : null;

    return {
      id: user.id,
      email: user.email || "",
      display_name: displayName || null,
      metadata: {
        type: metadata.type,
        role: metadata.role,
        tenant_id: metadata.tenant_id,
        allowed_schemas: metadata.allowed_schemas,
      },
    };
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    if (!msg.includes("Refresh Token") && !msg.includes("refresh_token")) {
      console.error("Error getting current user:", err);
    }
    return null;
  }
}

/** NextResponse type for middleware cookie carrier (avoid circular dep). */
type MiddlewareResponse = {
  cookies: { set: (name: string, value: string, options?: Record<string, unknown>) => void };
};

/** Result of getCurrentUserFromRequest: user plus session for AAL and PHP-Auth in middleware. */
export interface UserFromRequestResult {
  user: AuthUser | null;
  /** Session from the same request; aal for 2FA check; access_token for PHP-Auth validate-user in middleware. */
  session: { aal?: "aal1" | "aal2"; access_token?: string } | null;
}

/**
 * Get current user and session from middleware (handles cookies from NextRequest).
 * If response is provided, session refresh cookies are written to it so the browser
 * stays in sync (required to avoid redirect loops on Vercel/Edge).
 * Returns session so middleware can read session.aal for 2FA (getAAL uses service-role client and has no session in Edge).
 *
 * @param request - NextRequest from middleware
 * @param response - Optional NextResponse to write Set-Cookie to (recommended in middleware)
 * @returns { user, session } for use in middleware; session.aal is "aal1" | "aal2"
 */
export async function getCurrentUserFromRequest(
  request: Request,
  response?: MiddlewareResponse
): Promise<UserFromRequestResult> {
  const empty: UserFromRequestResult = { user: null, session: null };
  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return empty;
    }

    const hasCookiesApi = "cookies" in request && typeof (request as { cookies?: { getAll?: () => { name: string; value: string }[] } }).cookies?.getAll === "function";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          if (hasCookiesApi) {
            return (request as { cookies: { getAll: () => { name: string; value: string }[] } }).cookies.getAll();
          }
          const cookieHeader = request.headers.get("cookie") || "";
          if (!cookieHeader.trim()) return [];
          return cookieHeader.split("; ").map((cookie) => {
            const eq = cookie.indexOf("=");
            const name = (eq === -1 ? cookie : cookie.slice(0, eq)).trim();
            let value = eq === -1 ? "" : cookie.slice(eq + 1).trim();
            try {
              value = decodeURIComponent(value);
            } catch {
              /* keep value as-is */
            }
            return { name, value };
          });
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          if (response?.cookies) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          }
        },
      },
    });

    let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
    let error: { message?: string } | null = null;
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
      error = result.error;
    } catch (authError) {
      const msg = (authError as Error)?.message ?? "";
      if (!msg.includes("Refresh Token") && !msg.includes("refresh_token")) {
        console.error("Error getting current user from request:", authError);
      }
      return empty;
    }

    if (error || !user) {
      return empty;
    }

    const metadata = user.user_metadata as unknown as UserMetadata;
    if (!metadata || !metadata.type) {
      return empty;
    }

    const displayName =
      typeof (user.user_metadata as { display_name?: string })?.display_name === "string"
        ? (user.user_metadata as { display_name: string }).display_name
        : null;

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || "",
      display_name: displayName || null,
      metadata: {
        type: metadata.type,
        role: metadata.role,
        tenant_id: metadata.tenant_id,
        allowed_schemas: metadata.allowed_schemas,
      },
    };

    const { data: { session } } = await supabase.auth.getSession();
    const sessionWithAal = session as { aal?: "aal1" | "aal2"; access_token?: string } | null;
    let aal = (sessionWithAal?.aal ?? "aal1") as "aal1" | "aal2";
    if (session?.access_token && (aal === "aal1" || !sessionWithAal?.aal)) {
      const payload = decodeJwtPayload(session.access_token);
      if (payload && typeof payload.aal === "string" && (payload.aal === "aal1" || payload.aal === "aal2")) {
        aal = payload.aal as "aal1" | "aal2";
      }
    }

    return {
      user: authUser,
      session: session ? { aal, access_token: session.access_token } : null,
    };
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    if (!msg.includes("Refresh Token") && !msg.includes("refresh_token")) {
      console.error("Error getting current user from request:", err);
    }
    return empty;
  }
}

/**
 * Validate that the user has access to the current tenant schema.
 * 
 * Rules:
 * - Superadmin: Can access any schema (bypasses tenant_id check)
 * - Client Admin: Must have tenant_id matching NEXT_PUBLIC_CLIENT_SCHEMA
 * - Member: Must have tenant_id matching NEXT_PUBLIC_CLIENT_SCHEMA
 * 
 * @param user - Authenticated user
 * @returns true if user has access, false otherwise
 */
export function validateTenantAccess(user: AuthUser | null): boolean {
  if (!user) {
    return false;
  }

  const currentSchema = getClientSchema();

  // Superadmin can access any schema
  if (user.metadata.type === "superadmin" && user.metadata.role === "superadmin") {
    // Check if allowed_schemas is set and current schema is in the list
    if (user.metadata.allowed_schemas) {
      // If allowed_schemas contains "*", allow all
      if (user.metadata.allowed_schemas.includes("*")) {
        return true;
      }
      // Otherwise check if current schema is in the list
      return user.metadata.allowed_schemas.includes(currentSchema);
    }
    // If no allowed_schemas restriction, superadmin can access all
    return true;
  }

  // Admin and member users must have matching tenant_id
  if (user.metadata.type === "admin" || user.metadata.type === "member") {
    return user.metadata.tenant_id === currentSchema;
  }

  return false;
}

/**
 * Check if user has the required role or higher.
 * 
 * Role hierarchy (for admin users):
 * - superadmin: Highest level (platform admin)
 * - client_admin: Full access within tenant
 * - editor: Can create/edit content
 * - viewer: Read-only access
 * 
 * @param user - Authenticated user
 * @param requiredRole - Required role to check
 * @returns true if user has required role or higher
 */
export function hasRole(
  user: AuthUser | null,
  requiredRole: "superadmin" | "client_admin" | "editor" | "viewer"
): boolean {
  if (!user || !user.metadata.role) {
    return false;
  }

  // Superadmin has access to everything
  if (user.metadata.role === "superadmin") {
    return true;
  }

  // Role hierarchy for client admins
  const roleHierarchy: Record<string, number> = {
    viewer: 1,
    editor: 2,
    client_admin: 3,
    superadmin: 4,
  };

  const userRoleLevel = roleHierarchy[user.metadata.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if user is a superadmin (reads from user_metadata only).
 * Kept for backward compatibility when PHP-Auth is not configured.
 * When PHP-Auth is configured, prefer getRoleForCurrentUser() + isSuperadminFromRole(role)
 * from `@/lib/auth/resolve-role` for server-side checks so role comes from central auth.
 *
 * @param user - Authenticated user
 * @returns true if user is superadmin
 */
export function isSuperadmin(user: AuthUser | null): boolean {
  return (
    user?.metadata.type === "superadmin" &&
    user?.metadata.role === "superadmin"
  );
}

/**
 * Check if user is a client admin (not superadmin).
 * 
 * @param user - Authenticated user
 * @returns true if user is client admin
 */
export function isClientAdmin(user: AuthUser | null): boolean {
  return (
    user?.metadata.type === "admin" &&
    user?.metadata.role !== "superadmin"
  );
}

/**
 * Check if user is a member (GPUM).
 * 
 * @param user - Authenticated user
 * @returns true if user is a member
 */
export function isMember(user: AuthUser | null): boolean {
  return user?.metadata.type === "member";
}
