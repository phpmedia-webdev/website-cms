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
}

/**
 * POST an audit event to PHP-Auth. No-op if PHP-Auth is not configured.
 * Handles 429 (rate limit) by logging and skipping; does not throw.
 */
export async function pushAuditLog(payload: AuditLogPayload): Promise<void> {
  const config = getPhpAuthConfig();
  if (!config) return;

  const url = `${config.baseUrl}/api/external/audit-log`;
  const body = {
    action: payload.action,
    organizationId: payload.organizationId ?? config.orgId,
    applicationId: payload.applicationId ?? config.applicationId,
    ...(payload.userId != null && { userId: payload.userId }),
    ...(payload.resourceType != null && { resourceType: payload.resourceType }),
    ...(payload.resourceId != null && { resourceId: payload.resourceId }),
    ...(payload.loginSource != null && { loginSource: payload.loginSource }),
    ...(payload.metadata != null && { metadata: payload.metadata }),
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
