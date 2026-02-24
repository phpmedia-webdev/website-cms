/**
 * PHP-Auth (central auth app) configuration.
 * Used for validate-user (roles) and audit-log. Never commit AUTH_API_KEY.
 */

const AUTH_BASE_URL = process.env.AUTH_BASE_URL;
const AUTH_ORG_ID = process.env.AUTH_ORG_ID;
const AUTH_APPLICATION_ID = process.env.AUTH_APPLICATION_ID;
const AUTH_API_KEY = process.env.AUTH_API_KEY;

export function getPhpAuthConfig(): {
  baseUrl: string;
  orgId: string;
  applicationId: string;
  apiKey: string;
} | null {
  if (!AUTH_BASE_URL || !AUTH_ORG_ID || !AUTH_APPLICATION_ID || !AUTH_API_KEY) {
    return null;
  }
  return {
    baseUrl: AUTH_BASE_URL.replace(/\/$/, ""),
    orgId: AUTH_ORG_ID,
    applicationId: AUTH_APPLICATION_ID,
    apiKey: AUTH_API_KEY,
  };
}

/** True if all four AUTH_* env vars are set (PHP-Auth integration enabled). */
export function isPhpAuthConfigured(): boolean {
  return getPhpAuthConfig() !== null;
}
