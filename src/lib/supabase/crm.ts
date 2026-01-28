/**
 * CRM utilities: contacts, notes, custom fields, forms, MAGs.
 * Per prd-technical: read operations use RPC (not .from()); writes use .schema().from().
 */

import { createServerSupabaseClient } from "./client";

const CRM_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Serialize Supabase/PostgREST error so message/code/details show in logs (avoids empty {}). */
function formatSupabaseError(err: unknown): string {
  if (err == null) return String(err);
  const o = err as Record<string, unknown>;
  const msg = o.message ?? (err instanceof Error ? err.message : "");
  const code = o.code ?? "";
  const details = o.details ?? "";
  const parts = [msg, code, details].filter(Boolean).map(String);
  return parts.length > 0 ? parts.join(" | ") : JSON.stringify(err);
}

export interface CrmContact {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  status: string;
  dnd_status: string | null;
  source: string | null;
  form_id: string | null;
  external_crm_id: string | null;
  external_crm_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmNote {
  id: string;
  contact_id: string;
  body: string;
  author_id: string | null;
  note_type: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Form {
  id: string;
  name: string;
  slug: string;
  auto_assign_tags: string[] | null;
  auto_assign_mag_ids: string[] | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Mag {
  id: string;
  name: string;
  uid: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmCustomField {
  id: string;
  name: string;
  label: string;
  type: string;
  validation_rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContactCustomFieldValue {
  id: string;
  contact_id: string;
  custom_field_id: string;
  custom_field_name: string;
  custom_field_label: string;
  custom_field_type: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMag {
  id: string;
  contact_id: string;
  mag_id: string;
  mag_name: string;
  mag_uid: string;
  assigned_via: string | null;
  assigned_at: string;
}

export interface MarketingList {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMarketingList {
  id: string;
  contact_id: string;
  list_id: string;
  list_name: string;
  list_slug: string;
  added_at: string;
}

export interface MagSearchResult {
  id: string;
  name: string;
  uid: string;
}

export interface MarketingListSearchResult {
  id: string;
  name: string;
  slug: string;
}

/** Get all contacts (RPC). */
export async function getContacts(): Promise<CrmContact[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contacts_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching contacts:", { message: error.message, code: error.code });
    return [];
  }
  return (data as CrmContact[]) || [];
}

/** Get one contact by id (RPC). */
export async function getContactById(id: string): Promise<CrmContact | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_by_id_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: id,
  });
  if (error) {
    console.error("Error fetching contact:", { message: error.message, code: error.code });
    return null;
  }
  const rows = (data as CrmContact[] | null) ?? [];
  return rows[0] ?? null;
}

/** Get form registry (RPC). */
export async function getForms(): Promise<Form[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_forms_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching forms:", formatSupabaseError(error));
    return [];
  }
  return (data as Form[]) || [];
}

/** Get MAGs (RPC). */
export async function getMags(): Promise<Mag[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_mags_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching mags:", { message: error.message, code: error.code });
    return [];
  }
  return (data as Mag[]) || [];
}

/** Get notes for a contact (RPC). */
export async function getContactNotes(contactId: string): Promise<CrmNote[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_notes_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: contactId,
  });
  if (error) {
    console.error("Error fetching contact notes:", { message: error.message, code: error.code });
    return [];
  }
  return (data as CrmNote[]) || [];
}

/** Get CRM custom field definitions (RPC). */
export async function getCrmCustomFields(): Promise<CrmCustomField[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_crm_custom_fields_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching CRM custom fields:", { message: error.message, code: error.code });
    return [];
  }
  return (data as CrmCustomField[]) || [];
}

/** Get custom field values for a contact (RPC). */
export async function getContactCustomFields(contactId: string): Promise<ContactCustomFieldValue[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_custom_fields_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: contactId,
  });
  if (error) {
    console.error("Error fetching contact custom fields:", { message: error.message, code: error.code });
    return [];
  }
  return (data as ContactCustomFieldValue[]) || [];
}

/** Get MAGs assigned to a contact (RPC). */
export async function getContactMags(contactId: string): Promise<ContactMag[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_mags_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: contactId,
  });
  if (error) {
    console.error("Error fetching contact MAGs:", { message: error.message, code: error.code });
    return [];
  }
  return (data as ContactMag[]) || [];
}

