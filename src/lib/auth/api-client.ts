/**
 * Client for integrating with the existing multi-tenant auth API.
 */

const AUTH_API_URL = process.env.AUTH_API_URL;
const AUTH_API_KEY = process.env.AUTH_API_KEY;

if (!AUTH_API_URL) {
  throw new Error("AUTH_API_URL environment variable is required");
}

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  tenant_id?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expires_at: string;
}

/**
 * Validate a session token with the auth API.
 */
export async function validateSession(
  token: string
): Promise<AuthSession | null> {
  try {
    const response = await fetch(`${AUTH_API_URL}/api/session/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_API_KEY && { Authorization: `Bearer ${AUTH_API_KEY}` }),
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as AuthSession;
  } catch (error) {
    console.error("Auth API error:", error);
    return null;
  }
}

/**
 * Get user information from the auth API.
 */
export async function getUser(token: string): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${AUTH_API_URL}/api/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(AUTH_API_KEY && { "X-API-Key": AUTH_API_KEY }),
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as AuthUser;
  } catch (error) {
    console.error("Auth API error:", error);
    return null;
  }
}

/**
 * Check if user has required role.
 */
export function hasRole(
  user: AuthUser | null,
  requiredRole: "admin" | "editor" | "viewer"
): boolean {
  if (!user) return false;

  const roleHierarchy: Record<string, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}
