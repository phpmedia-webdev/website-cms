import type { AutoSuggestGroup } from "@/components/ui/auto-suggest-multi";

/** Row shape from `GET /api/events/resources` (picker or full). */
export interface ResourcePickerRegistryRow {
  id: string;
  name: string;
  resource_type: string;
}

export interface ResourcePickerBundleRow {
  id: string;
  name: string;
  items: { resource_id: string }[];
}

/** Parse `GET /api/settings/calendar/resource-types` (JSON array of `{ slug, label }`). */
export function parseCalendarResourceTypesPayload(res: unknown): { slug: string; label: string }[] {
  if (!Array.isArray(res)) return [];
  return res
    .filter(
      (x): x is { slug: string; label: string } =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as { slug?: unknown }).slug === "string"
    )
    .map((x) => ({
      slug: (x as { slug: string }).slug,
      label:
        typeof (x as { label?: unknown }).label === "string"
          ? (x as { label: string }).label
          : (x as { slug: string }).slug,
    }));
}

export function resourceTypeLabelMap(types: { slug: string; label: string }[]): Map<string, string> {
  return new Map(types.map((t) => [t.slug, t.label]));
}

function resourceRowLabel(
  name: string,
  resourceTypeSlug: string,
  typeLabels: Map<string, string>
): string {
  const t = typeLabels.get(resourceTypeSlug)?.trim();
  return `${name} (${t || resourceTypeSlug})`;
}

function resourceRowSearchText(
  name: string,
  resourceTypeSlug: string,
  typeLabels: Map<string, string>
): string {
  const t = typeLabels.get(resourceTypeSlug)?.trim() || "";
  return `${name} ${resourceTypeSlug} ${t}`.trim();
}

/**
 * Bundles first, then individual resources — §2.1 grouped picker.
 * Option ids: `bundle:<id>`, `resource:<id>` for composite handlers.
 */
export function buildResourceAutoSuggestGroups(
  bundles: ResourcePickerBundleRow[],
  resources: ResourcePickerRegistryRow[],
  typeLabels: Map<string, string>,
  emptyCopy?: { bundles?: string; resources?: string }
): AutoSuggestGroup[] {
  const bundleOpts = bundles.map((b) => ({
    id: `bundle:${b.id}`,
    label: b.name,
    searchText: b.name,
  }));
  const resOpts = resources.map((r) => ({
    id: `resource:${r.id}`,
    label: resourceRowLabel(r.name, r.resource_type, typeLabels),
    searchText: resourceRowSearchText(r.name, r.resource_type, typeLabels),
  }));
  return [
    {
      heading: "Bundles",
      options: bundleOpts,
      emptyLabel: emptyCopy?.bundles ?? "No bundles defined.",
    },
    {
      heading: "Resources",
      options: resOpts,
      emptyLabel: emptyCopy?.resources ?? "No schedulable resources.",
    },
  ];
}
