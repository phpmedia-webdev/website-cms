/**
 * GET /api/settings/form-protection — get form protection settings (client-safe: no secret key).
 * PATCH /api/settings/form-protection — save form protection (body: { recaptchaEnabled?, recaptchaSiteKey?, recaptchaSecretKey? }).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getFormProtectionSettingsPublic,
  setFormProtectionSettings,
} from "@/lib/forms/form-protection-settings";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await getFormProtectionSettingsPublic();
    return NextResponse.json(settings);
  } catch (e) {
    console.error("GET /api/settings/form-protection:", e);
    return NextResponse.json(
      { error: "Failed to load form protection settings" },
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
    const body = (await request.json()) as Record<string, unknown>;
    const updates: Parameters<typeof setFormProtectionSettings>[0] = {};
    if (typeof body.recaptchaEnabled === "boolean") {
      updates.recaptchaEnabled = body.recaptchaEnabled;
    }
    if (typeof body.recaptchaSiteKey === "string") {
      updates.recaptchaSiteKey = body.recaptchaSiteKey;
    }
    if (typeof body.recaptchaSecretKey === "string") {
      updates.recaptchaSecretKey = body.recaptchaSecretKey;
    }
    const ok = await setFormProtectionSettings(updates);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to save form protection settings" },
        { status: 500 }
      );
    }
    const settings = await getFormProtectionSettingsPublic();
    return NextResponse.json(settings);
  } catch (e) {
    console.error("PATCH /api/settings/form-protection:", e);
    return NextResponse.json(
      { error: "Failed to save form protection settings" },
      { status: 500 }
    );
  }
}
