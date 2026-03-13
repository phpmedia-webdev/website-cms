/**
 * Form protection settings (reCAPTCHA, etc.) per tenant.
 * Stored in tenant settings under key "forms.form_protection".
 * Secret key is server-only; never returned to client.
 */

import { getSetting, setSetting } from "@/lib/supabase/settings";

export const FORM_PROTECTION_SETTINGS_KEY = "forms.form_protection";

/** Honeypot field name: added in code to forms; if filled, submission is treated as bot. Do not use as a form field name. */
export const HONEYPOT_FIELD = "website";

/** Field names reserved for form protection (e.g. honeypot). Block these in form builders. */
export const RESERVED_FORM_FIELD_NAMES: string[] = [HONEYPOT_FIELD];

export interface FormProtectionSettings {
  /** Enable reCAPTCHA for public form submissions. */
  recaptchaEnabled?: boolean;
  /** Google reCAPTCHA site key (public, used in browser). */
  recaptchaSiteKey?: string;
  /** Google reCAPTCHA secret key (server-only, never sent to client). */
  recaptchaSecretKey?: string;
}

/** Client-safe shape (no secret key). */
export interface FormProtectionSettingsPublic {
  recaptchaEnabled: boolean;
  recaptchaSiteKey: string | null;
}

const defaults: FormProtectionSettings = {
  recaptchaEnabled: false,
  recaptchaSiteKey: "",
  recaptchaSecretKey: "",
};

/**
 * Get form protection settings (full, for server-side verify).
 */
export async function getFormProtectionSettings(): Promise<FormProtectionSettings> {
  const raw = await getSetting<FormProtectionSettings>(FORM_PROTECTION_SETTINGS_KEY);
  if (!raw || typeof raw !== "object") {
    return { ...defaults };
  }
  return {
    recaptchaEnabled: Boolean(raw.recaptchaEnabled),
    recaptchaSiteKey:
      typeof raw.recaptchaSiteKey === "string" ? raw.recaptchaSiteKey.trim() : "",
    recaptchaSecretKey:
      typeof raw.recaptchaSecretKey === "string" ? raw.recaptchaSecretKey.trim() : "",
  };
}

/**
 * Get client-safe form protection settings (for form config API and admin display).
 * Never returns secret key.
 */
export async function getFormProtectionSettingsPublic(): Promise<FormProtectionSettingsPublic> {
  const full = await getFormProtectionSettings();
  return {
    recaptchaEnabled: full.recaptchaEnabled ?? false,
    recaptchaSiteKey: full.recaptchaSiteKey || null,
  };
}

/**
 * Save form protection settings.
 */
export async function setFormProtectionSettings(
  input: Partial<FormProtectionSettings>
): Promise<boolean> {
  const current = await getFormProtectionSettings();
  const next: FormProtectionSettings = {
    ...current,
    ...(typeof input.recaptchaEnabled === "boolean" && { recaptchaEnabled: input.recaptchaEnabled }),
    ...(typeof input.recaptchaSiteKey === "string" && {
      recaptchaSiteKey: input.recaptchaSiteKey.trim(),
    }),
    ...(typeof input.recaptchaSecretKey === "string" && {
      recaptchaSecretKey: input.recaptchaSecretKey.trim(),
    }),
  };
  return setSetting(FORM_PROTECTION_SETTINGS_KEY, next);
}
