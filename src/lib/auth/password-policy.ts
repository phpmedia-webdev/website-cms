/**
 * Password policy: single source of truth for validation.
 * Aligned with NIST SP 800-63B–style guidance: length + denylist, no composition rules.
 * Use on sign-up, change-password, and set-new-password (reset) flows.
 * Enforce client-side and, where possible, server-side (e.g. Before User Created hook).
 */

/** Min length for all users. */
export const PASSWORD_MIN_LENGTH = 12;

/** Max length (sane upper bound, password-manager friendly). */
export const PASSWORD_MAX_LENGTH = 128;

/** Default denylist: common and obviously weak passwords. */
const DEFAULT_DENYLIST = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "Password1",
  "Password12",
  "Password123",
  "qwerty",
  "qwerty123",
  "qwerty1234",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "admin",
  "admin123",
  "administrator",
  "letmein",
  "welcome",
  "welcome1",
  "monkey",
  "dragon",
  "master",
  "sunshine",
  "princess",
  "football",
  "iloveyou",
  "trustno1",
  "superman",
  "login",
  "passw0rd",
  "qwertyuiop",
  "abc123",
  "111111",
  "123123",
  "changeme",
  "password!",
  "Password!",
  "admin@123",
  "root",
  "toor",
  "pass",
  "test",
  "test123",
  "guest",
  "default",
  "temp",
  "temporary",
  "website",
  "cms",
]);

export interface PasswordPolicyOptions {
  /** Minimum length (default PASSWORD_MIN_LENGTH). */
  minLength?: number;
  /** Maximum length (default PASSWORD_MAX_LENGTH). */
  maxLength?: number;
  /** Extra disallowed passwords (e.g. app name, org name). Lowercased for comparison. */
  extraDenylist?: string[];
  /** If true, skip denylist check (e.g. for tests). */
  skipDenylist?: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Normalize password input: NFKC, strip control characters.
 * Use the same normalization when hashing/checking (Supabase receives what you send).
 */
export function normalizePassword(value: string): string {
  if (typeof value !== "string") return "";
  const normalized = value.normalize("NFKC");
  // Remove control characters (C0, C1, and other control-like chars)
  return normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

/**
 * Validate password against policy: length and denylist only (no composition rules).
 * Call this before sign-up, change-password, and set-new-password.
 */
export function validatePassword(
  password: string,
  options: PasswordPolicyOptions = {}
): PasswordValidationResult {
  const minLength = options.minLength ?? PASSWORD_MIN_LENGTH;
  const maxLength = options.maxLength ?? PASSWORD_MAX_LENGTH;
  const normalized = normalizePassword(password);

  if (normalized.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters.`,
    };
  }

  if (normalized.length > maxLength) {
    return {
      valid: false,
      error: `Password must be no more than ${maxLength} characters.`,
    };
  }

  if (!options.skipDenylist) {
    const combinedDenylist = new Set(DEFAULT_DENYLIST);
    if (options.extraDenylist?.length) {
      options.extraDenylist.forEach((s) => combinedDenylist.add(s.toLowerCase().trim()));
    }
    const lower = normalized.toLowerCase();
    if (combinedDenylist.has(lower)) {
      return {
        valid: false,
        error: "This password is too common or not allowed. Please choose a different one.",
      };
    }
  }

  return { valid: true };
}

/**
 * Build extra denylist for a tenant (e.g. app name, site name).
 * Pass the result as options.extraDenylist to validatePassword.
 */
export function buildExtraDenylist(appName?: string | null, orgName?: string | null): string[] {
  const list: string[] = [];
  if (appName?.trim()) list.push(appName.trim().toLowerCase());
  if (orgName?.trim()) list.push(orgName.trim().toLowerCase());
  return list;
}
