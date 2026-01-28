/**
 * Taxonomy type definitions
 */

export type TaxonomyType = "category" | "tag";
export type ContentType = "post" | "page" | "media" | "gallery";

export interface TaxonomyTerm {
  id: string;
  name: string;
  slug: string;
  type: TaxonomyType;
  parent_id: string | null;
  description: string | null;
  suggested_sections: string[] | null; // Sections this term is suggested for
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
}

export interface SectionTaxonomyConfig {
  id: string;
  section_name: string;
  display_name: string;
  content_type: ContentType;
  category_slugs: string[] | null; // null = use suggested, [] = none, ['slug1'] = specific
  tag_slugs: string[] | null;
  is_staple?: boolean; // template section; cannot be deleted
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
