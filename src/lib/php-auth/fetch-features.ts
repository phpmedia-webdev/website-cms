/**
 * M5 C5: Fetch feature registry from PHP-Auth for tenant gating table.
 * Calls GET /api/external/feature-registry with X-API-Key. The API derives scope
 * from the API key and returns only features for that application. No scope query param.
 * See docs/reference/php-auth-external-feature-registry-api.md for API contract.
 */

import { getPhpAuthConfig } from "./config";

export interface PhpAuthFeatureItem {
  id?: string;
  slug: string;
  label: string;
  scope?: string;
  order?: number;
  is_enabled?: boolean;
  /** Parent feature UUID, or null for top-level. Child when parentId === parent.id. */
  parentId?: string | null;
}

function parseFeaturesResponse(data: unknown): PhpAuthFeatureItem[] | null {
  if (data === null || typeof data !== "object") return null;
  // API may return { data: { features: [...] } } or { data: [ ... ] }
  const d = data as Record<string, unknown>;
  const features = Array.isArray(d) ? d : (d.features ?? d.data);
  if (!Array.isArray(features)) return null;
  const result: PhpAuthFeatureItem[] = [];
  for (const f of features) {
    if (f === null || typeof f !== "object") continue;
    const row = f as Record<string, unknown>;
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (!slug) continue;
    const label = typeof row.label === "string" ? row.label.trim() : slug;
    const order = typeof row.order === "number" ? row.order : typeof row.display_order === "number" ? row.display_order : 0;
    const scope = typeof row.scope === "string" ? row.scope.trim() : undefined;
    const id = typeof row.id === "string" ? row.id : undefined;
    const parentId =
      row.parentId != null && row.parentId !== ""
        ? String(row.parentId)
        : row.parent_id != null && row.parent_id !== ""
          ? String(row.parent_id)
          : null;
    result.push({
      id,
      slug,
      label: label || slug,
      scope: scope || undefined,
      order,
      is_enabled: typeof row.is_enabled === "boolean" ? row.is_enabled : true,
      parentId: parentId ?? undefined,
    });
  }
  return result.length ? result : null;
}

/**
 * Fetch feature registry for this app from PHP-Auth (scope website-cms).
 * API must filter by scope server-side; we do not filter client-side.
 * Sorted by order ascending. Returns empty array on failure or if not configured.
 */
export async function getFeatureRegistryFromPhpAuth(): Promise<PhpAuthFeatureItem[]> {
  const config = getPhpAuthConfig();
  if (!config) return [];

  const url = `${config.baseUrl}/api/external/feature-registry`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      if (process.env.NODE_ENV === "development") {
        const errBody = await res.text().catch(() => "");
        console.warn("[feature-registry] PHP-Auth returned", res.status, errBody.slice(0, 200));
      }
      return [];
    }
    const json = await res.json().catch(() => null);
    if (!json) return [];
    const payload = json as Record<string, unknown>;
    const data = payload.data ?? json;
    const features = parseFeaturesResponse(data);
    if (!features || features.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[feature-registry] PHP-Auth response had no features; shape:", typeof data, Array.isArray(data) ? data.length : Object.keys(data ?? {}));
      }
      return [];
    }
    features.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return features;
  } catch {
    return [];
  }
}
