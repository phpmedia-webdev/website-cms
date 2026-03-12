/**
 * Cart session cookie name and options (Step 13).
 * Used by cart API to identify the current cart session.
 */

export const CART_SESSION_COOKIE = "cart_session_id";

export const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};
