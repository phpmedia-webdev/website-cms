/**
 * Feature list for the superadmin Site Settings Gating table.
 * Pulls live from PHP-Auth feature registry when available; falls back to local feature_registry.
 * Superadmin is included in the list but marked locked (always On, toggle disabled).
 * Used when the Gating page is loaded — full feature set for this application type.
 */

import { listFeatures, SUPERADMIN_FEATURE_SLUG } from "@/lib/supabase/feature-registry";
import { getFeatureRegistryFromPhpAuth } from "@/lib/php-auth/fetch-features";

/** Slugs that are always On and toggle disabled so admins cannot lock themselves out. */
const LOCKED_FEATURE_SLUGS = [SUPERADMIN_FEATURE_SLUG, "dashboard"] as const;

export type GatingFeatureItem = {
  slug: string;
  label: string;
  order: number;
  /** When true, feature is always On and toggle is disabled (e.g. superadmin, dashboard). */
  locked?: boolean;
  /** Indent level for parent/child: 0 = root, 1 = child, etc. */
  depth?: number;
  /** Parent feature slug; when set, this is a child. Used for parent-on/off and child-on auto-parent. */
  parentSlug?: string;
};

function withLockedFlag(
  items: { slug: string; label: string; order: number; depth?: number; parentSlug?: string }[]
): GatingFeatureItem[] {
  return items.map((f) => ({
    ...f,
    locked: (LOCKED_FEATURE_SLUGS as readonly string[]).includes(f.slug),
  }));
}

function ensureSuperadminInList(items: GatingFeatureItem[]): GatingFeatureItem[] {
  if (items.some((f) => f.slug === SUPERADMIN_FEATURE_SLUG)) return items;
  return [
    ...items,
    {
      slug: SUPERADMIN_FEATURE_SLUG,
      label: "Superadmin",
      order: 9999,
      locked: true,
      depth: 0,
    },
  ];
}

/** Build flat list in tree order (roots first, then children) with depth. Uses parentId → id. */
function buildTreeOrder<T extends { id?: string; parentId?: string | null; order?: number }>(
  items: T[],
  getOrder: (t: T) => number
): (T & { depth: number })[] {
  const result: (T & { depth: number })[] = [];
  const visited = new Set<string>();

  const roots = items.filter(
    (i) => !i.parentId || String(i.parentId).trim() === ""
  );
  const sortedRoots = [...roots].sort((a, b) => getOrder(a) - getOrder(b));

  function add(item: T, depth: number) {
    if (item.id && visited.has(item.id)) return;
    if (item.id) visited.add(item.id);
    result.push({ ...item, depth });
    const children = items.filter(
      (i) => i.parentId && i.parentId === item.id
    );
    children.sort((a, b) => getOrder(a) - getOrder(b));
    for (const c of children) add(c, depth + 1);
  }

  for (const r of sortedRoots) add(r, 0);
  for (const item of items) {
    if (item.id && !visited.has(item.id)) result.push({ ...item, depth: 0 });
  }
  return result;
}

/**
 * Returns the full feature list for the gating table (PHP-Auth when configured, else local).
 * Superadmin is visible but locked (always On, toggle disabled). Call when loading the
 * Site Settings Gating tab or the tenant features API so the list is live per request.
 */
export async function getFeaturesForGatingTable(): Promise<GatingFeatureItem[]> {
  const phpAuthFeatures = await getFeatureRegistryFromPhpAuth();
  if (process.env.NODE_ENV === "development") {
    // DEBUG: Remove after confirming gating source.
    // console.log("[gating] source:", phpAuthFeatures.length > 0 ? "php-auth" : "local", "count:", phpAuthFeatures.length || "n/a");
  }
  if (phpAuthFeatures.length > 0) {
    const withDepth = buildTreeOrder(
      phpAuthFeatures,
      (f) => f.order ?? 0
    );
    const idToSlug = new Map<string, string>();
    for (const f of phpAuthFeatures) {
      if (f.id) idToSlug.set(f.id, f.slug);
    }
    const mapped = withLockedFlag(
      withDepth.map((f) => ({
        slug: f.slug,
        label: f.label,
        order: f.order ?? 0,
        depth: f.depth,
        parentSlug: f.parentId ? idToSlug.get(f.parentId) : undefined,
      }))
    );
    return ensureSuperadminInList(mapped);
  }
  const localFeatures = await listFeatures(true);
  const localWithParentId = localFeatures.map((f) => ({
    id: f.id,
    parentId: f.parent_id ?? undefined,
    slug: f.slug,
    label: f.label,
    order: f.display_order,
  }));
  const withDepth = buildTreeOrder(localWithParentId, (f) => f.order);
  const idToSlug = new Map<string, string>();
  for (const f of localFeatures) {
    idToSlug.set(f.id, f.slug);
  }
  const mapped = withLockedFlag(
    withDepth.map((f) => ({
      slug: f.slug,
      label: f.label,
      order: f.order,
      depth: f.depth,
      parentSlug: f.parentId ? idToSlug.get(f.parentId) : undefined,
    }))
  );
  return ensureSuperadminInList(mapped);
}