/** Get MAG-contact assignments for all contacts (for list view). */
export async function getAllContactMags(): Promise<{ contact_id: string; mag_id: string; mag_name: string }[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_mags")
    .select("contact_id, mag_id, mags(name)");
  if (error) {
    console.error("Error fetching all contact MAGs:", { message: error.message, code: error.code });
    return [];
  }
  return ((data as any[]) || []).map((r) => ({
    contact_id: r.contact_id,
    mag_id: r.mag_id,
    mag_name: r.mags?.name ?? "",
  }));
}

/** Get marketing list memberships for all contacts (for list view). */
export async function getAllContactMarketingLists(): Promise<{ contact_id: string; list_id: string; list_name: string }[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_marketing_lists")
    .select("contact_id, list_id, marketing_lists(name)");
  if (error) {
    console.error("Error fetching all contact marketing lists:", { message: error.message, code: error.code });
    return [];
  }
  return ((data as any[]) || []).map((r) => ({
    contact_id: r.contact_id,
    list_id: r.list_id,
    list_name: r.marketing_lists?.name ?? "",
  }));
}

/** Create a contact (write via .schema().from()). */
export async function createContact(
  payload: Partial<Omit<CrmContact, "id" | "created_at" | "updated_at">>
): Promise<{ contact: CrmContact | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contacts")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("Error creating contact:", { message: error.message, code: error.code });
    return { contact: null, error: new Error(error.message) };
  }
  return { contact: data as CrmContact, error: null };
}

/** Update a contact (write via .schema().from()). */
export async function updateContact(
  id: string,
  payload: Partial<Omit<CrmContact, "id" | "created_at" | "updated_at">>
): Promise<{ contact: CrmContact | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contacts")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating contact:", { message: error.message, code: error.code });
    return { contact: null, error: new Error(error.message) };
  }
  return { contact: data as CrmContact, error: null };
}

// ==================== Notes ====================

/** Create a note for a contact (write). */
export async function createNote(
  contactId: string,
  body: string,
  authorId?: string | null,
  noteType?: string | null
): Promise<{ note: CrmNote | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_notes")
    .insert({ contact_id: contactId, body, author_id: authorId ?? null, note_type: noteType ?? null })
    .select()
    .single();
  if (error) {
    console.error("Error creating note:", { message: error.message, code: error.code });
    return { note: null, error: new Error(error.message) };
  }
  return { note: data as CrmNote, error: null };
}

