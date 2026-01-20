/**
 * Session management utilities.
 * Handles session storage and retrieval from cookies.
 */

import { cookies } from "next/headers";
import { validateSession, type AuthSession } from "./api-client";

const SESSION_COOKIE_NAME = "cms_session_token";

/**
 * Get the session token from cookies.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Set the session token in cookies.
 */
export async function setSessionToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Remove the session token from cookies.
 */
export async function clearSessionToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get the current authenticated session.
 */
export async function getSession(): Promise<AuthSession | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  return await validateSession(token);
}

/**
 * Check if user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
