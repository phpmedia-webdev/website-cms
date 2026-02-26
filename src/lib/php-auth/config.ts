/**
 * PHP-Auth (central auth app) configuration.
 * Used for validate-user (roles) and audit-log. Never commit AUTH_API_KEY.
 *
 * Optional: AUTH_ROLES_PATH — path for listing roles (default /api/external/roles).
 * Optional: AUTH_CHECK_USER_PATH — path for check-user lookup (default api/external/check-user).
 */

const AUTH_BASE_URL = process.env.AUTH_BASE_URL;
const AUTH_ORG_ID = process.env.AUTH_ORG_ID;
const AUTH_APPLICATION_ID = process.env.AUTH_APPLICATION_ID;
const AUTH_API_KEY = process.env.AUTH_API_KEY;

/** Default path for GET roles (no leading slash); override with AUTH_ROLES_PATH if PHP-Auth uses another path. */
export const DEFAULT_AUTH_ROLES_PATH = "api/external/roles";

export function getPhpAuthConfig(): {
  baseUrl: string;
  orgId: string;
  applicationId: string;
  apiKey: string;
  rolesPath: string;
} | null {
  if (!AUTH_BASE_URL || !AUTH_ORG_ID || !AUTH_APPLICATION_ID || !AUTH_API_KEY) {
    return null;
  }
  const raw = process.env.AUTH_ROLES_PATH ?? DEFAULT_AUTH_ROLES_PATH;
  const rolesPath = raw.replace(/^\//, "").replace(/\/$/, "") || DEFAULT_AUTH_ROLES_PATH;
  return {
    baseUrl: AUTH_BASE_URL.replace(/\/$/, ""),
    orgId: AUTH_ORG_ID,
    applicationId: AUTH_APPLICATION_ID,
    apiKey: AUTH_API_KEY,
    rolesPath,
  };
}

/** True if all four AUTH_* env vars are set (PHP-Auth integration enabled). */
export function isPhpAuthConfigured(): boolean {
  return getPhpAuthConfig() !== null;
}
