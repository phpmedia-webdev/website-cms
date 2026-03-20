/**
 * Overlay Customizer (slug → label + color) onto taxonomy-driven terms where both exist
 * (e.g. project status). Tasks use `statusTermsFromCustomizerRows` + `task_*_slug` columns only.
 */

import { normalizeHex } from "@/lib/event-type-colors";
import type { CustomizerOptionRowServer } from "@/lib/supabase/settings";

const FALLBACK_DOT = "#94a3b8";

/** Hex for a small color dot; prefers customizer map, then existing term color. */
export function hexForTaskTermDot(
  slug: string,
  customizerBySlug: Map<string, string>,
  taxonomyColor: string | null | undefined
): string {
  const fromCustomizer = customizerBySlug.get(slug.trim().toLowerCase());
  if (fromCustomizer) return fromCustomizer;
  if (taxonomyColor && String(taxonomyColor).trim()) return normalizeHex(String(taxonomyColor));
  return FALLBACK_DOT;
}

/** Build slug → normalized hex from customizer rows (skips empty colors). */
export function customizerColorMap(rows: CustomizerOptionRowServer[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    const raw = r.color != null && String(r.color).trim() ? String(r.color).trim() : "";
    if (!raw) continue;
    map.set(r.slug.trim().toLowerCase(), normalizeHex(raw));
  }
  return map;
}

export function mergeCustomizerColorsOntoTerms<
  T extends { slug: string; name: string; color: string | null },
>(terms: T[], rows: CustomizerOptionRowServer[]): T[] {
  const rowBySlug = new Map<string, CustomizerOptionRowServer>();
  for (const r of rows) {
    rowBySlug.set(r.slug.trim().toLowerCase(), r);
  }
  const colorBySlug = customizerColorMap(rows);
  return terms.map((t) => {
    const key = t.slug.trim().toLowerCase();
    const row = rowBySlug.get(key);
    let name = t.name;
    let color = t.color;
    if (row) {
      if (row.label != null && String(row.label).trim()) {
        name = String(row.label).trim();
      }
      const hex = colorBySlug.get(key);
      if (hex) color = hex;
    }
    return { ...t, name, color };
  });
}

/** Resolve a merged task phase (or any slug-keyed term list) by taxonomy slug. */
export function taskTermForSlug<
  T extends { slug: string },
>(terms: T[], slug: string | null | undefined): T | null {
  if (!slug || !String(slug).trim()) return null;
  const key = String(slug).trim().toLowerCase();
  return terms.find((p) => p.slug.trim().toLowerCase() === key) ?? null;
}

/** Map term id → Customizer-merged label/color for task taxonomy category checkboxes (phase). */
export function categoryDisplayByTermIdFromMergedTerms<
  T extends { id: string; name: string; color: string | null },
>(terms: T[]): Record<string, { name: string; color: string | null }> {
  return Object.fromEntries(terms.map((t) => [t.id, { name: t.name, color: t.color }]));
}

/**
 * Order taxonomy terms by Customizer `display_order` (scope rows). Slugs not in Customizer append at end.
 */
export function orderTermsByCustomizerRows<
  T extends { slug: string },
>(terms: T[], rows: CustomizerOptionRowServer[]): T[] {
  if (!rows.length) return [...terms];
  const bySlug = new Map(terms.map((t) => [t.slug.trim().toLowerCase(), t]));
  const used = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const key = r.slug.trim().toLowerCase();
    const t = bySlug.get(key);
    if (t) {
      out.push(t);
      used.add(key);
    }
  }
  for (const t of terms) {
    const key = t.slug.trim().toLowerCase();
    if (!used.has(key)) out.push(t);
  }
  return out;
}
