import { NextResponse } from "next/server";
import { setSessionToken } from "@/lib/auth/session";
import { validateSession } from "@/lib/auth/api-client";

/**
 * Login endpoint that validates credentials with auth API
 * and sets session cookie.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // TODO: Call auth API to authenticate
    // This is a placeholder - integrate with your actual auth API
    const AUTH_API_URL = process.env.AUTH_API_URL;
    if (!AUTH_API_URL) {
      return NextResponse.json(
        { error: "Authentication service not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(`${AUTH_API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.AUTH_API_KEY && {
          Authorization: `Bearer ${process.env.AUTH_API_KEY}`,
        }),
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Invalid credentials" }));
      return NextResponse.json(error, { status: response.status });
    }

    const { token } = await response.json();

    // Validate the token
    const session = await validateSession(token);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid session token" },
        { status: 401 }
      );
    }

    // Set session cookie
    await setSessionToken(token);

    return NextResponse.json({ success: true, user: session.user, redirect: "/admin/dashboard" });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
