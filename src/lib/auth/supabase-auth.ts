/**
 * Supabase Auth utilities for multi-tenant authentication.
 * Handles user authentication, tenant validation, and role checking.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
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

/**
 * Get current user from middleware (handles cookies from NextRequest).
 * This version extracts the JWT token from cookies and validates it.
 * 
 * @param request - NextRequest from middleware
 * @returns Authenticated user with metadata or null
 */
export async function getCurrentUserFromRequest(
  request: Request
): Promise<AuthUser | null> {
  try {
    // Use @supabase/ssr createServerClient for proper cookie handling in middleware
    const { createServerClient } = await import("@supabase/ssr");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    // Create a server client that can read cookies from the request
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          // Extract cookies from request headers
          const cookieHeader = request.headers.get("cookie") || "";
          return cookieHeader.split("; ").map((cookie) => {
            const [name, ...rest] = cookie.split("=");
            return {
              name: name.trim(),
              value: decodeURIComponent(rest.join("=")),
            };
          });
        },
        setAll() {
          // No-op in middleware - cookies are set via response
        },
      },
    });
    
    // Get user from session (may throw AuthApiError if refresh token is invalid/expired)
    let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
    let error: { message?: string } | null = null;
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
      error = result.error;
    } catch (authError) {
      // Invalid/expired refresh token: treat as no session, don't log to avoid console noise
      const msg = (authError as Error)?.message ?? "";
      if (!msg.includes("Refresh Token") && !msg.includes("refresh_token")) {
        console.error("Error getting current user from request:", authError);
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
      console.error("Error getting current user from request:", err);
    }
    return null;
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
 * Check if user is a superadmin.
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
