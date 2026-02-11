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

/** Add a single term (category or tag) to multiple contacts. Skips contacts that already have the term. */
export async function addContactsToTermBulk(
  contactIds: string[],
  termId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (contactIds.length === 0) return { success: true, error: null };
  const existing = await getContactTaxonomyTermIds(contactIds);
  const alreadyHave = new Set(
    existing.filter((r) => r.term_id === termId).map((r) => r.contact_id)
  );
  const toAdd = contactIds.filter((id) => !alreadyHave.has(id));
  if (toAdd.length === 0) return { success: true, error: null };
  const supabase = createServerSupabaseClient();
  const rows = toAdd.map((content_id) => ({
    content_id,
    content_type: "crm_contact" as const,
    term_id: termId,
  }));
  const { error } = await supabase
    .schema(SCHEMA)
    .from("taxonomy_relationships")
    .insert(rows);
  if (error) {
    console.error("addContactsToTermBulk:", error.message);
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Remove a single term from multiple contacts. */
export async function removeContactsFromTermBulk(
  contactIds: string[],
  termId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (contactIds.length === 0) return { success: true, error: null };
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(SCHEMA)
    .from("taxonomy_relationships")
    .delete()
    .eq("content_type", "crm_contact")
    .eq("term_id", termId)
    .in("content_id", contactIds);
  if (error) {
    console.error("removeContactsFromTermBulk:", error.message);
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}
