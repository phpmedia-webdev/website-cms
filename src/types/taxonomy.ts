/**
 * Taxonomy type definitions
 */

export type TaxonomyType = "category" | "tag";
export type ContentType = "post" | "article" | "media" | "gallery";

export interface TaxonomyTerm {
  id: string;
  name: string;
  slug: string;
  type: TaxonomyType;
  parent_id: string | null;
  description: string | null;
  suggested_sections: string[] | null; // Sections this term is suggested for
  /** Optional color for chips/badges (e.g. hex #rrggbb). */
  color: string | null;
  /** When true, term is system-required: slug fixed, only name editable, non-deletable. */
  is_core?: boolean;
  /** Categories only: single taxonomy section this category belongs to. */
  home_section_name?: string | null;
  /** Categories only: sort order among siblings (same parent). */
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export interface TaxonomyRelationship {
  id: string;
  term_id: string;
  content_type: ContentType;
  content_id: string;
  created_at: string;
}

export interface TaxonomyTermWithChildren extends TaxonomyTerm {
  children?: TaxonomyTermWithChildren[];
  usage_count?: number; // Number of content items using this term
}

export interface TaxonomyTermFormData {
  name: string;
  slug: string;
  type: TaxonomyType;
  parent_id: string | null;
  description: string | null;
  suggested_sections: string[]; // Sections to suggest this term for
  /** Optional color (e.g. hex #rrggbb). */
  color: string;
}

export interface SectionTaxonomyConfig {
  id: string;
  section_name: string;
  display_name: string;
  content_type: ContentType;
  category_slugs: string[] | null; // null = use suggested, [] = none, ['slug1'] = specific
  tag_slugs: string[] | null;
  is_staple?: boolean; // template section; cannot be deleted
  is_core?: boolean; // system-required: slug locked, only label editable, cannot delete
  created_at: string;
  updated_at: string;
}

export interface Section {
  name: string;
  displayName: string;
  contentType: ContentType;
}

/**
 * Generate a slug from a name (lowercase, replace spaces with hyphens)
 */
export function generateTaxonomySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
