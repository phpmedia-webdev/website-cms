/**
 * POST /api/auth/member-login-audit
 * Records member (GPUM) login_success or login_failed to PHP-Auth audit log.
 * Called from the public /login page after sign-in attempt (client-side has no access to request IP/UA).
 * Sends IP, userAgent, deviceType, browser from this request for analytics.
 */

import { NextResponse } from "next/server";
import { pushAuditLog, getClientAuditContext } from "@/lib/php-auth/audit-log";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";

const MEMBER_LOGIN_AUDIT_ACTIONS = ["login_success", "login_failed"] as const;
type MemberLoginAuditAction = (typeof MEMBER_LOGIN_AUDIT_ACTIONS)[number];

function isMemberLoginAuditAction(v: unknown): v is MemberLoginAuditAction {
  return typeof v === "string" && MEMBER_LOGIN_AUDIT_ACTIONS.includes(v as MemberLoginAuditAction);
}

export async function POST(request: Request) {
  try {
    const ctx = getClientAuditContext(request);
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (raw === null || typeof raw !== "object") {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const { action, email } = raw as Record<string, unknown>;
    if (!isMemberLoginAuditAction(action)) {
      return NextResponse.json({ error: "action must be login_success or login_failed" }, { status: 400 });
    }
    const emailStr = typeof email === "string" ? email : undefined;

    const basePayload = {
      loginSource: "website-cms",
      metadata: { userType: "member" as const },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      deviceType: ctx.deviceType,
      browser: ctx.browser,
    };

    if (action === "login_failed") {
      pushAuditLog({
        action: "login_failed",
        ...basePayload,
        metadata: { ...basePayload.metadata, email: emailStr },
      }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    // login_success: try to get user from session so we have userId/email
    const supabase = await createServerSupabaseClientSSR();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    pushAuditLog({
      action: "login_success",
      ...basePayload,
      userId: user?.id,
      metadata: {
        ...basePayload.metadata,
        email: user?.email ?? emailStr,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("member-login-audit error:", err);
    return NextResponse.json({ error: "Failed to record audit" }, { status: 500 });
  }
}
