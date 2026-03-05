/**
 * GET /api/settings/notifications/smtp — SMTP config for current tenant (no password).
 * PATCH /api/settings/notifications/smtp — Update SMTP config. Admin only. Encrypts password on write.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getSetting, setSetting } from "@/lib/supabase/settings";
import {
  SMTP_CONFIG_KEY,
  toPublicConfig,
  encryptSmtpPassword,
  type SmtpConfigStored,
  type SmtpConfigPublic,
} from "@/lib/email/smtp-config";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stored = await getSetting<SmtpConfigStored>(SMTP_CONFIG_KEY);
    const config = toPublicConfig(stored ?? null);
    return NextResponse.json(config ?? {});
  } catch (err) {
    console.error("GET notifications smtp:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      host,
      port,
      user: smtpUser,
      from_email,
      from_name,
      secure,
      password,
      notification_recipients,
    } = body as {
      host?: string;
      port?: number;
      user?: string;
      from_email?: string;
      from_name?: string;
      secure?: boolean;
      password?: string;
      notification_recipients?: string;
    };

    const existing = await getSetting<SmtpConfigStored>(SMTP_CONFIG_KEY);

    let password_encrypted = existing?.password_encrypted ?? "";
    if (typeof password === "string" && password.trim() !== "") {
      try {
        password_encrypted = encryptSmtpPassword(password.trim());
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Encryption failed.";
        return NextResponse.json(
          {
            error:
              "Encryption not configured. Set SMTP_ENCRYPTION_KEY in .env.local (no space after =), use a non-empty value, and restart the dev server.",
            detail: process.env.NODE_ENV === "development" ? msg : undefined,
          },
          { status: 500 }
        );
      }
    }

    const toStore: SmtpConfigStored = {
      host: typeof host === "string" ? host.trim() : (existing?.host ?? ""),
      port:
        typeof port === "number" && port > 0 && port <= 65535
          ? port
          : existing?.port ?? 587,
      user: typeof smtpUser === "string" ? smtpUser.trim() : (existing?.user ?? ""),
      from_email:
        typeof from_email === "string" ? from_email.trim() : (existing?.from_email ?? ""),
      from_name:
        typeof from_name === "string" ? from_name.trim() || undefined : existing?.from_name,
      secure: typeof secure === "boolean" ? secure : existing?.secure ?? false,
      password_encrypted,
      notification_recipients:
        typeof notification_recipients === "string"
          ? notification_recipients.trim()
          : existing?.notification_recipients ?? "",
    };

    const ok = await setSetting(SMTP_CONFIG_KEY, toStore);
    if (!ok) {
      return NextResponse.json({ error: "Failed to save SMTP config" }, { status: 500 });
    }

    const config = toPublicConfig(toStore);
    return NextResponse.json(config ?? {});
  } catch (err) {
    console.error("PATCH notifications smtp:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