/** Update a note (write). */
export async function updateNote(
  noteId: string,
  body: string,
  noteType?: string | null
): Promise<{ note: CrmNote | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_notes")
    .update({ body, note_type: noteType ?? null, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select()
    .single();
  if (error) {
    console.error("Error updating note:", { message: error.message, code: error.code });
    return { note: null, error: new Error(error.message) };
  }
  return { note: data as CrmNote, error: null };
}

/** Delete a note (write). */
export async function deleteNote(noteId: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_notes")
    .delete()
    .eq("id", noteId);
  if (error) {
    console.error("Error deleting note:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

// ==================== MAGs ====================

/** Search MAGs by name/uid (RPC). */
export async function searchMags(searchTerm: string): Promise<MagSearchResult[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("search_mags_dynamic", {
    schema_name: CRM_SCHEMA,
    search_term: searchTerm,
  });
  if (error) {
    console.error("Error searching MAGs:", { message: error.message, code: error.code });
    return [];
  }
  return (data as MagSearchResult[]) || [];
}

/** Add contact to MAG (write). */
export async function addContactToMag(
  contactId: string,
  magId: string,
  assignedVia?: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_mags")
    .insert({ contact_id: contactId, mag_id: magId, assigned_via: assignedVia ?? null });
  if (error) {
    console.error("Error adding contact to MAG:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Remove contact from MAG (write). */
export async function removeContactFromMag(
  contactId: string,
  magId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_mags")
    .delete()
    .eq("contact_id", contactId)
    .eq("mag_id", magId);
  if (error) {
    console.error("Error removing contact from MAG:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

// ==================== Marketing Lists ====================

/** Get all marketing lists (RPC). */
export async function getMarketingLists(): Promise<MarketingList[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_marketing_lists_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching marketing lists:", { message: error.message, code: error.code });
    return [];
  }
  return (data as MarketingList[]) || [];
}

/** Get marketing lists a contact belongs to (RPC). */
export async function getContactMarketingLists(contactId: string): Promise<ContactMarketingList[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_marketing_lists_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: contactId,
  });
  if (error) {
    console.error("Error fetching contact marketing lists:", { message: error.message, code: error.code });
    return [];
  }
  return (data as ContactMarketingList[]) || [];
}

/** Search marketing lists by name/slug (RPC). */
export async function searchMarketingLists(searchTerm: string): Promise<MarketingListSearchResult[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("search_marketing_lists_dynamic", {
    schema_name: CRM_SCHEMA,
    search_term: searchTerm,
  });
  if (error) {
    console.error("Error searching marketing lists:", { message: error.message, code: error.code });
    return [];
  }
  return (data as MarketingListSearchResult[]) || [];
}

/** Add contact to marketing list (write). */
export async function addContactToMarketingList(
  contactId: string,
  listId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_marketing_lists")
    .insert({ contact_id: contactId, list_id: listId });
  if (error) {
    console.error("Error adding contact to marketing list:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Remove contact from marketing list (write). */
export async function removeContactFromMarketingList(
  contactId: string,
  listId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_marketing_lists")
    .delete()
    .eq("contact_id", contactId)
    .eq("list_id", listId);
  if (error) {
    console.error("Error removing contact from marketing list:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Create a marketing list (write). */
export async function createMarketingList(
  payload: { name: string; slug: string; description?: string | null }
): Promise<{ list: MarketingList | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("marketing_lists")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("Error creating marketing list:", { message: error.message, code: error.code });
    return { list: null, error: new Error(error.message) };
  }
  return { list: data as MarketingList, error: null };
}

// ==================== Custom field definitions ====================

/** Create a CRM custom field definition (write). */
export async function createCrmCustomField(
  payload: { name: string; label: string; type: string; validation_rules?: Record<string, unknown> }
): Promise<{ field: CrmCustomField | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_custom_fields")
    .insert({
      name: payload.name,
      label: payload.label,
      type: payload.type,
      validation_rules: payload.validation_rules ?? {},
    })
    .select()
    .single();
  if (error) {
    console.error("Error creating CRM custom field:", { message: error.message, code: error.code });
    return { field: null, error: new Error(error.message) };
  }
  return { field: data as CrmCustomField, error: null };
}

/** Update a CRM custom field definition (write). */
export async function updateCrmCustomField(
  id: string,
  payload: Partial<{ name: string; label: string; type: string; validation_rules: Record<string, unknown> }>
): Promise<{ field: CrmCustomField | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_custom_fields")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating CRM custom field:", { message: error.message, code: error.code });
    return { field: null, error: new Error(error.message) };
  }
  return { field: data as CrmCustomField, error: null };
}

/** Delete a CRM custom field definition (write). Cascades to contact values. */
export async function deleteCrmCustomField(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_custom_fields")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting CRM custom field:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

// ==================== Form registry ====================

/** Create a form definition (write). */
export async function createForm(
  payload: {
    name: string;
    slug: string;
    auto_assign_tags?: string[] | null;
    auto_assign_mag_ids?: string[] | null;
    settings?: Record<string, unknown>;
  }
): Promise<{ form: Form | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("forms")
    .insert({
      name: payload.name,
      slug: payload.slug,
      auto_assign_tags: payload.auto_assign_tags ?? null,
      auto_assign_mag_ids: payload.auto_assign_mag_ids ?? null,
      settings: payload.settings ?? {},
    })
    .select()
    .single();
  if (error) {
    console.error("Error creating form:", { message: error.message, code: error.code });
    return { form: null, error: new Error(error.message) };
  }
  return { form: data as Form, error: null };
}

/** Update a form definition (write). */
export async function updateForm(
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    auto_assign_tags: string[] | null;
    auto_assign_mag_ids: string[] | null;
    settings: Record<string, unknown>;
  }>
): Promise<{ form: Form | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("forms")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating form:", { message: error.message, code: error.code });
    return { form: null, error: new Error(error.message) };
  }
  return { form: data as Form, error: null };
}

/** Delete a form definition (write). Contacts referencing it get form_id set to null. */
export async function deleteForm(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("forms")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting form:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}
