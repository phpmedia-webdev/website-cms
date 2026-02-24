import { NextResponse } from "next/server";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { getCurrentUser, validateTenantAccess } from "@/lib/auth/supabase-auth";
import { pushAuditLog } from "@/lib/php-auth/audit-log";

/**
 * Login endpoint using Supabase Auth.
 * Authenticates user and sets Supabase session cookie.
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

    // Create Supabase client for authentication
    const supabase = createClientSupabaseClient();

    // Sign in with email and password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session || !authData.user) {
      pushAuditLog({
        action: "login_failed",
        loginSource: "website-cms",
        metadata: { reason: authError?.message ?? "invalid_credentials" },
      }).catch(() => {});
      return NextResponse.json(
        { error: authError?.message || "Invalid credentials" },
        { status: 401 }
      );
    }

    // Validate user has proper metadata structure
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "User account missing required metadata" },
        { status: 403 }
      );
    }

    // Validate tenant access (ensures user can access this deployment's schema)
    if (!validateTenantAccess(user)) {
      return NextResponse.json(
        { error: "Access denied: Invalid tenant association" },
        { status: 403 }
      );
    }

    pushAuditLog({
      action: "login_success",
      loginSource: "website-cms",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.metadata.role,
        type: user.metadata.type,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
      },
      redirect: "/admin/dashboard",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
