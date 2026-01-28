/**
 * CRM taxonomy helpers: bridge between crm_contacts and taxonomy_relationships.
 * content_type = 'crm_contact' for contacts; section = 'crm' for term filtering.
 */

import { createServerSupabaseClient } from "./client";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/**
 * Get taxonomy term IDs for multiple contacts.
 * Used for filtering contacts by category or tag on the list view.
 */
export async function getContactTaxonomyTermIds(
  contactIds: string[]
): Promise<{ contact_id: string; term_id: string }[]> {
  if (contactIds.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("taxonomy_relationships")
    .select("content_id, term_id")
    .eq("content_type", "crm_contact")
    .in("content_id", contactIds);

  if (error) {
    console.error("getContactTaxonomyTermIds:", error.message);
    return [];
  }
  return ((data as { content_id: string; term_id: string }[]) || []).map((r) => ({
    contact_id: r.content_id,
    term_id: r.term_id,
  }));
}
