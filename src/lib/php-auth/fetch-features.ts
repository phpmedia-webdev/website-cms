/**
 * M5 C5: Fetch feature registry from PHP-Auth (scope website-cms) for tenant gating table.
 * Falls back to empty array if PHP-Auth is unavailable or API not implemented.
 * See docs/reference/php-auth-roles-features-permissions.md for API contract.
 */

import { getPhpAuthConfig } from "./config";

const WEBSITE_CMS_SCOPE = "website-cms";

export interface PhpAuthFeatureItem {
  id?: string;
  slug: string;
  label: string;
  scope?: string;
  order?: number;
  is_enabled?: boolean;
}

function parseFeaturesResponse(data: unknown): PhpAuthFeatureItem[] | null {
  if (data === null || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const features = d.features ?? d.data;
  if (!Array.isArray(features)) return null;
  const result: PhpAuthFeatureItem[] = [];
  for (const f of features) {
    if (f === null || typeof f !== "object") continue;
    const row = f as Record<string, unknown>;
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (!slug) continue;
    const label = typeof row.label === "string" ? row.label.trim() : slug;
    const order = typeof row.order === "number" ? row.order : typeof row.display_order === "number" ? row.display_order : 0;
    result.push({
      id: typeof row.id === "string" ? row.id : undefined,
      slug,
      label: label || slug,
      scope: typeof row.scope === "string" ? row.scope : undefined,
      order,
      is_enabled: typeof row.is_enabled === "boolean" ? row.is_enabled : true,
    });
  }
  return result.length ? result : null;
}

/**
 * Fetch feature registry for this app from PHP-Auth (scope website-cms).
 * Sorted by order ascending. Returns empty array on failure or if not configured.
 */
export async function getFeatureRegistryFromPhpAuth(): Promise<PhpAuthFeatureItem[]> {
  const config = getPhpAuthConfig();
  if (!config) return [];

  const url = `${config.baseUrl}/api/external/feature-registry?scope=${encodeURIComponent(WEBSITE_CMS_SCOPE)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    if (!json) return [];
    const data = (json as Record<string, unknown>).data ?? json;
    const features = parseFeaturesResponse(data);
    if (!features || features.length === 0) return [];
    features.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return features;
  } catch {
    return [];
  }
}
