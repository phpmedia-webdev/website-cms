/**
 * Push audit events to PHP-Auth central audit log.
 * Server-side only; AUTH_API_KEY must not be exposed to the client.
 */

import { getPhpAuthConfig } from "./config";

export interface AuditLogPayload {
  action: string;
  organizationId?: string;
  applicationId?: string;
  userId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  loginSource?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** Parsed from User-Agent for analytics (e.g. desktop vs mobile). Sent in metadata. */
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown" | null;
  /** Parsed browser name. Sent in metadata. */
  browser?: string | null;
}

export interface ClientAuditContext {
  ipAddress: string;
  userAgent: string | null;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string | null;
}

/**
 * Get client IP, User-Agent, and parsed device/browser from the incoming request.
 * Use when pushing audit events so PHP-Auth can analyze by IP and device type.
 */
export function getClientAuditContext(request: Request): ClientAuditContext {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("x-real-ip") ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? null;
  const { deviceType, browser } = parseUserAgent(userAgent ?? "");
  return { ipAddress, userAgent, deviceType, browser };
}

/**
 * Simple User-Agent parse for device type and browser name.
 * Used for audit log analytics (e.g. desktop vs mobile ratio).
 */
function parseUserAgent(ua: string): {
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string | null;
} {
  const uaLower = ua.toLowerCase();
  let deviceType: "desktop" | "mobile" | "tablet" | "unknown" = "unknown";
  if (/\b(ipad|tablet|playbook|silk)\b/.test(uaLower) || (/\bandroid\b/.test(uaLower) && !/\bmobile\b/.test(uaLower))) {
    deviceType = "tablet";
  } else if (/\b(iphone|ipod|android|webos|blackberry|iemobile|opera mini|mobile)\b/.test(uaLower)) {
    deviceType = "mobile";
  } else if (ua.length > 0) {
    deviceType = "desktop";
  }

  let browser: string | null = null;
  if (/\bedg\b/.test(uaLower)) browser = "Edge";
  else if (/\bopr\b|\bopera\b/.test(uaLower)) browser = "Opera";
  else if (/\bchrome\b/.test(uaLower)) browser = "Chrome";
  else if (/\bsafari\b/.test(uaLower) && !/\bchrome\b/.test(uaLower)) browser = "Safari";
  else if (/\bfirefox\b/.test(uaLower)) browser = "Firefox";
  else if (/\bmsie\b|trident/.test(uaLower)) browser = "IE";

  return { deviceType, browser };
}

/**
 * POST an audit event to PHP-Auth. No-op if PHP-Auth is not configured.
 * Handles 429 (rate limit) by logging and skipping; does not throw.
 */
export async function pushAuditLog(payload: AuditLogPayload): Promise<void> {
  const config = getPhpAuthConfig();
  if (!config) return;

  const url = `${config.baseUrl}/api/external/audit-log`;
  const metadata: Record<string, unknown> = { ...(payload.metadata ?? {}) };
  if (payload.deviceType != null) metadata.deviceType = payload.deviceType;
  if (payload.browser != null) metadata.browser = payload.browser;

  const body = {
    action: payload.action,
    organizationId: payload.organizationId ?? config.orgId,
    applicationId: payload.applicationId ?? config.applicationId,
    ...(payload.userId != null && { userId: payload.userId }),
    ...(payload.resourceType != null && { resourceType: payload.resourceType }),
    ...(payload.resourceId != null && { resourceId: payload.resourceId }),
    ...(payload.loginSource != null && { loginSource: payload.loginSource }),
    ...(Object.keys(metadata).length > 0 && { metadata }),
    ...(payload.ipAddress != null && { ipAddress: payload.ipAddress }),
    ...(payload.userAgent != null && { userAgent: payload.userAgent }),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      console.warn("[audit-log] Rate limited (429), skipping event:", payload.action);
    } else if (!res.ok) {
      console.warn("[audit-log] Failed to push event:", payload.action, res.status);
    }
  } catch (err) {
    console.warn("[audit-log] Error pushing event:", payload.action, err);
  }
}
