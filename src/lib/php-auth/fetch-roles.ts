/**
 * M5: Fetch roles from PHP-Auth for role picker (Superadmin Users, Settings → Users).
 * SSOT only — no fallback. Returns [] when PHP-Auth is not configured, request fails, or returns no roles.
 *
 * Calls GET {AUTH_BASE_URL}/api/external/roles (optionally ?scope=...) with header X-API-Key only.
 * If AUTH_ROLES_SCOPE is set, appends ?scope=<value>; otherwise omits scope so PHP-Auth derives from the API key
 * (avoids 403 when the Application type in PHP-Auth is not yet "website-cms"). Response: { success: true, data: { roles: [ ... ] } }.
 * See docs/reference/php-auth-external-roles-api.md.
 */

import { getPhpAuthConfig } from "./config";
import { type RoleOption, isMemberRole } from "./role-mapping";

/** Application-type scope in PHP-Auth for this app. Used only when AUTH_ROLES_SCOPE is set. */
export const PHP_AUTH_WEBSITE_CMS_SCOPE = "website-cms";

export interface PhpAuthRoleItem {
  id?: string;
  name?: string;
  slug: string;
  label: string;
}

function parseRolesResponse(data: unknown): RoleOption[] | null {
  if (data === null || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const roles = d.roles ?? d.data;
  if (!Array.isArray(roles)) return null;
  const result: RoleOption[] = [];
  for (const r of roles) {
    if (r === null || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : (typeof row.name === "string" ? row.name.trim() : slug);
    if (slug) result.push({ slug, label: label || slug });
  }
  return result.length ? result : null;
}

/**
 * Fetch roles for this app from PHP-Auth (scope website-cms). SSOT only — no fallback.
 * Excludes GPUM so the result is suitable for admin assignment dropdowns.
 * Returns [] when PHP-Auth is not configured, request fails, or returns no roles.
 */
export async function getRolesForAssignmentFromPhpAuth(): Promise<RoleOption[]> {
  const config = getPhpAuthConfig();
  /* DEBUG START: PHP-Auth roles fetch — remove when done debugging */
  const debugTag = "[getRolesForAssignmentFromPhpAuth]";
  if (!config) {
    console.warn(debugTag, "No PHP-Auth config (missing AUTH_* env); returning []");
    return [];
  }
  // Send scope=website-cms when AUTH_ROLES_SCOPE is set. If omitted, PHP-Auth derives from API key (use when Application type in PHP-Auth is not yet "website-cms" to avoid 403).
  const scopeParam = process.env.AUTH_ROLES_SCOPE !== undefined && process.env.AUTH_ROLES_SCOPE !== ""
    ? `?scope=${encodeURIComponent(process.env.AUTH_ROLES_SCOPE)}`
    : "";
  const url = `${config.baseUrl}/${config.rolesPath}${scopeParam}`;
  console.warn(debugTag, "Calling URL:", url);
  /* DEBUG END */

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    /* DEBUG START: log response status and body snippet */
    const rawText = await res.text();
    console.warn(debugTag, "Response status:", res.status, "ok:", res.ok, "body length:", rawText.length);
    console.warn(debugTag, "Response body (first 400 chars):", rawText.slice(0, 400));
    /* DEBUG END */

    if (!res.ok) {
      /* DEBUG START */
      console.warn(debugTag, "!res.ok, returning []");
      /* DEBUG END */
      return [];
    }
    let json: Record<string, unknown> | null = null;
    try {
      json = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
    } catch {
      /* DEBUG START */
      console.warn(debugTag, "JSON.parse failed on body");
      /* DEBUG END */
    }
    if (!json) {
      /* DEBUG START */
      console.warn(debugTag, "No JSON body, returning []");
      /* DEBUG END */
      return [];
    }
    // Contract: { success: true, data: { roles: [ ... ] } } or { data: [ ... ] } or { roles: [ ... ] }
    const top = json as Record<string, unknown>;
    const data = top.data ?? top;
    let roles = Array.isArray(data) ? parseRolesResponse({ roles: data }) : parseRolesResponse(data);
    if (!roles?.length && Array.isArray(top.roles)) {
      roles = parseRolesResponse({ roles: top.roles });
    }

    /* DEBUG START */
    console.warn(debugTag, "Parsed roles count:", roles?.length ?? 0, "slugs:", roles?.map((r) => r.slug) ?? []);
    /* DEBUG END */

    if (!roles || roles.length === 0) return [];
    const filtered = roles.filter((r) => !isMemberRole(r.slug));
    return filtered;
  } catch (e) {
    /* DEBUG START */
    console.warn(debugTag, "Fetch threw:", e instanceof Error ? e.message : String(e));
    /* DEBUG END */
    return [];
  }
}
