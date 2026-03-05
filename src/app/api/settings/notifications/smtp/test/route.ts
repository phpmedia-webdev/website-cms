/**
 * POST /api/settings/notifications/smtp/test — Send a test email using current SMTP config.
 * Body: { recipients: string } (comma-separated emails) or { recipients: string[] }.
 * Admin/superadmin only.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { sendEmail } from "@/lib/email/send";

const TEST_SUBJECT = "Test email from Website-CMS";
const TEST_BODY = "This is a Test email from Website-CMS application.";

function parseRecipients(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((e) => String(e).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((e) => e.trim()).filter(Boolean);
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const recipients = parseRecipients(body.recipients);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Enter at least one recipient (comma-separated emails)." },
        { status: 400 }
      );
    }

    const ok = await sendEmail({
      to: recipients,
      subject: TEST_SUBJECT,
      text: TEST_BODY,
    });

    if (!ok) {
      return NextResponse.json(
        { error: "Failed to send test email. Check SMTP config and encryption key." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Test email sent." });
  } catch (err) {
    console.error("POST smtp test:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
