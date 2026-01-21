/**
 * Session management utilities for Supabase Auth.
 * Provides compatibility layer for existing code using session helpers.
 */

import { getCurrentUser, type AuthUser } from "./supabase-auth";

/**
 * Legacy session interface for backward compatibility.
 * @deprecated Use AuthUser from supabase-auth.ts instead
 */
export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: string;
    type: string;
  };
  expires_at?: string;
}

/**
 * Get the current authenticated session.
 * Uses Supabase Auth to get the current user.
 * 
 * @returns Session object with user data, or null if not authenticated
 */
export async function getSession(): Promise<AuthSession | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  // Return in legacy format for backward compatibility
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.metadata.role || "",
      type: user.metadata.type,
    },
  };
}

/**
 * Check if user is authenticated.
 * 
 * @returns true if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get the current authenticated user.
 * Direct access to Supabase Auth user.
 * 
 * @returns AuthUser or null
 */
export async function getCurrentSessionUser(): Promise<AuthUser | null> {
  return await getCurrentUser();
}
